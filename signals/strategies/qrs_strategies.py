"""QRS 低延迟择时策略 — 基于高低价波动率比率的量化择时信号。

公式: QRS = zscore(std(high)/std(low) * corr(low, high)) * (corr(low, high) ** n)

核心思想: 高低价的标准差比率反映方向性压力, 乘以相关系数作为信心调节。
当 high 波动 > low 波动且正相关时 → 上涨信号。
当 low 波动 > high 波动且正相关时 → 下跌信号。

参考: 中金公司 20210121_量化择时系列(1) 金融工程视角下的技术择时艺术
      QuantsPlaybook SignalMaker/qrs.py
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Signal, Direction
from signals.registry import register


def _rolling_corr(a: np.ndarray, b: np.ndarray) -> float:
    """计算两数组相关系数 (标量)。"""
    if len(a) < 2 or len(b) < 2:
        return 0.0
    std_a, std_b = np.std(a, ddof=0), np.std(b, ddof=0)
    if std_a == 0 or std_b == 0:
        return 0.0
    return float(np.corrcoef(a, b)[0, 1])


def calc_qrs(high_arr: np.ndarray, low_arr: np.ndarray, rho_power: float = 3.0) -> float:
    """计算 QRS 值 (zscore * rho 调节项)。

    Args:
        high_arr: 窗口内最高价序列
        low_arr: 窗口内最低价序列
        rho_power: 相关系数幂次 (默认 3.0)

    Returns:
        QRS 值: 正值=看多, 负值=看空
    """
    if len(high_arr) < 5 or len(low_arr) < 5:
        return 0.0

    std_high = np.std(high_arr, ddof=0)
    std_low = np.std(low_arr, ddof=0)
    rho = _rolling_corr(low_arr, high_arr)

    if std_low == 0:
        return 0.0

    beta = (std_high / std_low) * rho
    z = beta / max(std_high, 1e-10)  # simplified zscore
    rho_factor = np.sign(rho) * (abs(rho) ** rho_power)
    qrs = z * rho_factor

    if np.isnan(qrs) or np.isinf(qrs):
        return 0.0
    return float(qrs)


@register
class QRSTiming(BaseStrategy):
    """QRS 低延迟择时 — 基于高低价波动率比率的量化择时。

    正值信号 → 做多 (high波动主导+正相关), 负值信号 → 做空 (low波动主导+正相关)。
    """

    name = "qrs_timing"
    description = "QRS择时: 高低价波动率比率 (std(high)/std(low)*corr) 方向信号"
    timeframes = ["1d", "4h", "1h"]
    params = {
        "window": 20,           # 计算窗口
        "rho_power": 3.0,       # 相关系数幂次 (越高越重视强相关)
        "threshold": 0.3,       # 信号阈值 (|QRS| > threshold 才触发)
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        n = self.params["window"]
        if len(df) < n + 2:
            return None

        high = df["high"].iloc[-n:].values
        low = df["low"].iloc[-n:].values
        qrs = calc_qrs(high, low, self.params["rho_power"])

        if abs(qrs) < self.params["threshold"]:
            return None

        price = float(df["close"].iloc[-1])
        direction = Direction.BUY if qrs > 0 else Direction.SELL
        confidence = min(abs(qrs), 1.0)

        return Signal(
            symbol=symbol, direction=direction, confidence=confidence,
            price=price,
            reason=f"QRS={qrs:.3f} (threshold={self.params['threshold']})",
            strategy_name=self.name, timeframe=self.timeframes[0],
            stop_loss=float(price * (0.97 if direction == Direction.BUY else 1.03)),
            take_profit=float(price * (1.05 if direction == Direction.BUY else 0.95)),
        )
