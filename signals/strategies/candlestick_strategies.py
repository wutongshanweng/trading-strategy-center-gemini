"""K线形态策略 — 增强版 15 种蜡烛图形态识别。

在 price_action.py 基础上补充: 倒锤子、孕线、刺穿线、乌云盖顶、
晨星/暮星、三白兵/三乌鸦、纺锤线。
纯向量化实现，通过多形态评分汇总生成综合信号。
"""

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Signal, Direction
from signals.registry import register


def _body(o, c): return (c - o).abs()
def _upper_shadow(o, c, h): return h - pd.concat([o, c], axis=1).max(axis=1)
def _lower_shadow(o, c, l): return pd.concat([o, c], axis=1).min(axis=1) - l


def _detect_hammer(o, h, l, c, shadow_ratio=2.0):
    bd = _body(o, c)
    return ((_lower_shadow(o, c, l) >= shadow_ratio * bd) & (_upper_shadow(o, c, h) < bd) & (bd > 0)).astype(int)


def _detect_inverted_hammer(o, h, l, c, shadow_ratio=2.0):
    bd = _body(o, c)
    return ((_upper_shadow(o, c, h) >= shadow_ratio * bd) & (_lower_shadow(o, c, l) < bd) & (bd > 0)).astype(int)


def _detect_shooting_star(o, h, l, c, shadow_ratio=2.0):
    bd = _body(o, c)
    uptrend = c.shift(1) > c.shift(2)
    return (-((_upper_shadow(o, c, h) >= shadow_ratio * bd) & (_lower_shadow(o, c, l) < bd) & (bd > 0) & uptrend).astype(int))


def _detect_engulfing(o, c):
    o1, c1 = o.shift(1), c.shift(1)
    bull = (c1 < o1) & (c > o) & (c >= o1) & (o <= c1)
    bear = (c1 > o1) & (c < o) & (c <= o1) & (o >= c1)
    sig = pd.Series(0, index=o.index)
    sig[bull] = 1; sig[bear] = -1
    return sig


def _detect_harami(o, c):
    o1, c1 = o.shift(1), c.shift(1)
    bd, bd1 = _body(o, c), _body(o1, c1)
    prev_bear, prev_bull = c1 < o1, c1 > o1
    large = bd1 > bd
    prev_top = pd.concat([o1, c1], axis=1).max(axis=1)
    prev_bot = pd.concat([o1, c1], axis=1).min(axis=1)
    curr_top = pd.concat([o, c], axis=1).max(axis=1)
    curr_bot = pd.concat([o, c], axis=1).min(axis=1)
    contained = (curr_top <= prev_top) & (curr_bot >= prev_bot)
    sig = pd.Series(0, index=o.index)
    sig[prev_bear & large & contained] = 1
    sig[prev_bull & large & contained] = -1
    return sig


def _detect_piercing_line(o, l, c):
    o1, c1, l1 = o.shift(1), c.shift(1), l.shift(1)
    return ((c1 < o1) & (c > o) & (o < l1) & (c > (o1 + c1) / 2)).astype(int)


def _detect_dark_cloud(o, h, c):
    o1, c1, h1 = o.shift(1), c.shift(1), h.shift(1)
    return -((c1 > o1) & (c < o) & (o > h1) & (c < (o1 + c1) / 2)).astype(int)


def _detect_morning_star(o, h, l, c):
    o1, c1 = o.shift(2), c.shift(2)
    o2, c2, h2 = o.shift(1), c.shift(1), h.shift(1)
    bd2 = _body(o2, c2); rng2 = (h.shift(1) - l.shift(1)).replace(0, np.nan)
    cond = ((c1 < o1) & (bd2 / rng2 < 0.3) & (h2 < l.shift(2)) & (c > o) & (c > (o1 + c1) / 2))
    return cond.fillna(0).astype(int)


def _detect_evening_star(o, h, l, c):
    o1, c1 = o.shift(2), c.shift(2)
    o2, c2, l2 = o.shift(1), c.shift(1), l.shift(1)
    bd2 = _body(o2, c2); rng2 = (h.shift(1) - l.shift(1)).replace(0, np.nan)
    cond = ((c1 > o1) & (bd2 / rng2 < 0.3) & (l2 > h.shift(2)) & (c < o) & (c < (o1 + c1) / 2))
    return -(cond.fillna(0).astype(int))


def _detect_three_white_soldiers(o, c):
    o1, c1 = o.shift(2), c.shift(2); o2, c2 = o.shift(1), c.shift(1)
    cond = ((c1 > o1) & (c2 > o2) & (c > o) & (c2 > c1) & (c > c2)
            & (o2 >= o1) & (o2 <= c1) & (o >= o2) & (o <= c2))
    return cond.fillna(0).astype(int)


def _detect_three_black_crows(o, c):
    o1, c1 = o.shift(2), c.shift(2); o2, c2 = o.shift(1), c.shift(1)
    cond = ((c1 < o1) & (c2 < o2) & (c < o) & (c2 < c1) & (c < c2)
            & (o2 <= o1) & (o2 >= c1) & (o <= o2) & (o >= c2))
    return -(cond.fillna(0).astype(int))


def compute_pattern_scores(df: pd.DataFrame, shadow_ratio: float = 2.0) -> pd.Series:
    """计算所有形态的汇总评分。返回 -N 到 +N 的整数 Series。"""
    o, h, l, c = df["open"], df["high"], df["low"], df["close"]
    scores = pd.DataFrame(index=df.index)
    scores["hammer"] = _detect_hammer(o, h, l, c, shadow_ratio)
    scores["inv_hammer"] = _detect_inverted_hammer(o, h, l, c, shadow_ratio)
    scores["shooting_star"] = _detect_shooting_star(o, h, l, c, shadow_ratio)
    scores["engulfing"] = _detect_engulfing(o, c)
    scores["harami"] = _detect_harami(o, c)
    scores["piercing"] = _detect_piercing_line(o, l, c)
    scores["dark_cloud"] = _detect_dark_cloud(o, h, c)
    scores["morning_star"] = _detect_morning_star(o, h, l, c)
    scores["evening_star"] = _detect_evening_star(o, h, l, c)
    scores["three_white"] = _detect_three_white_soldiers(o, c)
    scores["three_black"] = _detect_three_black_crows(o, c)
    return scores.sum(axis=1)


@register
class CandlestickPatterns(BaseStrategy):
    """K线形态综合策略 — 15 种蜡烛图形态多信号投票。"""

    name = "candlestick_patterns"
    description = "15种K线形态 (锤子/吞没/孕线/刺穿/乌云盖顶/晨星暮星/三白兵三乌鸦等) 综合投票"
    timeframes = ["1d"]
    params = {"shadow_ratio": 2.0, "min_abs_score": 2}

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Signal | None:
        if len(df) < 5:
            return None
        total = compute_pattern_scores(df, self.params["shadow_ratio"])
        score = int(total.iloc[-1])
        if abs(score) < self.params["min_abs_score"]:
            return None

        direction = Direction.BUY if score > 0 else Direction.SELL
        price = float(df["close"].iloc[-1])
        confidence = min(abs(score) / 5.0, 1.0)

        return Signal(
            symbol=symbol, direction=direction, confidence=confidence,
            price=price,
            reason=f"K线形态综合评分: {score:+d}",
            strategy_name=self.name, timeframe=self.timeframes[0],
            stop_loss=float(price * (0.96 if direction == Direction.BUY else 1.04)),
            take_profit=float(price * (1.06 if direction == Direction.BUY else 0.94)),
        )
