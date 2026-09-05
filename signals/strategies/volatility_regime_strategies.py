"""波动率制度策略 — 基于历史波动率百分位的制度检测与信号过滤。

低波动 = 预期扩张做多, 高波动 = 预期收缩做空。
可作为独立策略生成信号，也可作为 FilterRegime 的补充维度。
"""

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Signal, Direction
from signals.registry import register


def compute_hv(close: pd.Series, window: int = 20, annual_factor: float = 252) -> pd.Series:
    """计算历史波动率 (年化)。

    Args:
        close: 收盘价序列
        window: 滚动窗口
        annual_factor: 年化因子 (股票252, 期货/加密365)
    """
    ret = np.log(close / close.shift(1))
    hv = ret.rolling(window).std() * np.sqrt(annual_factor)
    return hv


def compute_hv_percentile(hv: pd.Series, lookback: int = 252) -> pd.Series:
    """计算波动率在回看期内的百分位排名。"""
    return hv.rolling(lookback).apply(lambda x: (x.iloc[-1] >= x).sum() / len(x), raw=False)


@register
class VolatilityRegime(BaseStrategy):
    """波动率制度策略 — HV 百分位低波动做多(预期扩张), 高波动做空(预期收缩)。"""

    name = "volatility_regime"
    description = "历史波动率百分位制度检测 — 低波做多, 高波做空"
    timeframes = ["1d"]
    params = {
        "hv_window": 20,
        "hv_lookback": 252,
        "annual_factor": 252,
        "low_pct": 0.20,     # 低于此百分位 → 做多
        "high_pct": 0.80,    # 高于此百分位 → 做空
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Signal | None:
        if len(df) < self.params["hv_lookback"] + self.params["hv_window"]:
            return None

        hv = compute_hv(df["close"], self.params["hv_window"], self.params["annual_factor"])
        pct = compute_hv_percentile(hv, self.params["hv_lookback"])

        hv_v, pct_v = hv.iloc[-1], pct.iloc[-1]
        if pd.isna(pct_v):
            return None

        price = float(df["close"].iloc[-1])

        if pct_v < self.params["low_pct"]:
            conf = min((self.params["low_pct"] - pct_v) / self.params["low_pct"], 1.0)
            return Signal(
                symbol=symbol, direction=Direction.BUY, confidence=conf,
                price=price,
                reason=f"低波动扩张 HV={hv_v:.2%} pct={pct_v:.2f}",
                strategy_name=self.name, timeframe=self.timeframes[0],
                stop_loss=float(price * 0.97), take_profit=float(price * 1.06),
            )
        elif pct_v > self.params["high_pct"]:
            conf = min((pct_v - self.params["high_pct"]) / (1 - self.params["high_pct"]), 1.0)
            return Signal(
                symbol=symbol, direction=Direction.SELL, confidence=conf,
                price=price,
                reason=f"高波动收缩 HV={hv_v:.2%} pct={pct_v:.2f}",
                strategy_name=self.name, timeframe=self.timeframes[0],
                stop_loss=float(price * 1.03), take_profit=float(price * 0.94),
            )
        return None


def get_volatility_regime_label(df: pd.DataFrame, hv_window: int = 20, hv_lookback: int = 252) -> str:
    """获取当前波动率制度标签 (供其他策略/过滤器使用)。

    Returns:
        'low_vol' / 'normal' / 'high_vol'
    """
    if len(df) < hv_lookback + hv_window:
        return "unknown"
    hv = compute_hv(df["close"], hv_window)
    pct = compute_hv_percentile(hv, hv_lookback)
    pct_v = pct.iloc[-1]
    if pd.isna(pct_v):
        return "unknown"
    if pct_v < 0.20:
        return "low_vol"
    elif pct_v > 0.80:
        return "high_vol"
    return "normal"
