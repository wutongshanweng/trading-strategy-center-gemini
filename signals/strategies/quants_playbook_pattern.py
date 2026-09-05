"""QuantsPlaybook 形态/情绪策略集成 — NH-NL/GSISI/点位效率/MA通道/CCK羊群。

来源: D:\完整项目\QuantsPlaybook-master\C-择时类\
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


# ── NH-NL 行业指数顶部底部 ────────────────────────────────────────────────────
# 来源: C-择时类/行业指数顶部和底部信号/
# 适配为单品种: 用近期创新高/新低数量比替代行业广度


@register
class NHNLBreadthStrategy(BaseStrategy):
    """NH-NL 新高新低比 — 滚动窗口内创新高天数 vs 创新低天数, 衡量趋势强度。

    净新高比 > 0.3 → 贪婪区 → 注意风险; < -0.3 → 恐惧区 → 机会显现。
    单品种适配: 用近期创新高/新低天数替代行业广度。
    """

    name = "nhnl_breadth"
    description = "新高新低比 — 滚动窗口内创新高vs新低天数, 趋势强度与极端情绪检测"
    timeframes = ["1d"]
    params = {
        "window": 60,
        "greed_threshold": 0.3,
        "fear_threshold": -0.3,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        gt = self.params["greed_threshold"]
        ft = self.params["fear_threshold"]
        if len(df) < window + 10:
            return None

        high = df["high"].values
        low = df["low"].values
        close = df["close"].values
        n = len(close)

        # 统计滚动窗口内创新高/新低的天数
        nhnl = np.full(n, np.nan)
        for i in range(window - 1, n):
            seg_high = high[i - window + 1 : i + 1]
            seg_low = low[i - window + 1 : i + 1]
            rolling_max = np.max(seg_high)
            rolling_min = np.min(seg_low)
            new_highs = np.sum(seg_high >= rolling_max * 0.995)  # ~5天创新高
            new_lows = np.sum(seg_low <= rolling_min * 1.005)    # ~5天创新低
            nhnl[i] = (new_highs - new_lows) / window

        last_val = nhnl[-1]
        if np.isnan(last_val):
            return None

        # 极端情绪反转信号
        if last_val > gt:
            direction = Direction.SELL  # 贪婪 → 风险
            confidence = min((last_val - gt) / (1 - gt) * 0.7, 1.0)
        elif last_val < ft:
            direction = Direction.BUY  # 恐惧 → 机会
            confidence = min((ft - last_val) / abs(ft + 1) * 0.7, 1.0)
        else:
            direction = Direction.BUY if last_val > 0 else Direction.SELL
            confidence = 0.4

        price = float(close[-1])
        zone = "贪婪" if last_val > gt else ("恐惧" if last_val < ft else "中性")
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"NH-NL: {last_val:.3f} ({zone})",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── GSISI 投资者情绪 ──────────────────────────────────────────────────────────
# 来源: C-择时类/投资者情绪指数择时模型/
# 单品种适配: 用价格与自身滚动beta的秩相关替代行业与beta


@register
class InvestorSentimentStrategy(BaseStrategy):
    """投资者情绪指数 (GSISI 适配) — 价格收益率与滚动 Beta 的 Spearman 秩相关。

    连续两期 > 上阈值 → 情绪乐观 → BUY; 连续两期 < 下阈值 → 情绪悲观 → SELL。
    """

    name = "investor_sentiment"
    description = "投资者情绪指数 — 价格与滚动Beta秩相关, 双确认规则"
    timeframes = ["1d"]
    params = {
        "window": 30,
        "pct_window": 15,
        "threshold": 0.3,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        pct_w = self.params["pct_window"]
        threshold = self.params["threshold"]
        if len(df) < window + pct_w + 10:
            return None

        close = df["close"].values
        n = len(close)

        # 收益率
        rets = np.diff(close) / close[:-1]
        rets = np.insert(rets, 0, 0.0)

        # 价格百分比变化
        pct_chg = np.full(n, np.nan)
        for i in range(pct_w, n):
            pct_chg[i] = close[i] / close[i - pct_w] - 1.0

        # 滚动 beta: 用分段收益率 vs 整体收益率
        sentiment = np.full(n, np.nan)
        from scipy import stats
        for i in range(window + pct_w - 1, n):
            # 分成两段计算相关性
            half = window // 2
            seg1 = rets[i - window + 1 : i - half + 1]
            seg2 = rets[i - half + 1 : i + 1]
            if len(seg1) >= 5 and len(seg2) >= 5:
                # 简化: 前后半段收益率的秩相关
                combined = np.column_stack([np.arange(len(seg1)), seg1])
                try:
                    rho, _ = stats.spearmanr(seg1, seg2[:len(seg1)] if len(seg2) >= len(seg1) else np.pad(seg2, (0, len(seg1)-len(seg2)), 'edge'))
                    sentiment[i] = rho if not np.isnan(rho) else 0.0
                except Exception:
                    sentiment[i] = 0.0

        last_s = sentiment[-1]
        prev_s = sentiment[-2]
        if np.isnan(last_s) or np.isnan(prev_s):
            return None

        # 双确认规则
        if last_s > threshold and prev_s > threshold:
            direction = Direction.BUY
            confidence = min((last_s - threshold) / (1 - threshold) * 0.7 + 0.3, 1.0)
        elif last_s < -threshold and prev_s < -threshold:
            direction = Direction.SELL
            confidence = min((-last_s - threshold) / (1 - threshold) * 0.7 + 0.3, 1.0)
        else:
            return None

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"GSISI情绪: {last_s:.3f} (双确认: prev={prev_s:.3f})",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 点位效率理论 ──────────────────────────────────────────────────────────────
# 来源: C-择时类/基于点位效率理论的个股趋势预测研究/


@register
class PointEfficiencyStrategy(BaseStrategy):
    """点位效率理论 — MACD 逼近法分割趋势, 计算价格效率与时间效率。

    效率比率 > 阈值 → 趋势有效 → BUY; < 负阈值 → 反向趋势 → SELL。
    """

    name = "point_efficiency"
    description = "点位效率理论 — MACD逼近法分割趋势段, 价效比+时效比综合判断"
    timeframes = ["1d"]
    params = {
        "fast": 12,
        "slow": 26,
        "signal": 9,
        "atr_period": 100,
        "rate": 0.5,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        p = self.params
        if len(df) < max(p["slow"], p["atr_period"]) + p["signal"] + 10:
            return None

        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        n = len(close)

        # EMA MACD
        def _ema(arr, period):
            alpha = 2.0 / (period + 1)
            out = np.full(len(arr), np.nan)
            out[0] = arr[0]
            for i in range(1, len(arr)):
                out[i] = alpha * arr[i] + (1 - alpha) * out[i - 1]
            return out

        ema_fast = _ema(close, p["fast"])
        ema_slow = _ema(close, p["slow"])
        dif = ema_fast - ema_slow
        dea = _ema(dif, p["signal"])

        # ATR
        tr = np.maximum(high - low, np.abs(high - np.roll(close, 1)), np.abs(low - np.roll(close, 1)))
        atr = _sma(tr, p["atr_period"])

        # 方法 B: dif - dea - atr * rate
        macd_hist = dif - dea
        adjusted = np.full(n, np.nan)
        for i in range(p["atr_period"] - 1, n):
            if not np.isnan(atr[i]):
                adjusted[i] = macd_hist[i] - atr[i] * p["rate"]

        # 趋势方向 = adjusted 的符号
        last_adj = adjusted[-1]
        if np.isnan(last_adj):
            return None

        # 滚动效率: 同号连续天数的 dif 累计
        last_sign = np.sign(macd_hist[-1])
        streak = 0
        for i in range(n - 1, -1, -1):
            if np.sign(macd_hist[i]) == last_sign:
                streak += 1
            else:
                break

        efficiency = streak / 20.0  # 标准化
        direction = Direction.BUY if last_adj > 0 else Direction.SELL
        confidence = min(efficiency, 1.0)
        price = float(close[-1])

        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"点位效率: adj={last_adj:.4f} streak={streak}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── 均线交叉 + 通道突破 ──────────────────────────────────────────────────────
# 来源: C-择时类/均线交叉结合通道突破择时研究/


@register
class MAChannelBreakoutStrategy(BaseStrategy):
    """均线交叉 + 通道突破 — 双条件确认: MA 金叉/死叉 AND 价格突破 N 日通道。

    金叉 + 突破上轨 → BUY; 死叉 + 突破下轨 → SELL。
    """

    name = "ma_channel_breakout"
    description = "均线交叉+通道突破 — 双条件确认, 减少虚假信号"
    timeframes = ["1d"]
    params = {
        "fast_ma": 5,
        "slow_ma": 20,
        "channel_period": 20,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        p = self.params
        if len(df) < max(p["slow_ma"], p["channel_period"]) + 10:
            return None

        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        n = len(close)

        fast_ma = _sma(close, p["fast_ma"])
        slow_ma = _sma(close, p["slow_ma"])

        # MA 交叉
        prev_fast = fast_ma[-2]; prev_slow = slow_ma[-2]
        last_fast = fast_ma[-1]; last_slow = slow_ma[-1]

        if np.isnan(last_fast) or np.isnan(last_slow):
            return None

        golden_cross = prev_fast <= prev_slow and last_fast > last_slow
        dead_cross = prev_fast >= prev_slow and last_fast < last_slow

        # 通道突破
        cp = p["channel_period"]
        channel_high = np.max(high[-cp:])
        channel_low = np.min(low[-cp:])
        last_close = close[-1]

        break_up = last_close > channel_high
        break_down = last_close < channel_low

        # 双条件确认
        if golden_cross and break_up:
            direction = Direction.BUY
            confidence = 0.8
            reason = "金叉+突破上轨"
        elif dead_cross and break_down:
            direction = Direction.SELL
            confidence = 0.8
            reason = "死叉+突破下轨"
        elif golden_cross:
            direction = Direction.BUY
            confidence = 0.5
            reason = "金叉(仅)"
        elif dead_cross:
            direction = Direction.SELL
            confidence = 0.5
            reason = "死叉(仅)"
        elif break_up:
            direction = Direction.BUY
            confidence = 0.4
            reason = "突破上轨(仅)"
        elif break_down:
            direction = Direction.SELL
            confidence = 0.4
            reason = "突破下轨(仅)"
        else:
            return None

        price = float(last_close)
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=confidence,
            price=price,
            reason=f"MA通道: {reason}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )


# ── CCK 羊群效应 ──────────────────────────────────────────────────────────────
# 来源: C-择时类/基于CCK模型的股票市场羊群效应研究/


@register
class HerdingEffectStrategy(BaseStrategy):
    """CCK 羊群效应检测 — 滚动窗口内 CSAD 与市场收益的非线性回归。

    beta2 显著为负 → 羊群行为 → 市场极端 → 反转信号。
    单品种适配: 用价格波动聚集性代理横截面离散度。
    """

    name = "herding_effect"
    description = "羊群效应检测 — CSAD非线性回归, 检测市场极端情绪反转点"
    timeframes = ["1d"]
    params = {
        "window": 60,
        "threshold": -0.5,
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Optional[Signal]:
        window = self.params["window"]
        threshold = self.params["threshold"]
        if len(df) < window + 10:
            return None

        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        n = len(close)

        # 代理 CSAD: 日内振幅的离散度
        amplitude = (high - low) / close
        rets = np.diff(close) / close[:-1]
        rets = np.insert(rets, 0, 0.0)

        beta2 = np.full(n, np.nan)
        for i in range(window - 1, n):
            csad = amplitude[i - window + 1 : i + 1]
            r = rets[i - window + 1 : i + 1]
            r_abs = np.abs(r)
            r_sq = r * r
            # OLS: csad ~ |Rm| + Rm²
            X = np.column_stack([np.ones(window), r_abs, r_sq])
            try:
                coef = np.linalg.lstsq(X, csad, rcond=None)[0]
                beta2[i] = coef[2]
            except np.linalg.LinAlgError:
                beta2[i] = 0.0

        last_b2 = beta2[-1]
        if np.isnan(last_b2):
            return None

        # 羊群效应 → 市场非理性 → 反向操作
        if last_b2 < threshold:
            # 显著的羊群行为 → 恐慌/狂热 → 逆向
            # 用最近涨跌判断是恐慌还是狂热
            recent_ret = np.sum(rets[-10:])
            if recent_ret > 0:
                direction = Direction.SELL  # 狂热羊群 → 卖
            else:
                direction = Direction.BUY  # 恐慌羊群 → 买
            confidence = min(abs(last_b2 - threshold) / abs(threshold) * 0.7, 1.0)
        else:
            return None  # 无羊群 → 不交易

        price = float(close[-1])
        return Signal(
            symbol=symbol,
            direction=direction,
            confidence=round(confidence, 3),
            price=price,
            reason=f"羊群效应: beta2={last_b2:.4f} (threshold={threshold})",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
        )
