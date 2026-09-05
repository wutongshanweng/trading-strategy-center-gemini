"""HHT 希尔伯特-黄变换择时策略。

基于 EMD/VMD 分解 + Hilbert 变换瞬时相位:
1. EMD/VMD 将价格序列分解为 IMF (本征模态函数)
2. 取中高频 IMF (index=2) 做 Hilbert 变换得到瞬时相位
3. 相位在 [-π/2, π/2] → 上涨趋势 → 做多, 否则做空

参考: QuantsPlaybook SignalMaker/hht_signal.py
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Signal, Direction
from signals.registry import register


def _decompose_emd(signal: np.ndarray, max_imf: int = 9) -> np.ndarray:
    """EMD 经验模态分解。"""
    try:
        from PyEMD import EMD
        return EMD().emd(signal, max_imf=max_imf)
    except ImportError:
        raise ImportError("HHT strategy requires PyEMD: pip install EMD-signal")


def _decompose_vmd(signal: np.ndarray, max_imf: int = 9) -> np.ndarray:
    """VMD 变分模态分解。"""
    try:
        from vmdpy import VMD
        imfs, _, _ = VMD(signal, alpha=2000, tau=0.3, K=max_imf, DC=0, init=1, tol=1e-6)
        return imfs
    except ImportError:
        raise ImportError("HHT VMD requires vmdpy: pip install vmdpy")


def _instantaneous_phase(signal: np.ndarray) -> np.ndarray:
    """Hilbert 变换 → 瞬时相位 (angle of analytic signal)。"""
    from scipy.signal import hilbert
    return np.angle(hilbert(signal))


def hht_signal(close: np.ndarray, imf_index: int = 2, max_imf: int = 9,
               method: str = "EMD") -> int:
    """对给定窗口的收盘价序列计算 HHT 二进制信号。

    1 = 上涨趋势 (相位在 [-π/2, π/2]), 0 = 下跌或无信号。
    """
    if len(close) < max_imf + 5:
        return 0
    decompose = _decompose_emd if method.upper() == "EMD" else _decompose_vmd
    try:
        imfs = decompose(close, max_imf=max_imf)
    except Exception:
        return 0
    if isinstance(imfs, np.ndarray) and imfs.ndim == 2:
        if imfs.shape[0] <= imf_index:
            return 0
        target = imfs[imf_index]
    else:
        return 0
    phase = _instantaneous_phase(target)
    return int(-np.pi / 2 <= phase[-1] <= np.pi / 2)


@register
class HHTTiming(BaseStrategy):
    """HHT 希尔伯特-黄变换择时 — EMD/VMD 分解 + Hilbert 瞬时相位。

    当瞬时相位在 [-π/2, π/2] 区间时判定为上涨趋势。
    """

    name = "hht_timing"
    description = "HHT择时: EMD/VMD分解+Hilbert瞬时相位判断趋势方向"
    timeframes = ["1d"]
    params = {
        "method": "EMD",        # EMD / VMD
        "hht_period": 60,       # 滑动窗口
        "imf_index": 2,         # 取第几个 IMF (0-based, 2=中高频)
        "max_imf": 9,           # 最大 IMF 数
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        close = df["close"].values
        if len(close) < self.params["hht_period"]:
            return None

        window = close[-self.params["hht_period"]:]
        binary = hht_signal(window, self.params["imf_index"],
                           self.params["max_imf"], self.params["method"])

        price = float(df["close"].iloc[-1])
        if binary == 1:
            return Signal(
                symbol=symbol, direction=Direction.BUY, confidence=0.7,
                price=price,
                reason=f"HHT {self.params['method']} 相位在上涨区间",
                strategy_name=self.name, timeframe=self.timeframes[0],
                stop_loss=float(price * 0.96), take_profit=float(price * 1.06),
            )
        else:
            return Signal(
                symbol=symbol, direction=Direction.SELL, confidence=0.5,
                price=price,
                reason=f"HHT {self.params['method']} 相位离开上涨区间",
                strategy_name=self.name, timeframe=self.timeframes[0],
                stop_loss=float(price * 1.04), take_profit=float(price * 0.94),
            )
