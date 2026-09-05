from typing import Dict, List, Tuple
import numpy as np


# ── 7因子加权评分 (借鉴 QuantDinger experiment/scoring.py) ──
DEFAULT_WEIGHTS = {
    "total_return": 0.22,
    "annual_return": 0.12,
    "sharpe": 0.18,
    "profit_factor": 0.14,
    "win_rate": 0.09,
    "max_drawdown": 0.15,
    "stability": 0.10,
}

GRADE_THRESHOLDS = [
    ("A", 85), ("B", 72), ("C", 60), ("D", 45), ("E", 0),
]


def calculate_composite_score(stats: Dict[str, float], weights: Dict[str, float] = None) -> float:
    """7-factor weighted score (0-100) with quality eligibility gates."""
    w = weights or DEFAULT_WEIGHTS
    trades = stats.get("trade_count", 0)
    sharpe = stats.get("sharpe", 0.0)
    if trades < 5 or sharpe <= 0:
        return 0.0

    score = 0.0

    if "total_return" in stats:
        score += w.get("total_return", 0.22) * min(max(stats["total_return"] * 100, 0), 100)
    if "annual_return" in stats:
        score += w.get("annual_return", 0.12) * min(max(stats["annual_return"] * 100, 0), 100)
    if "sharpe" in stats:
        v = stats["sharpe"]
        score += w.get("sharpe", 0.18) * min(max(50 + v * 25, 0), 100)
    if "profit_factor" in stats:
        pf = min(stats["profit_factor"], 5.0)
        score += w.get("profit_factor", 0.14) * (pf / 5.0 * 100)
    if "win_rate" in stats:
        score += w.get("win_rate", 0.09) * stats["win_rate"] * 100
    if "max_drawdown" in stats:
        dd = abs(stats["max_drawdown"])
        dd_score = max(100 - dd * 200, 0)
        score += w.get("max_drawdown", 0.15) * dd_score
    if "stability" in stats:
        score += w.get("stability", 0.10) * stats["stability"] * 100

    if trades < 12:
        score -= 5

    return max(0.0, min(score, 100.0))


def score_to_grade(score: float) -> str:
    """将评分映射为等级 A-E。"""
    for grade, threshold in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "E"


def calculate_score_with_grade(stats: Dict[str, float]) -> Tuple[float, str]:
    """一次调用同时返回评分和等级。"""
    s = calculate_composite_score(stats)
    return s, score_to_grade(s)


def calculate_sharpe(pnls: List[float]) -> float:
    arr = np.array(pnls)
    if len(arr) < 2 or arr.std() == 0:
        return 0.0
    return float(arr.mean() / arr.std() * np.sqrt(252))


def calculate_sortino(pnls: List[float]) -> float:
    arr = np.array(pnls)
    if len(arr) < 2:
        return 0.0
    downside = arr[arr < 0]
    if len(downside) < 2 or downside.std() == 0:
        return 0.0
    return float(arr.mean() / downside.std() * np.sqrt(252))


def calculate_max_drawdown(equity_curve: List[float]) -> float:
    arr = np.array(equity_curve)
    if len(arr) < 2:
        return 0.0
    peak = np.maximum.accumulate(arr)
    return float(((arr - peak) / peak).min())


def calculate_profit_factor(pnls: List[float]) -> float:
    gross_profit = sum(p for p in pnls if p > 0)
    gross_loss = abs(sum(p for p in pnls if p < 0))
    return gross_profit / gross_loss if gross_loss > 0 else float("inf")


def calculate_win_rate(pnls: List[float]) -> float:
    if not pnls:
        return 0.0
    return sum(1 for p in pnls if p > 0) / len(pnls)


def calculate_stability(equity_curve: List[float]) -> float:
    """净值曲线稳定性 (R² of linear fit, 0-1)。越接近直线越稳定。"""
    if len(equity_curve) < 3:
        return 0.0
    y = np.array(equity_curve)
    x = np.arange(len(y))
    slope, intercept = np.polyfit(x, y, 1)
    y_pred = slope * x + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - y.mean()) ** 2)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
    return float(max(0.0, r2))


def calculate_calmar(pnls: List[float], equity_curve: List[float]) -> float:
    """Calmar ratio = 年化收益 / 最大回撤。"""
    arr = np.array(pnls)
    if len(arr) < 2:
        return 0.0
    annual_return = float(arr.mean() * 252)
    mdd = abs(calculate_max_drawdown(equity_curve))
    return annual_return / mdd if mdd > 0 else 0.0
