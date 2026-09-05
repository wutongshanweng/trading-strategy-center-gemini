"""Auto-generated strategy: 金叉策略V2 — 快速金叉捕获策略"""
from __future__ import annotations
from typing import Optional
import numpy as np
import pandas as pd
from signals.base import BaseStrategy, Direction, Signal
from signals.registry import register


def _sma(arr, w):
    out = np.full(len(arr), np.nan)
    if len(arr) >= w:
        cs = np.cumsum(np.insert(arr, 0, 0.0))
        out[w - 1 :] = (cs[w:] - cs[:-w]) / w
    return out


def _rsi(close, period=14):
    diff = np.diff(close, prepend=close[0])
    gain = np.where(diff > 0, diff, 0)
    loss = np.where(diff < 0, -diff, 0)
    avg_gain = np.full(len(close), np.nan)
    avg_loss = np.full(len(close), np.nan)
    alpha = 1.0 / period
    avg_gain[period - 1] = np.mean(gain[:period])
    avg_loss[period - 1] = np.mean(loss[:period])
    for i in range(period, len(close)):
        avg_gain[i] = alpha * gain[i] + (1 - alpha) * avg_gain[i - 1]
        avg_loss[i] = alpha * loss[i] + (1 - alpha) * avg_loss[i - 1]
    rs = avg_gain / (avg_loss + 1e-10)
    return 100.0 - 100.0 / (1.0 + rs)


@register
class TrendGoldenCrossV2(BaseStrategy):
    name = "trend_golden_cross_v2"
    description = "金叉策略V2: 快速金叉捕获策略"
    timeframes = ["1d"]
    params = {
        "fast_period": 3,
        "slow_period": 10,
        "stop_loss_pct": 2.0,
        "take_profit_pct": 10.0,
    }

    def compute(self, df, symbol=""):
        p = self.params
        if len(df) < max(p["slow_period"], 30) + 10:
            return None

        close = df["close"].values.astype(float)
        high = df["high"].values.astype(float) if "high" in df else close
        low = df["low"].values.astype(float) if "low" in df else close
        volume = df["volume"].values.astype(float) if "volume" in df else np.ones(len(close))
        n = len(close)

        fast_ma = _sma(close, p["fast_period"])
        slow_ma = _sma(close, p["slow_period"])

        # 入场条件
        last_fast = fast_ma[-1]
        last_slow = slow_ma[-1]
        prev_fast = fast_ma[-2]
        prev_slow = slow_ma[-2]

        cross_up = prev_fast <= prev_slow and last_fast > last_slow
        cross_down = prev_fast >= prev_slow and last_fast < last_slow

        # 出场条件: 反向交叉
        exit_up = prev_fast >= prev_slow and last_fast < last_slow
        exit_down = prev_fast <= prev_slow and last_fast > last_slow

        price = float(close[-1])

        safe = self.description or self.name

        if cross_up:
            return Signal(
                symbol=symbol, direction=Direction.BUY, confidence=0.7,
                price=price, stop_loss=round(price * (1 - 0.02), 2),
                take_profit=round(price * (1 + 0.1), 2),
                reason=f"{safe}: 金叉 fast={last_fast:.2f} slow={last_slow:.2f}",
                strategy_name=self.name, timeframe=self.timeframes[0],
            )
        elif cross_down:
            return Signal(
                symbol=symbol, direction=Direction.SELL, confidence=0.7,
                price=price, stop_loss=round(price * (1 + 0.02), 2),
                take_profit=round(price * (1 - 0.1), 2),
                reason=f"{safe}: 死叉 fast={last_fast:.2f} slow={last_slow:.2f}",
                strategy_name=self.name, timeframe=self.timeframes[0],
            )
        elif last_fast > last_slow:
            return Signal(
                symbol=symbol, direction=Direction.BUY, confidence=0.4,
                price=price, reason=f"{safe}: 多头排列",
                strategy_name=self.name, timeframe=self.timeframes[0],
            )
        elif last_fast < last_slow:
            return Signal(
                symbol=symbol, direction=Direction.SELL, confidence=0.4,
                price=price, reason=f"{safe}: 空头排列",
                strategy_name=self.name, timeframe=self.timeframes[0],
            )
        return None
