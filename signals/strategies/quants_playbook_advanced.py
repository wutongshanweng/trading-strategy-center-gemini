"""QuantsPlaybook 高级策略集成 — 扩散指标/时变夏普/小波SVM/特征分布/聪明钱。

来源: D:\完整项目\QuantsPlaybook-master\
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Direction, Signal
from signals.registry import register


def _sma(arr: np.ndarray, window: int) -> np.ndarray:
    out = np.full(len(arr), np.nan)
    if len(arr) >= window:
        cs = np.cumsum(np.insert(arr, 0, 0.0))
        out[window - 1 :] = (cs[window:] - cs[:-window]) / window
    return out


def _ema(arr: np.ndarray, period: int) -> np.ndarray:
    alpha = 2.0 / (period + 1)
    out = np.full(len(arr), np.nan)
    out[0] = arr[0]
    for i in range(1, len(arr)):
        out[i] = alpha * arr[i] + (1 - alpha) * out[i - 1]
    return out


# ── 扩散指标 (Breadth/Diffusion Indicator) ────────────────────────────────────
# 来源: C-择时类/扩散指标/
# 单品种适配: 多个技术条件满足比例替代成分股比例


@register
class DiffusionIndicatorStrategy(BaseStrategy):
    """扩散指标 — 多个技术条件同时满足的比例, 双均线交叉生成信号。

    MA 快线 > MA 慢线 + 更多的条件满足 → 市场扩散向好 → BUY。
    """

    name = "diffusion_indicator"
    description = "扩散指标 — 多条件满足比例, 衡量趋势扩散/收敛程度"
    timeframes = ["1d"]
    params = {
        "fast_ma": 20,
        "slow_ma": 60,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        p = self.params
        if len(df) < p["slow_ma"] + 30:
            return None

        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        volume = df["volume"].values
        n = len(close)

        # 5个技术条件
        cond1 = close > _sma(close, 20)           # 价格 > MA20
        cond2 = close > _sma(close, 60)           # 价格 > MA60
        cond3 = np.diff(close, prepend=close[0]) > 0  # 今日上涨 vs 昨收
        cond4 = volume > _sma(volume, 20)         # 放量
        cond5 = high > np.max(high[-20:]) * 0.98  # 接近新高

        # 扩散比例
        diffusion = np.full(n, np.nan)
        for i in range(60, n):
            score = (
                cond1[i] + cond2[i] + cond3[i] + cond4[i] + cond5[i]
            )
            diffusion[i] = score / 5.0

        fast_ma = _sma(diffusion, p["fast_ma"])
        slow_ma = _sma(diffusion, p["slow_ma"])

        last_fast = fast_ma[-1]; last_slow = slow_ma[-1]
        prev_fast = fast_ma[-2]; prev_slow = slow_ma[-2]
        if np.isnan(last_fast) or np.isnan(last_slow):
            return None

        cross_up = prev_fast <= prev_slow and last_fast > last_slow
        cross_down = prev_fast >= prev_slow and last_fast < last_slow

        if cross_up:
            direction = Direction.BUY
            confidence = 0.7
        elif cross_down:
            direction = Direction.SELL
            confidence = 0.7
        elif last_fast > last_slow:
            direction = Direction.BUY
            confidence = 0.5
        elif last_fast < last_slow:
            direction = Direction.SELL
            confidence = 0.5
        else:
            return None

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=confidence,
            price=price,
            reason=f"扩散指标: diffusion={diffusion[-1]:.2f} fast={last_fast:.3f} slow={last_slow:.3f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 时变夏普 ──────────────────────────────────────────────────────────────────
# 来源: C-择时类/时变夏普/


@register
class TimeVaryingSharpeStrategy(BaseStrategy):
    """时变夏普比率 — 滚动窗口直接估计预期夏普, 高夏普预示好行情。

    滚动夏普 > 上阈值 → BUY; < 下阈值 → SELL。
    """

    name = "time_varying_sharpe"
    description = "时变夏普 — 滚动窗口夏普比率, 捕捉市场风险调整收益变化"
    timeframes = ["1d"]
    params = {
        "window": 40,
        "upper_threshold": 0.5,
        "lower_threshold": -0.5,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        upper = self.params["upper_threshold"]
        lower = self.params["lower_threshold"]
        if len(df) < window + 10:
            return None

        close = df["close"].values
        rets = np.diff(close) / close[:-1]
        rets = np.insert(rets, 0, 0.0)
        n = len(rets)

        sharpe = np.full(n, np.nan)
        for i in range(window - 1, n):
            seg = rets[i - window + 1 : i + 1]
            mu = np.mean(seg)
            std = np.std(seg)
            sharpe[i] = mu / std * np.sqrt(252) if std > 0 else 0.0

        last_sharpe = sharpe[-1]
        if np.isnan(last_sharpe):
            return None

        if last_sharpe > upper:
            direction = Direction.BUY
            confidence = min(0.5 + (last_sharpe - upper) * 0.3, 1.0)
        elif last_sharpe < lower:
            direction = Direction.SELL
            confidence = min(0.5 + (lower - last_sharpe) * 0.3, 1.0)
        else:
            return None

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"时变夏普: {last_sharpe:.3f} (window={window})",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 小波降噪 ──────────────────────────────────────────────────────────────────
# 来源: C-择时类/小波分析/


@register
class WaveletDenoiseStrategy(BaseStrategy):
    """小波降噪择时 — 对价格序列小波阈值降噪后判断趋势方向。

    降噪后价格上升 → BUY; 下降 → SELL。
    pywt 不可用时自动降级为简单 SMA 平滑。
    """

    name = "wavelet_denoise"
    description = "小波降噪择时 — 小波阈值去噪, 提取价格主趋势"
    timeframes = ["1d"]
    params = {
        "wavelet": "db4",
        "level": 3,
        "window": 50,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        if len(df) < window + 10:
            return None

        close = df["close"].values
        n = len(close)
        denoised = np.full(n, np.nan)

        try:
            import pywt

            # 对最近 window 个价格做小波降噪
            for i in range(window - 1, n):
                seg = close[i - window + 1 : i + 1]
                coeffs = pywt.wavedec(seg, self.params["wavelet"], level=self.params["level"])
                # 软阈值去噪
                sigma = np.median(np.abs(coeffs[-1])) / 0.6745
                threshold = sigma * np.sqrt(2 * np.log(window))
                coeffs_thresh = [coeffs[0]]  # 保持近似系数
                for c in coeffs[1:]:
                    c_thresh = pywt.threshold(c, threshold, mode="soft")
                    coeffs_thresh.append(c_thresh)
                reconstructed = pywt.waverec(coeffs_thresh, self.params["wavelet"])
                denoised[i] = reconstructed[-1] if len(reconstructed) >= window else reconstructed[-1]
        except ImportError:
            # pywt 不可用 → 降级为 SMA
            sma = _sma(close, 10)
            denoised = sma

        last_close = close[-1]
        last_denoised = denoised[-1]
        prev_denoised = denoised[-2]
        if np.isnan(last_denoised) or np.isnan(prev_denoised):
            return None

        direction = Direction.BUY if last_denoised > prev_denoised else Direction.SELL
        diff_pct = abs(last_denoised - prev_denoised) / (abs(prev_denoised) + 1e-10)
        confidence = min(diff_pct * 20, 1.0)
        price = float(last_close)

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"小波降噪: denoised={last_denoised:.2f} direction={'↑' if direction == Direction.BUY else '↓'}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 特征分布建模 (一) — 席位资金流 ─────────────────────────────────────────────
# 来源: C-择时类/特征分布建模择时/


@register
class InstitutionalMoneyFlowStrategy(BaseStrategy):
    """机构资金流 — 用大单/特大单估算机构资金净流向。

    机构资金连续净流入 → BUY; 连续净流出 → SELL。
    无龙虎榜数据时用大成交量日的方向加权代理。
    """

    name = "institutional_money_flow"
    description = "机构资金流 — 大单方向加权, 估算主力资金动向"
    timeframes = ["1d"]
    params = {
        "lookback": 5,
        "volume_threshold": 0.7,  # 大单成交量分位阈值
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        lookback = self.params["lookback"]
        vol_th = self.params["volume_threshold"]
        if len(df) < lookback + 20:
            return None

        close = df["close"].values
        volume = df["volume"].values
        n = len(close)

        # 代理: 成交量大于阈值分位的日子的方向加权净流量
        net_flow = np.full(n, np.nan)
        for i in range(20, n):
            seg_vol = volume[i - 20 : i + 1]
            cutoff = np.quantile(seg_vol, vol_th)
            big_days = np.where(volume[i - lookback : i + 1] > cutoff)[0]
            if len(big_days) > 0:
                idx_start = i - lookback
                flows = []
                for d in big_days:
                    real_idx = idx_start + d
                    if real_idx > 0:
                        ret = (close[real_idx] - close[real_idx - 1]) / close[real_idx - 1]
                        flows.append(np.sign(ret) * volume[real_idx])
                net_flow[i] = np.sum(flows) / (np.sum(volume[idx_start:i + 1]) + 1)

        last_nf = net_flow[-1]
        prev_nf = net_flow[-2]
        if np.isnan(last_nf) or np.isnan(prev_nf):
            return None

        if last_nf > 0 and prev_nf > 0:
            direction = Direction.BUY
            confidence = min(last_nf * 5, 1.0)
        elif last_nf < 0 and prev_nf < 0:
            direction = Direction.SELL
            confidence = min(abs(last_nf) * 5, 1.0)
        else:
            return None

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"机构资金流: net_flow={last_nf:.4f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 聪明钱因子 v2.0 ────────────────────────────────────────────────────────────
# 来源: B-因子构建类/聪明钱因子模型的2.0版本/


@register
class SmartMoneyStrategy(BaseStrategy):
    """聪明钱因子 v2.0 — 基于分钟线逻辑的日线近似: 开盘买入力量 vs 尾盘卖出力量。

    聪明钱指标 > 0 → 主力做多 → BUY; < 0 → 主力出逃 → SELL。
    """

    name = "smart_money"
    description = "聪明钱因子v2.0 — 开盘/尾盘价格变化衡量主力意图"
    timeframes = ["1d"]
    params = {
        "window": 10,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        if len(df) < window + 5:
            return None

        open_ = df["open"].values
        high = df["high"].values
        low = df["low"].values
        close = df["close"].values
        n = len(close)

        # 聪明钱指标: (开盘价相对前收的方向) - (尾盘回落幅度)
        # 简化近似: 开盘跳空方向 + 日内走势方向
        gap = (open_ - np.roll(close, 1)) / np.roll(close, 1)
        intraday = (close - open_) / open_
        smart = gap + intraday * 0.5  # 开盘权重更高

        smart_ma = _sma(smart, window)

        last_sm = smart_ma[-1]
        if np.isnan(last_sm):
            return None

        direction = Direction.BUY if last_sm > 0 else Direction.SELL
        confidence = min(abs(last_sm) * 20, 1.0)
        price = float(close[-1])

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"聪明钱: indicator={last_sm:.4f}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 振幅因子隐藏结构 ──────────────────────────────────────────────────────────
# 来源: B-因子构建类/振幅因子的隐藏结构/


@register
class AmplitudeHiddenStructureStrategy(BaseStrategy):
    """振幅因子隐藏结构 — 高振幅 vs 低振幅日的跟随效应。

    近期振幅上升 + 价格上涨 → 强势突破 → BUY。
    近期振幅上升 + 价格下跌 → 恐慌抛售 → SELL。
    """

    name = "amplitude_structure"
    description = "振幅隐藏结构 — 振幅变化趋势 + 价格方向的联合信号"
    timeframes = ["1d"]
    params = {
        "window": 20,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        if len(df) < window + 5:
            return None

        high = df["high"].values
        low = df["low"].values
        close = df["close"].values
        n = len(close)

        amplitude = (high - low) / close
        amp_ma = _sma(amplitude, window)
        amp_trend = np.diff(amp_ma[-5:]).mean() if len(amp_ma) >= 5 else 0.0

        price_dir = np.sign(np.diff(close[-3:]).mean())

        if amp_trend > 0 and price_dir > 0:
            direction = Direction.BUY
            confidence = 0.7
            reason = "振幅扩大+价格上涨"
        elif amp_trend > 0 and price_dir < 0:
            direction = Direction.SELL
            confidence = 0.7
            reason = "振幅扩大+价格下跌"
        elif amp_trend < 0 and price_dir > 0:
            direction = Direction.BUY
            confidence = 0.4
            reason = "振幅收缩+价格上涨"
        elif amp_trend < 0 and price_dir < 0:
            direction = Direction.SELL
            confidence = 0.4
            reason = "振幅收缩+价格下跌"
        else:
            return None

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=confidence,
            price=price,
            reason=f"振幅结构: {reason}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 均线收敛发散形态识别 ─────────────────────────────────────────────────────
# 来源: B-因子构建类/开源证券-均线的收敛与发散/


@register
class MAConvergenceDivergenceStrategy(BaseStrategy):
    """均线收敛发散 — 多周期均线离散度, 收敛预示突破, 发散确认趋势。

    均线从收敛 (离散度低) 转向发散 (离散度扩大) → 趋势启动信号。
    """

    name = "ma_convergence_divergence"
    description = "均线收敛发散 — 多周期MA离散度, 收敛→突破预警"
    timeframes = ["1d"]
    params = {
        "ma_periods": [5, 10, 20, 60],
        "converge_threshold": 0.02,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        periods = self.params["ma_periods"]
        converge_th = self.params["converge_threshold"]
        if len(df) < max(periods) + 10:
            return None

        close = df["close"].values
        n = len(close)

        mas = np.column_stack([_sma(close, p) for p in periods])

        # 离散度 = 均线之间的 std / 价格
        dispersion = np.full(n, np.nan)
        for i in range(max(periods) - 1, n):
            valid_mas = mas[i][~np.isnan(mas[i])]
            if len(valid_mas) >= 2:
                dispersion[i] = np.std(valid_mas) / close[i]

        # 离散度变化
        last_disp = dispersion[-1]
        prev_disp = dispersion[-5] if len(dispersion) >= 5 else dispersion[-2]
        if np.isnan(last_disp) or np.isnan(prev_disp):
            return None

        price_dir = np.sign(close[-1] - close[-5])

        # 收敛中 → 可能突破
        converging = last_disp < converge_th
        expanding = last_disp > prev_disp * 1.2

        if expanding and price_dir > 0:
            direction = Direction.BUY
            confidence = 0.6
            reason = "发散+上涨"
        elif expanding and price_dir < 0:
            direction = Direction.SELL
            confidence = 0.6
            reason = "发散+下跌"
        elif converging:
            return None  # 收敛中不交易
        elif price_dir > 0:
            direction = Direction.BUY
            confidence = 0.3
            reason = "弱趋势上涨"
        else:
            direction = Direction.SELL
            confidence = 0.3
            reason = "弱趋势下跌"

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=confidence,
            price=price,
            reason=f"MA收敛发散: dispersion={last_disp:.4f} {reason}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )
