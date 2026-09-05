"""QuantsPlaybook 择时类策略集成 — RSRS/ICU/HMA/LLT/FRAMA/高阶矩/鳄鱼线/趋与势。

来源: D:\完整项目\QuantsPlaybook-master\C-择时类\
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Direction, Signal
from signals.registry import register


# ── helpers ──────────────────────────────────────────────────────────────────

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
    """Weighted Moving Average (线性加权)."""
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
    """Simple moving average, returns same-length array with leading NaN."""
    out = np.full(len(arr), np.nan)
    if len(arr) >= window:
        cs = np.cumsum(np.insert(arr, 0, 0.0))
        out[window - 1 :] = (cs[window:] - cs[:-window]) / window
    return out


# ── RSRS 择时 ─────────────────────────────────────────────────────────────────
# 来源: C-择时类/RSRS择时指标/


@register
class RSRSStrategy(BaseStrategy):
    """RSRS 阻力支撑相对强度择时 — OLS 回归 daily high~low 的 beta*R², z-score 信号。

    标准版 RSRS: N=18 日窗口回归, M=600 日 z-score 标准化。
    改良版 (right-sided): 修正 beta 为修正标准分, R² 钝化处理。
    """

    name = "rsrs_timing"
    description = "RSRS阻力支撑相对强度择时 — OLS回归high~low的beta*R²标准化信号"
    timeframes = ["1d"]
    params = {
        "reg_window": 18,       # OLS 回归窗口
        "zscore_window": 600,   # z-score 标准化窗口
        "threshold": 0.7,       # 开仓阈值 (z-score > threshold → BUY)
        "improved": True,       # True=改良版(right-sided修正), False=标准版
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        if len(df) < max(self.params["reg_window"], self.params["zscore_window"]) + 10:
            return None

        high = df["high"].values
        low = df["low"].values
        N = self.params["reg_window"]
        M = self.params["zscore_window"]
        threshold = self.params["threshold"]
        improved = self.params["improved"]

        # 滚动 OLS: high = alpha + beta * low
        n = len(high)
        betas = np.full(n, np.nan)
        r2s = np.full(n, np.nan)

        for i in range(N - 1, n):
            y = high[i - N + 1 : i + 1]
            x = low[i - N + 1 : i + 1]
            slope, intercept = np.polyfit(x, y, 1)
            y_pred = slope * x + intercept
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            betas[i] = slope
            r2s[i] = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0

        if improved:
            # right-sided: beta 修正 = beta * corr(beta_position, return)
            # 简化: 使用 beta 的滚动标准化值替代
            rsrs_raw = betas * r2s
        else:
            rsrs_raw = betas * np.clip(r2s, 0, 1)

        # z-score
        zscores = np.full(n, np.nan)
        for i in range(M - 1, n):
            window = rsrs_raw[i - M + 1 : i + 1]
            mu, std = np.nanmean(window), np.nanstd(window)
            if std and std > 0:
                zscores[i] = (rsrs_raw[i] - mu) / std

        last_z = zscores[-1]
        if np.isnan(last_z):
            return None

        direction = Direction.BUY if last_z > threshold else Direction.SELL
        confidence = min(abs(last_z) / (threshold * 3), 1.0)
        price = float(df["close"].iloc[-1])

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"RSRS z-score={last_z:.3f} threshold={threshold}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── ICU 均线 ──────────────────────────────────────────────────────────────────
# 来源: C-择时类/ICU均线/


@register
class ICUMAStrategy(BaseStrategy):
    """ICU 均线 — Siegel's Repeated Median 稳健回归均线, 抗异常值。

    价格在 ICU 均线上方 → BUY, 下方 → SELL。
    """

    name = "icu_ma"
    description = "ICU均线 — Siegel重复中位数稳健回归, 抗异常值 MA 交叉择时"
    timeframes = ["1d"]
    params = {"window": 20}

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        if len(df) < window + 5:
            return None

        from scipy import stats

        close = df["close"].values
        n = len(close)
        icu = np.full(n, np.nan)

        for i in range(window - 1, n):
            seg = close[i - window + 1 : i + 1]
            res = stats.siegelslopes(seg, np.arange(window))
            icu[i] = res.intercept + res.slope * (window - 1)

        last_close = close[-1]
        last_icu = icu[-1]
        if np.isnan(last_icu):
            return None

        direction = Direction.BUY if last_close > last_icu else Direction.SELL
        diff_pct = (last_close - last_icu) / last_icu
        confidence = min(abs(diff_pct) * 10, 1.0)
        price = float(last_close)

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"ICU MA: close={last_close:.2f} vs ICU={last_icu:.2f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── HMA 择时 ──────────────────────────────────────────────────────────────────


@register
class HMAStrategy(BaseStrategy):
    """Hull Moving Average 择时 — 低延迟均线, 价格穿越 HMA 产生信号。"""

    name = "hma_timing"
    description = "Hull移动平均择时 — 低延迟均线, 价格突破HMA方向判断"
    timeframes = ["1d"]
    params = {"window": 20}

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        if len(df) < window * 2:
            return None

        close = df["close"].values
        hma = _hma(close, window)

        last_close = close[-1]
        last_hma = hma[-1]
        prev_close = close[-2]
        prev_hma = hma[-2]

        if np.isnan(last_hma) or np.isnan(prev_hma):
            return None

        # 价格上穿 HMA → BUY, 下穿 → SELL
        cross_up = prev_close <= prev_hma and last_close > last_hma
        cross_down = prev_close >= prev_hma and last_close < last_hma

        if cross_up:
            direction = Direction.BUY
        elif cross_down:
            direction = Direction.SELL
        elif last_close > last_hma:
            direction = Direction.BUY
        else:
            direction = Direction.SELL

        diff_pct = abs(last_close - last_hma) / last_hma
        confidence = min(diff_pct * 15, 1.0)
        price = float(last_close)

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"HMA({window}): close={last_close:.2f} vs HMA={last_hma:.2f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── LLT 低延迟趋势线 ──────────────────────────────────────────────────────────
# 来源: C-择时类/低延迟趋势线与交易择时/


@register
class LLTTrendlineStrategy(BaseStrategy):
    """低延迟趋势线 (Low-Lag Trendline) — IIR 数字滤波器, 相位延迟远小于传统 MA。

    公式: LLT_t = (α-α²/4)·p_t + (α²/2)·p_{t-1} - (α-3α²/4)·p_{t-2} + 2(1-α)·LLT_{t-1} - (1-α)²·LLT_{t-2}
    """

    name = "llt_trendline"
    description = "低延迟趋势线 — IIR滤波器, 相位延迟远小于传统MA, 价格突破信号"
    timeframes = ["1d"]
    params = {"alpha": 0.05}

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        alpha = self.params["alpha"]
        if len(df) < 20:
            return None

        close = df["close"].values
        n = len(close)
        llt = np.full(n, np.nan)
        # 前两个值用价格初始化
        llt[0] = close[0]
        if n > 1:
            llt[1] = close[1]

        a1 = alpha - alpha * alpha / 4.0
        a2 = alpha * alpha / 2.0
        a3 = alpha - 3.0 * alpha * alpha / 4.0
        b1 = 2.0 * (1.0 - alpha)
        b2 = (1.0 - alpha) * (1.0 - alpha)

        for t in range(2, n):
            llt[t] = (
                a1 * close[t]
                + a2 * close[t - 1]
                - a3 * close[t - 2]
                + b1 * llt[t - 1]
                - b2 * llt[t - 2]
            )

        last_close = close[-1]
        last_llt = llt[-1]
        prev_llt = llt[-2]
        if np.isnan(last_llt):
            return None

        direction = Direction.BUY if last_close > last_llt else Direction.SELL
        # 趋势加速确认
        if prev_llt and not np.isnan(prev_llt):
            momentum = (llt[-1] - llt[-5]) / abs(llt[-5]) if len(llt) >= 5 and llt[-5] != 0 else 0
        else:
            momentum = 0.0

        confidence = min(0.5 + abs(momentum) * 5, 1.0)
        price = float(last_close)

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"LLT(α={alpha}): close={last_close:.2f} vs LLT={last_llt:.2f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── FRAMA 分形自适应均线 ──────────────────────────────────────────────────────
# 来源: C-择时类/低延迟趋势线与交易择时/


@register
class FRAMAStrategy(BaseStrategy):
    """分形自适应均线 (FRAMA) — 根据价格分形维数动态调整平滑系数。

    价格趋势越强, α 越大 (跟踪更紧); 价格越震荡, α 越小 (更平滑)。
    """

    name = "frama"
    description = "分形自适应均线 — 基于分形维数动态调整平滑系数, 自适应趋势跟踪"
    timeframes = ["1d"]
    params = {"period": 20}

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        period = self.params["period"]
        if len(df) < period * 2:
            return None

        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        n = len(close)
        frama = np.full(n, np.nan)
        frama[period - 1] = close[period - 1]

        for t in range(period, n):
            hh = np.max(high[t - period : t + 1])
            ll = np.min(low[t - period : t + 1])
            if hh == ll:
                frama[t] = frama[t - 1]
                continue
            n1 = (np.max(high[t - period // 2 : t + 1]) - np.min(low[t - period // 2 : t + 1])) / (period / 2)
            n2 = (np.max(high[t - period : t - period // 2 + 1]) - np.min(low[t - period : t - period // 2 + 1])) / (period / 2)
            n3 = (hh - ll) / period
            if n1 <= 0 or n2 <= 0 or n3 <= 0:
                d = 1.0
            else:
                d = (np.log(n1 + n2) - np.log(n3)) / np.log(2)
            d = np.clip(d, 1.0, 2.0)
            alpha = np.exp(-4.6 * (d - 1.0))
            alpha = np.clip(alpha, 0.01, 0.2)
            frama[t] = alpha * close[t] + (1.0 - alpha) * frama[t - 1]

        last_close = close[-1]
        last_frama = frama[-1]
        if np.isnan(last_frama):
            return None

        direction = Direction.BUY if last_close > last_frama else Direction.SELL
        diff_pct = abs(last_close - last_frama) / last_frama
        confidence = min(diff_pct * 10, 1.0)
        price = float(last_close)

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"FRAMA({period}): close={last_close:.2f} vs FRAMA={last_frama:.2f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 指数高阶矩择时 ────────────────────────────────────────────────────────────
# 来源: C-择时类/指数高阶矩择时/


@register
class HigherMomentTimingStrategy(BaseStrategy):
    """指数高阶矩择时 — 使用收益率的高阶矩 (2-5阶) 作为先行指标, EMA 平滑后判断方向。

    高阶矩 EMA 上升 → 市场情绪变化 → BUY; 下降 → SELL。
    """

    name = "higher_moment_timing"
    description = "指数高阶矩择时 — 收益率2-5阶矩EMA平滑, 捕捉市场情绪转折"
    timeframes = ["1d"]
    params = {
        "moment_window": 20,    # 矩计算窗口
        "ema_alpha": 0.1,       # EMA 平滑系数
        "order": 4,             # 使用的高阶矩阶数 (2-5)
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["moment_window"]
        alpha = self.params["ema_alpha"]
        order = self.params["order"]
        if len(df) < window + 10:
            return None

        close = df["close"].values
        rets = np.diff(close) / close[:-1]
        n = len(rets)

        # 计算滚动高阶矩 (去均值后的 order 次方均值)
        moments = np.full(n, np.nan)
        for i in range(window - 1, n):
            seg = rets[i - window + 1 : i + 1]
            mu = np.mean(seg)
            centered = seg - mu
            moments[i] = np.mean(centered**order)

        # EMA 平滑
        ema = np.full(n, np.nan)
        first_valid = window - 1
        ema[first_valid] = moments[first_valid]
        for i in range(first_valid + 1, n):
            if not np.isnan(moments[i]):
                ema[i] = alpha * moments[i] + (1 - alpha) * ema[i - 1]
            else:
                ema[i] = ema[i - 1]

        last_ema = ema[-1]
        prev_ema = ema[-2]
        if np.isnan(last_ema) or np.isnan(prev_ema):
            return None

        direction = Direction.BUY if last_ema > prev_ema else Direction.SELL
        change = abs(last_ema - prev_ema) / (abs(prev_ema) + 1e-10)
        confidence = min(change * 5, 1.0)
        price = float(close[-1])

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"高阶矩(order={order}): EMA变化方向={'↑' if direction == Direction.BUY else '↓'}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 鳄鱼线 (Alligator) ────────────────────────────────────────────────────────
# 来源: C-择时类/基于鳄鱼线的指数择时及轮动策略/


@register
class AlligatorStrategy(BaseStrategy):
    """Bill Williams 鳄鱼线系统 — 绿线(唇)/红线(齿)/蓝线(颚)多头/空头排列信号。

    多头排列 (颚<齿<唇) → BUY; 空头排列 (颚>齿>唇) → SELL。
    """

    name = "alligator"
    description = "鳄鱼线系统 — Bill Williams三线排列 + AO动量确认"
    timeframes = ["1d"]
    params = {
        "jaw_period": 13,   # 蓝线/颚
        "teeth_period": 8,  # 红线/齿
        "lips_period": 5,   # 绿线/唇
        "jaw_lag": 8,
        "teeth_lag": 5,
        "lips_lag": 3,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        p = self.params
        if len(df) < max(p["jaw_period"], p["teeth_period"], p["lips_period"]) + max(p["jaw_lag"], p["teeth_lag"], p["lips_lag"]) + 5:
            return None

        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        n = len(close)

        jaw = _sma(close, p["jaw_period"])
        teeth = _sma(close, p["teeth_period"])
        lips = _sma(close, p["lips_period"])

        # 滞后偏移 (用滚动方式模拟 shift)
        def _lag(arr, offset):
            if offset <= 0:
                return arr
            out = np.full(len(arr), np.nan)
            out[offset:] = arr[:-offset]
            return out

        jaw_s = _lag(jaw, p["jaw_lag"])
        teeth_s = _lag(teeth, p["teeth_lag"])
        lips_s = _lag(lips, p["lips_lag"])

        # 排列判断
        last_j = jaw_s[-1]; last_t = teeth_s[-1]; last_li = lips_s[-1]
        if np.isnan(last_j) or np.isnan(last_t) or np.isnan(last_li):
            return None

        bullish_align = last_j < last_t < last_li
        bearish_align = last_j > last_t > last_li

        # AO 确认
        median = (high + low) / 2.0
        ao = _sma(median, 5) - _sma(median, 34)
        ao_last3 = ao[-3:]
        ao_rising = len(ao_last3) >= 3 and np.all(np.diff(ao_last3[~np.isnan(ao_last3)]) > 0) if np.sum(~np.isnan(ao_last3)) >= 2 else False

        if bullish_align and ao_rising:
            direction = Direction.BUY
            confidence = 0.8
        elif bearish_align:
            direction = Direction.SELL
            confidence = 0.7
        elif last_j < last_t < last_li:
            direction = Direction.BUY
            confidence = 0.5
        elif last_j > last_t > last_li:
            direction = Direction.SELL
            confidence = 0.5
        else:
            # 鳄鱼沉睡 — 无明确信号, 返回 HOLD
            return None

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=confidence,
            price=price,
            reason=f"Alligator: jaw={last_j:.2f} teeth={last_t:.2f} lips={last_li:.2f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 趋与势量化定义 ────────────────────────────────────────────────────────────
# 来源: C-择时类/趋与势的量化定义研究/


@register
class TrendQuantificationStrategy(BaseStrategy):
    """趋与势的量化定义 — 对标准化价格位移计算"趋"(方向累积)和"势"(连续波段平方和)。

    滚动窗口内的趋势得分超过上界阈值 → BUY; 低于下界阈值 → SELL。
    """

    name = "trend_quantification"
    description = "趋与势量化定义 — 价格标准化后的趋势强度得分, 专判单边行情"
    timeframes = ["1d"]
    params = {
        "trend_window": 60,     # 趋势得分滚动窗口
        "upper_pct": 0.85,      # 上轨分位数
        "lower_pct": 0.15,      # 下轨分位数
        "score_window": 20,     # 分位数计算窗口
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        tw = self.params["trend_window"]
        sw = self.params["score_window"]
        upper_pct = self.params["upper_pct"]
        lower_pct = self.params["lower_pct"]
        if len(df) < tw + sw + 10:
            return None

        close = df["close"].values
        n = len(close)

        # 标准化价格位移 (compound 方法)
        ma5 = _sma(close, 5)
        sign_mono = np.sign(np.diff(close, prepend=close[0]))
        sign_ma = np.where(close > ma5, 1, -1)
        sign_compound = (sign_mono.astype(float) + sign_ma.astype(float)) / 2.0
        displacement = np.cumsum(np.nan_to_num(sign_compound))

        # 滚动趋势得分: "势" = sum(d²) over opposite bands in window
        scores = np.full(n, np.nan)
        for i in range(tw - 1, n):
            seg = displacement[i - tw + 1 : i + 1]
            diff_seg = np.diff(seg)
            # 找到拐点 (符号变换处)
            signs = np.sign(diff_seg)
            turning = np.diff(signs, prepend=signs[0]) != 0
            # "势" = 连续同号段内位移差的平方和
            trend_score = 0.0
            start = 0
            for j in range(1, len(seg)):
                if j == len(seg) - 1 or turning[j]:
                    d = seg[j] - seg[start]
                    trend_score += d * d
                    start = j
            scores[i] = trend_score / (tw ** 1.5)

        # 滚动分位数上下轨
        last_score = scores[-1]
        if np.isnan(last_score):
            return None

        valid_scores = scores[~np.isnan(scores)]
        if len(valid_scores) < sw:
            return None
        recent = valid_scores[-sw:]
        upper = np.quantile(recent, upper_pct)
        lower = np.quantile(recent, lower_pct)

        direction = Direction.BUY if last_score > upper else (Direction.SELL if last_score < lower else None)
        if direction is None:
            return None

        range_half = (upper - lower) / 2.0 + 1e-10
        confidence = min(abs(last_score - (upper + lower) / 2.0) / range_half, 1.0)
        price = float(close[-1])

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"趋与势: score={last_score:.4f} upper={upper:.4f} lower={lower:.4f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )
