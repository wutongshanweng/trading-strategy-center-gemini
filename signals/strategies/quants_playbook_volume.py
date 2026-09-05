"""QuantsPlaybook 量价/资金流策略集成 — 价量共振/量能动量/北向资金/熊牛指标/相对强弱。

来源: D:\完整项目\QuantsPlaybook-master\C-择时类\
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Direction, Signal
from signals.registry import register


def _hma(series: np.ndarray, window: int) -> np.ndarray:
    """Hull Moving Average."""
    n = len(series)
    if n < window:
        return np.full(n, np.nan)
    half = int(window * 0.5)
    sqrt_w = int(np.sqrt(window))
    wma_full = _wma(series, window)
    wma_half = _wma(series, half)
    raw = 2.0 * wma_half - wma_full
    result = _wma(raw, sqrt_w)
    result[: window - 1] = np.nan
    return result


def _wma(series: np.ndarray, window: int) -> np.ndarray:
    n = len(series)
    if n < window or window < 1:
        return np.full(n, np.nan)
    w = np.arange(1, window + 1, dtype=np.float64)
    w_sum = w.sum()
    out = np.full(n, np.nan)
    for i in range(window - 1, n):
        out[i] = np.dot(series[i - window + 1 : i + 1], w) / w_sum
    return out


def _sma(arr: np.ndarray, window: int) -> np.ndarray:
    out = np.full(len(arr), np.nan)
    if len(arr) >= window:
        cs = np.cumsum(np.insert(arr, 0, 0.0))
        out[window - 1 :] = (cs[window:] - cs[:-window]) / window
    return out


# ── 另类价量共振 ──────────────────────────────────────────────────────────────
# 来源: C-择时类/成交量的奥秘_另类价量共振指标的择时/


@register
class PriceVolumeResonanceStrategy(BaseStrategy):
    """另类价量共振指标 — HMA 价格动量 × HMA 量能动量, 经市场状态过滤。

    价量共振值 > 阈值 → BUY (持仓); 否则 → SELL (空仓)。
    """

    name = "price_volume_resonance"
    description = "另类价量共振 — HMA价格动量×HMA量能动量, 市场状态双重过滤"
    timeframes = ["1d"]
    params = {
        "bma_window": 50,       # BMA (价格 HMA) 窗口
        "ama_window": 100,      # AMA (量能 HMA 分母) 窗口
        "n_window": 3,          # BMA 滞后期
        "fast_ma": 20,          # 市场过滤快线
        "slow_ma": 60,          # 市场过滤慢线
        "threshold_bull": 1.02, # 多头市场阈值
        "threshold_bear": 1.01, # 空头市场阈值
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        p = self.params
        min_len = max(p["bma_window"], p["ama_window"], p["slow_ma"]) + 10
        if len(df) < min_len:
            return None

        close = df["close"].values
        volume = df["volume"].values
        n = len(close)

        # 价能指标
        bma = _hma(close, p["bma_window"])
        price_mom = np.full(n, np.nan)
        for i in range(p["bma_window"] + p["n_window"], n):
            if bma[i] and bma[i - p["n_window"]] and bma[i - p["n_window"]] != 0:
                price_mom[i] = bma[i] / bma[i - p["n_window"]]

        # 量能指标
        vol_hma5 = _hma(volume, 5)
        vol_hma_ama = _hma(volume, p["ama_window"])
        vol_mom = np.full(n, np.nan)
        for i in range(p["ama_window"], n):
            if vol_hma_ama[i] and vol_hma_ama[i] != 0:
                vol_mom[i] = vol_hma5[i] / vol_hma_ama[i] if vol_hma5[i] else np.nan

        # 价量共振
        pv_res = price_mom * vol_mom

        # 市场状态过滤
        fast_ma = _sma(close, p["fast_ma"])
        slow_ma = _sma(close, p["slow_ma"])
        is_bull_market = fast_ma[-1] > slow_ma[-1] if not np.isnan(fast_ma[-1]) and not np.isnan(slow_ma[-1]) else False
        threshold = p["threshold_bull"] if is_bull_market else p["threshold_bear"]

        last_pv = pv_res[-1]
        if np.isnan(last_pv):
            return None

        direction = Direction.BUY if last_pv > threshold else Direction.SELL
        confidence = min(abs(last_pv - threshold) * 5, 1.0)
        price = float(close[-1])

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"价量共振: PV={last_pv:.4f} threshold={threshold} market={'bull' if is_bull_market else 'bear'}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 量能动量择时 (特征分布建模系列之二) ──────────────────────────────────────
# 来源: C-择时类/特征分布建模择时系列之二/


@register
class VolumeMomentumTimingStrategy(BaseStrategy):
    """量能动量择时 — HMA(volume, fast) / HMA(volume, slow) 的比率, 阈值触发信号。

    比率 > upper_threshold → 放量, 看多; 比率 < 1/lower_threshold → 缩量, 看空。
    """

    name = "volume_momentum_timing"
    description = "量能动量择时 — HMA量能快慢比率, 放量/缩量阈值信号"
    timeframes = ["1d"]
    params = {
        "fast_window": 5,
        "slow_window": 100,
        "threshold": 1.15,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        fast_w = self.params["fast_window"]
        slow_w = self.params["slow_window"]
        threshold = self.params["threshold"]
        if len(df) < slow_w + 10:
            return None

        volume = df["volume"].values
        close = df["close"].values
        n = len(volume)

        vol_hma_fast = _hma(volume, fast_w)
        vol_hma_slow = _hma(volume, slow_w)

        vol_index = np.full(n, np.nan)
        for i in range(slow_w, n):
            if vol_hma_slow[i] and vol_hma_slow[i] != 0:
                vol_index[i] = vol_hma_fast[i] / vol_hma_slow[i] if vol_hma_fast[i] else np.nan

        last_vi = vol_index[-1]
        if np.isnan(last_vi):
            return None

        if last_vi > threshold:
            direction = Direction.BUY
            confidence = min((last_vi - threshold) / threshold * 3, 1.0)
        elif last_vi < 1.0:
            direction = Direction.SELL
            confidence = min((1.0 - last_vi) * 2, 1.0)
        else:
            return None  # 中性区域

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"量能动量: VI={last_vi:.4f} threshold={threshold}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── CSVC 熊牛指标 ─────────────────────────────────────────────────────────────
# 来源: C-择时类/CSVC框架及熊牛指标/


@register
class BullBearIndexStrategy(BaseStrategy):
    """牛熊指标 — 波动率/换手率比值, 用双均线判断趋势方向。

    kernel = rolling_std(return, N) / rolling_mean(turnover, N)
    熊牛指标本身与价格负相关 — 指标上升 → 熊市, 指标下降 → 牛市。
    fast_MA 上穿 slow_MA → 指标上升 → SELL; fast_MA 下穿 slow_MA → 指标下降 → BUY。

    无换手率数据时用 (high-low)/close 波动率替代。
    """

    name = "bull_bear_index"
    description = "牛熊指标 — 波动率/换手率比值双均线, 中长期趋势判断"
    timeframes = ["1d"]
    params = {
        "kernel_window": 200,
        "fast_ma": 20,
        "slow_ma": 60,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        p = self.params
        if len(df) < p["kernel_window"] + p["slow_ma"] + 10:
            return None

        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        volume = df["volume"].values
        n = len(close)

        # 收益率波动率
        rets = np.diff(close) / close[:-1]
        rets = np.insert(rets, 0, 0.0)
        # 替代换手率: 用相对振幅 (high-low)/close
        proxy_turnover = (high - low) / close

        kernel = np.full(n, np.nan)
        for i in range(p["kernel_window"] - 1, n):
            std_ret = np.std(rets[i - p["kernel_window"] + 1 : i + 1])
            mean_turn = np.mean(proxy_turnover[i - p["kernel_window"] + 1 : i + 1])
            kernel[i] = std_ret / mean_turn if mean_turn > 0 else np.nan

        fast_ma = _sma(kernel, p["fast_ma"])
        slow_ma = _sma(kernel, p["slow_ma"])

        prev_fast = fast_ma[-2]; prev_slow = slow_ma[-2]
        last_fast = fast_ma[-1]; last_slow = slow_ma[-1]
        if np.isnan(last_fast) or np.isnan(last_slow) or np.isnan(prev_fast) or np.isnan(prev_slow):
            return None

        # 金叉 (fast 上穿 slow → 指标上升 → 熊市 → SELL)
        # 死叉 (fast 下穿 slow → 指标下降 → 牛市 → BUY)
        cross_down = prev_fast >= prev_slow and last_fast < last_slow
        cross_up = prev_fast <= prev_slow and last_fast > last_slow

        if cross_down:
            direction = Direction.BUY  # 牛熊指标下降→牛市
        elif cross_up:
            direction = Direction.SELL  # 牛熊指标上升→熊市
        elif last_fast < last_slow:
            direction = Direction.BUY
        else:
            direction = Direction.SELL

        confidence = 0.5
        price = float(close[-1])

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=confidence,
            price=price,
            reason=f"熊牛指标: fast={last_fast:.4f} slow={last_slow:.4f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 北向资金择时 ──────────────────────────────────────────────────────────────
# 来源: C-择时类/北向资金交易能力一定强吗/


@register
class NorthMoneyFlowStrategy(BaseStrategy):
    """北向资金流向择时 — EMA 快慢线差值/标准差 归一化指标。

    指标 > 上阈值 → 北向资金大幅流入 → BUY; < 下阈值 → 大幅流出 → SELL。

    无实际北向资金数据时, 使用成交量变化率代理。
    """

    name = "north_money_flow"
    description = "北向资金流向择时 — EMA快慢差值归一化, 捕捉资金异动"
    timeframes = ["1d"]
    params = {
        "short_period": 5,
        "long_period": 60,
        "threshold_high": 1.0,
        "threshold_low": -1.0,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        p = self.params
        if len(df) < p["long_period"] + 10:
            return None

        close = df["close"].values
        volume = df["volume"].values
        n = len(close)

        # 用成交量变化 × 价格方向 代理北向资金
        vol_change = np.diff(volume, prepend=volume[0]) / (volume + 1)
        price_dir = np.sign(np.diff(close, prepend=close[0]))
        money_proxy = vol_change * price_dir

        # EMA 快慢线
        ema_short = np.full(n, np.nan)
        ema_long = np.full(n, np.nan)
        alpha_s = 2.0 / (p["short_period"] + 1)
        alpha_l = 2.0 / (p["long_period"] + 1)
        ema_short[0] = money_proxy[0]
        ema_long[0] = money_proxy[0]
        for i in range(1, n):
            ema_short[i] = alpha_s * money_proxy[i] + (1 - alpha_s) * ema_short[i - 1]
            ema_long[i] = alpha_l * money_proxy[i] + (1 - alpha_l) * ema_long[i - 1]

        # 归一化指标: (EMA_short - EMA_long) / std(money_proxy, long)
        indicator = np.full(n, np.nan)
        for i in range(p["long_period"] - 1, n):
            std_money = np.std(money_proxy[i - p["long_period"] + 1 : i + 1])
            if std_money > 0:
                indicator[i] = (ema_short[i] - ema_long[i]) / std_money

        last_ind = indicator[-1]
        if np.isnan(last_ind):
            return None

        if last_ind > p["threshold_high"]:
            direction = Direction.BUY
            confidence = min((last_ind - p["threshold_high"]) * 0.5 + 0.5, 1.0)
        elif last_ind < p["threshold_low"]:
            direction = Direction.SELL
            confidence = min((p["threshold_low"] - last_ind) * 0.5 + 0.5, 1.0)
        else:
            return None

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"北向资金代理: indicator={last_ind:.4f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 相对强弱单向波动 ──────────────────────────────────────────────────────────
# 来源: C-择时类/基于相对强弱下单向波动差值应用/


@register
class RelativeStrengthVolatilityStrategy(BaseStrategy):
    """相对强弱单向波动差值 — 上行波动率 (high/open-1) 与下行波动率 (1-low/open) 的剪刀差。

    剪刀差 > 0 → 上行波动主导 → BUY; < 0 → 下行波动主导 → SELL。
    """

    name = "relative_strength_volatility"
    description = "相对强弱单向波动 — 上下行波动率剪刀差 + RPS动态窗口"
    timeframes = ["1d"]
    params = {
        "std_window": 22,
        "smooth_window": 10,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        sw = self.params["std_window"]
        mw = self.params["smooth_window"]
        if len(df) < sw + mw + 10:
            return None

        open_ = df["open"].values
        high = df["high"].values
        low = df["low"].values
        close = df["close"].values
        n = len(close)

        # 上行波动
        up_vol = np.full(n, np.nan)
        down_vol = np.full(n, np.nan)
        for i in range(n):
            if open_[i] != 0:
                up_vol[i] = high[i] / open_[i] - 1.0
                down_vol[i] = 1.0 - low[i] / open_[i]

        # 滚动剪刀差
        scissors = up_vol - down_vol
        scissors_ma = _sma(scissors, mw)

        last_sc = scissors_ma[-1]
        if np.isnan(last_sc):
            return None

        direction = Direction.BUY if last_sc > 0 else Direction.SELL
        confidence = min(abs(last_sc) * 5, 1.0)
        price = float(close[-1])

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"单向波动剪刀差: {last_sc:.4f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )
