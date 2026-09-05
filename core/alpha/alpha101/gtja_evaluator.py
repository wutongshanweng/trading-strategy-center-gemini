"""GTJA Alpha Expression Evaluator — parses and evaluates GTJA formula strings."""
from __future__ import annotations

import re
from typing import Any, Optional

import numpy as np
import pandas as pd


class GTJAEvaluator:
    """Evaluate GTJA alpha formula strings against OHLCV DataFrames.

    Supports GTJA operators: RANK, DELTA, CORR, TSRANK, TSMIN, TSMAX, SMA,
    WMA, SMEAN, MEAN, STD, SUM, LOG, ABS, SIGN, REGBETA, SEQUENCE, VWAP,
    RET, MAX, MIN, DECAYLINEAR, COUNT, HIGH, LOW, OPEN, CLOSE, VOLUME, and
    arithmetic operators including ternary ?:
    """

    def __init__(self):
        self._reset()

    def _reset(self):
        self._data: Optional[pd.DataFrame] = None
        self._env: dict[str, Any] = {}

    def evaluate(self, formula: str, data: pd.DataFrame) -> pd.Series:
        """Evaluate a GTJA formula string against OHLCV data.

        Args:
            formula: GTJA formula string
            data: DataFrame with at least open, high, low, close, volume columns

        Returns:
            pd.Series of factor values aligned to data index
        """
        self._reset()
        self._data = data
        self._build_env()
        expr = re.sub(r'\s+', ' ', formula.strip())
        result = self._parse(expr)
        return self._ensure_series(result)

    def _build_env(self):
        df = self._data
        if df is None:
            return

        col_map = {
            'OPEN': df['open'],
            'HIGH': df['high'],
            'LOW': df['low'],
            'CLOSE': df['close'],
            'VOLUME': df['volume'],
            'VOL': df['volume'],
            'VWAP': df['close'],
            'RET': df['close'].pct_change(),
        }

        if 'vwap' in df.columns:
            col_map['VWAP'] = df['vwap']
        elif 'amount' in df.columns and 'volume' in df.columns:
            col_map['VWAP'] = (df['amount'] / df['volume']).fillna(df['close'])

        for k, v in col_map.items():
            self._env[k] = v.astype(float)

        for k in ('FUND', 'MKT', 'SMB', 'HML', 'AMOUNT'):
            if k not in self._env:
                self._env[k] = pd.Series(0.0, index=df.index)

    def _parse(self, s: str) -> pd.Series:
        """Parse and evaluate an expression string."""
        s = s.strip()
        # Normalize MATLAB-style element-wise operators to standard operators
        s = s.replace('.*', '*')
        s = s.replace('./', '/')
        s = s.replace('.^', '^')
        s = s.replace('.-', '-')
        s = s.replace('.+', '+')
        # Remove standalone . that's not part of an operator (likely syntax error)
        s = re.sub(r'(?<![.*+/-])\.(?![.*+/-])', '', s)
        return self._parse_expr(s)

    def _parse_expr(self, s: str) -> pd.Series:
        """Parse expression: handle ternary ?: and logical OR ||"""
        s = s.strip()

        # Handle logical AND (&) - after ternary, before OR
        and_idx = -1
        paren_depth = 0
        i = len(s) - 1
        while i >= 1:
            if s[i] == '&' and s[i-1] == '&':
                if paren_depth == 0:
                    and_idx = i - 1
                    break
                i -= 2
                continue
            if s[i] == ')':
                paren_depth += 1
            elif s[i] == '(':
                paren_depth -= 1
            i -= 1

        if and_idx >= 1:
            left = self._parse_expr(s[:and_idx].strip())
            right = self._parse_expr(s[and_idx + 2:].strip())
            return (left.astype(bool) & right.astype(bool)).astype(float)

        # Handle logical OR (||) - lowest precedence after ternary
        # Find rightmost || at depth 0 (outside ternary)
        or_idx = -1
        paren_depth = 0
        i = len(s) - 1
        while i >= 1:
            if i >= 1 and s[i] == '|' and s[i-1] == '|':
                if paren_depth == 0:
                    or_idx = i - 1
                    break
                i -= 2
                continue
            if s[i] == ')':
                paren_depth += 1
            elif s[i] == '(':
                paren_depth -= 1
            i -= 1

        if or_idx >= 1:
            left = self._parse_expr(s[:or_idx].strip())
            right = self._parse_expr(s[or_idx + 2:].strip())
            return (left.astype(bool) | right.astype(bool)).astype(float)

        # Handle ternary ?: - find rightmost : at depth 0, then matching ?
        colon_idx = -1
        depth = 0
        paren_depth = 0
        for i in range(len(s) - 1, -1, -1):
            c = s[i]
            if c == ')':
                paren_depth += 1
            elif c == '(':
                paren_depth -= 1
            elif c == ':' and paren_depth == 0 and depth == 0:
                colon_idx = i
                break
            elif c == '?':
                depth -= 1

        if colon_idx >= 0:
            # Found rightmost : at top level - now find matching ? at same depth
            q_idx = -1
            depth = 0
            paren_depth = 0
            for i in range(colon_idx - 1, -1, -1):
                c = s[i]
                if c == ')':
                    paren_depth += 1
                elif c == '(':
                    paren_depth -= 1
                elif c == '?' and paren_depth == 0 and depth == 0:
                    q_idx = i
                    break
                elif c == ':':
                    depth += 1

            if q_idx >= 0:
                cond = s[:q_idx].strip()
                then_val = s[q_idx + 1:colon_idx].strip()
                else_val = s[colon_idx + 1:].strip()
                cond_series = self._parse_expr(cond).astype(bool)
                then_series = self._parse_expr(then_val)
                else_series = self._parse_expr(else_val)
                return then_series.where(cond_series, other=else_series)

        return self._parse_compare(s)

    def _parse_compare(self, s: str) -> pd.Series:
        """Parse comparison operators: <, >, <=, >=, ==, !="""
        s = s.strip()
        # Find comparison op at top level (rightmost for left-to-right associativity)
        op_idx = -1
        op_len = 0
        paren_depth = 0
        for i in range(len(s) - 1, -1, -1):
            c = s[i]
            if c == '(' or c == '[':
                paren_depth -= 1
            elif c == ')' or c == ']':
                paren_depth += 1
            elif paren_depth == 0 and i > 0:
                # Check for two-char ops first
                if s[i-1:i+1] in ('<=','>=','==','!='):
                    op_idx = i - 1
                    op_len = 2
                    break
                elif s[i] in '<>' and i > 0:
                    # Single char op, but not part of <=/>=
                    if s[i-1:i+1] not in ('<=','>=','!=','==','<<','>>'):
                        op_idx = i
                        op_len = 1
                        break
        if op_idx >= 1:
            left = self._parse_add_sub(s[:op_idx].strip())
            right = self._parse_add_sub(s[op_idx + op_len:].strip())
            op = s[op_idx:op_idx + op_len]
            if op == '<': return (left < right).astype(float)
            elif op == '>': return (left > right).astype(float)
            elif op == '<=': return (left <= right).astype(float)
            elif op == '>=': return (left >= right).astype(float)
            elif op == '==': return (left == right).astype(float)
            elif op == '!=': return (left != right).astype(float)
        return self._parse_add_sub(s)

    def _find_top_level_char(self, s: str, ch: str) -> int:
        """Find character at top level (outside parentheses)."""
        depth = 0
        for i, c in enumerate(s):
            if c == '(' or c == '[':
                depth += 1
            elif c == ')' or c == ']':
                depth -= 1
            elif c == ch and depth == 0:
                return i
        return -1

    def _find_top_level_ops(self, s: str, ops: str) -> int:
        """Find operator at top level. Returns -1 if not found.

        Searches RIGHT-TO-LEFT, so ( increases depth and ) decreases.
        """
        depth = 0
        for i in range(len(s) - 1, -1, -1):
            c = s[i]
            if c == ')':
                depth += 1
            elif c == '(':
                depth -= 1
                if depth < 0:
                    return -1
            elif depth == 0 and c in ops and i > 0:
                prev = s[i - 1]
                if prev not in '+-*/^,':
                    return i
        return -1

    def _parse_add_sub(self, s: str) -> pd.Series:
        """Parse addition and subtraction."""
        s = s.strip()

        # Only strip outer parens if we find a top-level + or - first
        # This prevents incorrectly stripping parens from function arguments
        i = self._find_top_level_ops(s, '+-')
        while i >= 0:
            # Valid if preceded by alphanumeric, ), or _
            prev = s[i-1] if i > 0 else ''
            if prev.isalnum() or prev == ')' or prev == '_':
                left = self._parse_mul_div(s[:i].strip())
                right = self._parse_mul_div(s[i + 1:].strip())
                return left + right if s[i] == '+' else left - right
            # Invalid split - continue searching for a valid operator
            i = self._find_top_level_ops(s[:i], '+-')

        # No valid +/- at top level - delegate to mul_div
        return self._parse_mul_div(s)

    def _parse_mul_div(self, s: str) -> pd.Series:
        """Parse multiplication and division."""
        s = s.strip()

        # Find top-level * or / - must be at depth 0, search RIGHT-TO-LEFT
        # Note: when going right-to-left, ( increases depth, ) decreases
        depth = 0
        op_idx = -1
        for i in range(len(s) - 1, -1, -1):
            c = s[i]
            if c == ')':
                depth += 1
            elif c == '(':
                depth -= 1
            elif depth == 0 and c in '*/':
                # Valid if preceded by alphanumeric, ), or _
                # NOT valid if preceded by ( or another operator
                prev = s[i-1] if i > 0 else ''
                if prev.isalnum() or prev == ')' or prev == '_':
                    op_idx = i
                    break

        if op_idx >= 0:
            # Found top-level operator
            left = self._parse_power(s[:op_idx].strip())
            right = self._parse_power(s[op_idx + 1:].strip())
            return left * right if s[op_idx] == '*' else left / (right + 1e-8)

        return self._parse_power(s)

    def _parse_power(self, s: str) -> pd.Series:
        """Parse exponentiation."""
        s = s.strip()
        # Find top-level ^ (not inside parentheses)
        depth = 0
        for i in range(len(s) - 1, -1, -1):
            c = s[i]
            if c == '(' or c == '[':
                depth += 1
            elif c == ')' or c == ']':
                depth -= 1
            elif depth == 0 and c == '^' and i > 0:
                left = self._parse_unary(s[:i].strip())
                right = self._parse_unary(s[i + 1:].strip())
                return np.sign(left) * np.abs(left) ** right

        return self._parse_unary(s)

    def _parse_unary(self, s: str) -> pd.Series:
        """Parse unary operators."""
        s = s.strip()

        # Handle outer parentheses (grouping)
        # Only strip if the whole string is wrapped in parens:
        # - starts with '(' and ends with ')'
        # - the matching close for the first '(' is at the last position
        if s.startswith('(') and s.endswith(')'):
            close_pos = self._matching_paren(s)
            if close_pos == len(s) - 1:
                # Whole string is wrapped - strip outer parens
                inner = s[1:-1].strip()
                if inner:
                    return self._parse_add_sub(inner)

        # Unary minus/plus - only apply to atoms (numbers, columns, function calls)
        # If what follows starts a complex expression, delegate to _parse_add_sub as subtraction
        if s.startswith('-') or s.startswith('+'):
            op = s[0]
            rest = s[1:].strip()
            # Check if rest is an atom: number, column name, or function call
            is_atom = False
            if rest:
                # Number
                try:
                    float(rest)
                    is_atom = True
                except ValueError:
                    pass
                # Column name
                if not is_atom and rest.upper() in self._env:
                    is_atom = True
                # Function call starts with uppercase letter followed by (
                if not is_atom and re.match(r'^[A-Z][A-Z0-9_]*\(', rest):
                    is_atom = True
                # Parenthesized expression
                if not is_atom and rest.startswith('('):
                    # Check if it's an outer paren wrapper (simple grouping)
                    if self._is_outer_paren(rest):
                        is_atom = True

            if is_atom:
                result = self._parse_atom(rest)
                return -result if op == '-' else result
            # Complex expression follows - not truly unary, delegate
            return self._parse_add_sub(s)

        return self._parse_atom(s)

    def _matching_paren(self, s: str) -> int:
        """Return index of matching closing paren, or -1."""
        if not s.startswith('('):
            return -1
        depth = 0
        for i, c in enumerate(s):
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    return i
        return -1

    def _is_outer_paren(self, s: str) -> bool:
        """Check if s is wrapped in balanced parentheses."""
        if not s.startswith('(') or not s.endswith(')'):
            return False
        return self._matching_paren(s) == len(s) - 1

    def _parse_atom(self, s: str) -> pd.Series:
        """Parse atom: function call, column, or number."""
        s = s.strip()
        if not s:
            raise ValueError("Empty atom")

        # Check if it's a function call
        if s.startswith('('):
            if self._is_outer_paren(s):
                return self._parse_unary(s[1:-1].strip())
            else:
                # Expression starting with ( but not a simple wrapper
                # Delegate to parse_add_sub to handle operators inside
                return self._parse_add_sub(s)
        else:
            # Find first '(' at depth 0
            depth = 0
            paren_pos = -1
            paren_end = -1
            for i, c in enumerate(s):
                if c == '(':
                    if depth == 0:
                        paren_pos = i
                    depth += 1
                elif c == ')':
                    depth -= 1
                    if depth == 0 and paren_pos >= 0:
                        paren_end = i
                        break

            # Function call: name(...) pattern
            if paren_pos >= 0 and paren_end > paren_pos:
                name = s[:paren_pos].strip().upper()
                if re.match(r'^[A-Z][A-Z0-9_]*$', name):
                    args_str = s[paren_pos + 1:paren_end].strip()
                    args = self._parse_args(args_str)
                    return self._call_func(name, args)

        # Column name
        if s.upper() in self._env:
            return self._env[s.upper()].copy()

        # Number
        try:
            return pd.Series(float(s), index=self._data.index)
        except ValueError:
            pass

        raise ValueError(f"Cannot evaluate atom: '{s}'")

    def _parse_args(self, args_str: str) -> list[str]:
        """Split comma-separated arguments."""
        if not args_str:
            return []
        args = []
        depth = 0
        current = ''
        for c in args_str:
            if c == '(' or c == '[':
                depth += 1
                current += c
            elif c == ')' or c == ']':
                depth -= 1
                current += c
            elif c == ',' and depth == 0:
                args.append(current.strip())
                current = ''
            else:
                current += c
        if current.strip():
            args.append(current.strip())
        return args

    def _call_func(self, name: str, args: list[str]) -> pd.Series:
        """Call a function with parsed arguments."""
        idx = self._data.index if self._data is not None else None

        # Get first argument as series
        def get_arg(n: int, default: Any = None) -> pd.Series:
            if n < len(args):
                s = args[n].strip()
                if s.upper() in self._env:
                    return self._env[s.upper()]
                try:
                    return pd.Series(float(s), index=idx)
                except ValueError:
                    return self._parse(s)
            if default is not None:
                return pd.Series(default, index=idx)
            raise ValueError(f"Missing argument {n} for {name}")

        def get_int(n: int, default: int = 5) -> int:
            if n < len(args):
                s = args[n].strip().replace(' ', '')
                try:
                    return int(float(s))
                except ValueError:
                    pass
            return default

        def get_d(n: int = 1, default: int = 5) -> int:
            return get_int(n, default)

        def rolling(s: pd.Series, d: int) -> pd.Series:
            mp = max(1, d // 2)
            return s.rolling(d, min_periods=mp)

        # Unary time-series functions
        if name in ('DELTA', 'LOG', 'ABS', 'SIGN', 'RANK', 'RET'):
            x = get_arg(0)
            if name == 'DELTA':
                d = get_int(1, 1)
                return x - x.shift(d)
            elif name == 'LOG':
                return np.log(np.abs(x) + 1e-8)
            elif name == 'ABS':
                return np.abs(x)
            elif name == 'SIGN':
                return np.sign(x)
            elif name == 'RANK':
                return x.rank(pct=True)
            elif name == 'RET':
                close = x if name == 'RET' else self._env.get('CLOSE')
                return close.pct_change()

        if name in ('TS_SUM', 'SUM'):
            x = get_arg(0)
            d = get_d()
            return rolling(x, d).sum()

        if name == 'TSMIN':
            x = get_arg(0)
            d = get_d()
            return rolling(x, d).min()

        if name == 'TSMAX':
            x = get_arg(0)
            d = get_d()
            return rolling(x, d).max()

        if name in ('TSMEAN', 'MEAN'):
            x = get_arg(0)
            d = get_d()
            return rolling(x, d).mean()

        if name in ('TSSTD', 'STD', 'STD1'):
            x = get_arg(0)
            d = get_d()
            return rolling(x, d).std()

        if name == 'SMA':
            x = get_arg(0)
            d = get_int(1, 5)
            return x.ewm(span=d, adjust=False).mean()

        if name == 'SMEAN':
            x = get_arg(0)
            d = get_d()
            return x.ewm(alpha=0.2, adjust=False).mean().rolling(d, min_periods=1).mean()

        if name == 'WMA':
            x = get_arg(0)
            d = get_d()
            weights = np.arange(1, d + 1, dtype=float)
            weights /= weights.sum()
            def wma_sum(s):
                n = len(s)
                w = weights[-n:]
                return np.dot(s, w)
            return x.rolling(d, min_periods=1).apply(wma_sum, raw=True)

        if name == 'MIN':
            if len(args) >= 2:
                a = get_arg(0)
                b = get_arg(1)
                return np.minimum(a, b)
            x = get_arg(0)
            d = get_d()
            return rolling(x, d).min()

        if name == 'MAX':
            if len(args) >= 2:
                a = get_arg(0)
                b = get_arg(1)
                return np.maximum(a, b)
            x = get_arg(0)
            d = get_d()
            return rolling(x, d).max()

        if name == 'COUNT':
            cond = get_arg(0).astype(bool)
            d = get_d()
            return cond.astype(float).rolling(d, min_periods=max(1, d // 2)).sum()

        if name == 'CORR':
            x = get_arg(0)
            y = get_arg(1)
            d = get_int(2, 6)
            return x.rolling(d, min_periods=max(1, d // 2)).corr(y)

        if name in ('COVIANCE', 'COV'):
            x = get_arg(0)
            y = get_arg(1)
            d = get_int(2, 5)
            return x.rolling(d, min_periods=max(1, d // 2)).cov(y)

        if name == 'REGBETA':
            y = get_arg(0)
            if len(args) > 1:
                seq_arg = args[1].strip()
                if seq_arg.upper() == 'SEQUENCE':
                    n = get_int(2, len(y)) if len(args) > 2 else len(y)
                    seq = pd.Series(np.arange(1, n + 1, dtype=float), index=y.index[:n])
                else:
                    seq = get_arg(1)
            else:
                n = len(y) if hasattr(y, '__len__') else 20
                seq = pd.Series(np.arange(1, n + 1, dtype=float))
            d = len(seq) if hasattr(seq, '__len__') else 6
            cov = y.rolling(d).cov(seq)
            var = seq.rolling(d).var() if hasattr(seq, 'rolling') else pd.Series(seq).var()
            return cov / (var + 1e-8)

        if name == 'DELAY':
            x = get_arg(0)
            d = get_int(1, 1)
            return x.shift(d)

        if name == 'VWAP':
            close = self._env.get('CLOSE', pd.Series(0.0, index=idx))
            vol = self._env.get('VOLUME', pd.Series(1.0, index=idx))
            if len(args) > 0:
                d = get_int(0)
                return (close * vol).rolling(d).sum() / vol.rolling(d).sum()
            return (close * vol).cumsum() / vol.cumsum()

        if name == 'SEQUENCE':
            n = get_int(0, 6)
            return pd.Series(np.arange(1, n + 1, dtype=float))

        if name == 'TSRANK':
            x = get_arg(0)
            d = get_int(1, 5)
            return x.rolling(d, min_periods=max(1, d // 2)).apply(
                lambda s: pd.Series(s).rank(pct=True).iloc[-1] if len(s) > 0 else 0.5,
                raw=False,
            )

        if name == 'DECAYLINEAR':
            x = get_arg(0)
            d = get_int(1, 5)
            weights = np.arange(1, d + 1, dtype=float)
            weights /= weights.sum()
            def weighted(s):
                n = len(s)
                w = weights[-n:]
                return np.dot(s, w)
            return x.rolling(d, min_periods=1).apply(weighted, raw=True)

        if name == 'LOWDAY':
            x = get_arg(0)
            d = get_int(1, 5)
            def lowday_impl(s):
                if len(s) == 0:
                    return 0
                return len(s) - 1 - np.argmin(s[::-1])
            return x.rolling(d).apply(lowday_impl, raw=True)

        if name == 'HIGHDAY':
            x = get_arg(0)
            d = get_int(1, 5)
            def highday_impl(s):
                if len(s) == 0:
                    return 0
                return len(s) - 1 - np.argmax(s[::-1])
            return x.rolling(d).apply(highday_impl, raw=True)

        if name == 'MKT':
            return self._env.get('MKT', pd.Series(0.0, index=idx))
        if name == 'SMB':
            return self._env.get('SMB', pd.Series(0.0, index=idx))
        if name == 'HML':
            return self._env.get('HML', pd.Series(0.0, index=idx))

        if name == 'REGRESI':
            return pd.Series(0.0, index=idx)

        if name == 'SUMAC':
            x = get_arg(0)
            return x.cumsum()

        if name == 'PROD':
            x = get_arg(0)
            d = get_d()
            def prod_impl(s):
                if len(s) == 0:
                    return 0
                return np.prod(s)
            return x.rolling(d, min_periods=max(1, d // 2)).apply(prod_impl, raw=True)

        raise ValueError(f"Unknown function: {name}")

    def _ensure_series(self, result: Any) -> pd.Series:
        if isinstance(result, pd.Series):
            if self._data is not None:
                return result.reindex(self._data.index)
            return result
        if isinstance(result, (int, float)):
            return pd.Series(result, index=self._data.index if self._data is not None else None)
        return pd.Series(result, index=self._data.index if self._data is not None else None)


_evaluator = GTJAEvaluator()


def evaluate_gtja(formula: str, data: pd.DataFrame) -> pd.Series:
    """Evaluate a GTJA alpha formula string."""
    return _evaluator.evaluate(formula, data)
