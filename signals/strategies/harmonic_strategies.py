"""谐波形态策略 — Gartley/Bat/Butterfly/Crab XABCD 五点形态识别。

纯 pandas 向量化实现，无外部依赖。
基于 Fibonacci 比率在 PRZ（潜在反转区）生成交易信号。
"""

from typing import Optional, List, Tuple

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Signal, Direction
from signals.registry import register

# ── 形态定义: (b_retrace_lo, b_retrace_hi, d_retrace_lo, d_retrace_hi) ──
PATTERNS = {
    "Gartley":   {"b": (0.55, 0.68), "d": (0.72, 0.84)},
    "Bat":       {"b": (0.33, 0.55), "d": (0.82, 0.94)},
    "Butterfly": {"b": (0.72, 0.84), "d": (1.20, 1.38)},
    "Crab":      {"b": (0.33, 0.68), "d": (1.52, 1.72)},
}


def _in_range(value: float, lo: float, hi: float, tol: float = 0.08) -> bool:
    return (lo - tol) <= value <= (hi + tol)


def _find_swings(high: pd.Series, low: pd.Series, window: int = 10):
    """检测摆动高低点 (滚动窗口极值法)。"""
    full = window * 2 + 1
    roll_max = high.rolling(full, center=True).max()
    roll_min = low.rolling(full, center=True).min()
    return high.where(high == roll_max).dropna(), low.where(low == roll_min).dropna()


def _merge_swings(swing_highs: pd.Series, swing_lows: pd.Series) -> List[Tuple]:
    """合并摆动点为时间排序序列，去重连续同类型点。"""
    points = [(ts, price, "H") for ts, price in swing_highs.items()]
    points += [(ts, price, "L") for ts, price in swing_lows.items()]
    points.sort(key=lambda x: x[0])
    merged = []
    for pt in points:
        if not merged or merged[-1][2] != pt[2]:
            merged.append(pt)
        elif pt[2] == "H" and pt[1] > merged[-1][1]:
            merged[-1] = pt
        elif pt[2] == "L" and pt[1] < merged[-1][1]:
            merged[-1] = pt
    return merged


def _classify_pattern(xa_price, a_price, b_price, c_price, d_price, tol=0.08) -> Optional[str]:
    """根据 Fibonacci 比率判定 XABCD 属于哪种谐波形态。"""
    xa = abs(a_price - xa_price)
    ab = abs(b_price - a_price)
    ad = abs(d_price - a_price)
    if xa == 0 or ab == 0:
        return None
    b_retrace = ab / xa
    d_retrace = ad / xa
    for name, rules in PATTERNS.items():
        if _in_range(b_retrace, *rules["b"], tol=tol) and _in_range(d_retrace, *rules["d"], tol=tol):
            return name
    return None


def detect_harmonic(df: pd.DataFrame, swing_window: int = 10, tol: float = 0.08) -> List[dict]:
    """检测谐波形态，返回 D 点信号列表。"""
    swing_highs, swing_lows = _find_swings(df["high"], df["low"], swing_window)
    merged = _merge_swings(swing_highs, swing_lows)
    if len(merged) < 5:
        return []

    found = []
    for i in range(len(merged) - 4):
        pts = merged[i:i + 5]
        types = [p[2] for p in pts]
        if not all(types[j] != types[j + 1] for j in range(4)):
            continue

        x_ts, x_price, x_type = pts[0]
        a_ts, a_price, _ = pts[1]
        b_ts, b_price, _ = pts[2]
        c_ts, c_price, _ = pts[3]
        d_ts, d_price, _ = pts[4]

        pattern = _classify_pattern(x_price, a_price, b_price, c_price, d_price, tol=tol)
        if pattern is None:
            continue

        found.append({
            "pattern": pattern,
            "direction": "bullish" if x_type == "L" else "bearish",
            "d_index": d_ts,
            "d_price": d_price,
        })
    return found


@register
class HarmonicPatterns(BaseStrategy):
    """谐波形态策略 — 识别 Gartley/Bat/Butterfly/Crab 并在 D 点 PRZ 生成信号。"""

    name = "harmonic_patterns"
    description = "XABCD 谐波形态 (Gartley/Bat/Butterfly/Crab) D点反转信号"
    timeframes = ["1d", "4h"]
    params = {"swing_window": 10, "tol": 0.08, "min_patterns": 1}

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        if len(df) < self.params["swing_window"] * 4:
            return None
        patterns = detect_harmonic(df, self.params["swing_window"], self.params["tol"])
        if len(patterns) < self.params["min_patterns"]:
            return None

        latest = patterns[-1]
        direction = Direction.BUY if latest["direction"] == "bullish" else Direction.SELL
        price = float(latest["d_price"])
        confidence = min(len(patterns) * 0.15, 1.0)

        return Signal(
            symbol=symbol, direction=direction, confidence=confidence,
            price=price,
            reason=f"{latest['pattern']} ({latest['direction']}) @ D={price:.2f}",
            strategy_name=self.name, timeframe=self.timeframes[0],
            stop_loss=float(price * (0.96 if direction == Direction.BUY else 1.04)),
            take_profit=float(price * (1.08 if direction == Direction.BUY else 0.92)),
        )
