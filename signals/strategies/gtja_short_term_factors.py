"""国泰君安短周期价量因子策略。

基于《国泰君安-基于短周期价量特征的多因子选股体系》研报中的高效因子。
参考因子：https://www.gtjas.com

正向因子（多头信号）：
  F83 (IR=0.74): (-1 * COVIANCE(RANK(HIGH), RANK(VOLUME), 5))
  F99 (IR=0.73): (-1 * RANK(COVIANCE(RANK(CLOSE), RANK(VOLUME), 5)))
  F62 (IR=0.66): (-1 * CORR(HIGH, RANK(VOLUME), 5))
  F90 (IR=0.66): (RANK(CORR(RANK(VWAP), RANK(VOLUME), 5)) * -1)
  F32 (IR=0.66): (-1 * SUM(RANK(CORR(RANK(HIGH), RANK(VOLUME), 3)), 3))
  F16 (IR=0.66): (-1 * TSMAX(RANK(CORR(RANK(VOLUME), RANK(VWAP), 5)), 5))

负向因子（空头信号/反向信号）：
  F176: CORR(RANK(((CLOSE - TSMIN(LOW, 12)) / (TSMAX(HIGH, 12) - TSMIN(LOW,12)))), RANK(VOLUME), 6)
  F74: (RANK(CORR(SUM(((LOW * 0.35) + (VWAP * 0.65)), 20), SUM(MEAN(VOLUME,40), 20), 7)) + RANK(CORR(RANK(VWAP), RANK(VOLUME), 6)))
  F70: STD(AMOUNT,6)
  F150: (CLOSE+HIGH+LOW)/3*VOLUME
  F179: (RANK(CORR(VWAP, VOLUME, 4)) * RANK(CORR(RANK(LOW), RANK(MEAN(VOLUME,50)), 12)))
  F36: RANK(SUM(CORR(RANK(VOLUME), RANK(VWAP)), 6), 2)
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from signals.base import BaseStrategy, Signal, Direction
from signals.registry import register


def _rank(x: pd.Series) -> pd.Series:
    """Cross-sectional rank."""
    return x.rank(pct=True, axis=0)


def _ts_sum(x: pd.Series, n: int) -> pd.Series:
    return x.rolling(n, min_periods=1).sum()


def _ts_mean(x: pd.Series, n: int) -> pd.Series:
    return x.rolling(n, min_periods=1).mean()


def _ts_max(x: pd.Series, n: int) -> pd.Series:
    return x.rolling(n, min_periods=1).max()


def _ts_min(x: pd.Series, n: int) -> pd.Series:
    return x.rolling(n, min_periods=1).min()


def _delay(x: pd.Series, d: int) -> pd.Series:
    return x.shift(d)


def _delta(x: pd.Series, d: int) -> pd.Series:
    return x.diff(d)


def _ts_rank(x: pd.Series, n: int) -> pd.Series:
    """Rolling ts_rank."""
    return x.rolling(n, min_periods=1).apply(lambda arr: arr[-1] if len(arr) > 0 else np.nan, raw=False)


def _std(x: pd.Series, n: int) -> pd.Series:
    return x.rolling(n, min_periods=1).std(ddof=0)


def _cov(x: pd.Series, y: pd.Series, n: int) -> pd.Series:
    return x.rolling(n, min_periods=1).cov(y)


def _corr(x: pd.Series, y: pd.Series, n: int) -> pd.Series:
    return x.rolling(n, min_periods=1).corr(y)


def _ts_cov(x: pd.Series, y: pd.Series, n: int) -> pd.Series:
    return _cov(x, y, n)


def _decay_linear(series: pd.Series, window: int) -> pd.Series:
    """Linear weighted moving average."""
    weights = np.arange(1, window + 1)
    def weighted_mean(arr):
        if len(arr) < window or np.any(np.isnan(arr)):
            return np.nan
        return np.nansum(arr * weights) / np.nansum(weights)
    return series.rolling(window, min_periods=1).apply(weighted_mean, raw=True)


def _scale(x: pd.Series, k: float = 1.0) -> pd.Series:
    """Scale to have sum of abs = k."""
    s = x.abs().sum()
    if s == 0 or np.isnan(s):
        return x * 0
    return x * (k / s)


def compute_alphas(df: pd.DataFrame) -> dict:
    """计算所有GTJA Alpha因子。

    Args:
        df: 必须包含 high, low, close, open, volume, vwap 列

    Returns:
        dict: {因子名: pd.Series}
    """
    high = df["high"]
    low = df["low"]
    close = df["close"]
    open_ = df["open"]
    volume = df["volume"]
    vwap = df["vwap"]

    # 计算基础量
    adv20 = _ts_mean(volume, 20)
    adv40 = _ts_mean(volume, 40)
    adv50 = _ts_mean(volume, 50)

    results = {}

    # ===== 正向因子 (多头信号) =====

    # Alpha083 (IR=0.74): (-1 * COVIANCE(RANK(HIGH), RANK(VOLUME), 5))
    results["alpha083"] = -1 * _ts_cov(_rank(high), _rank(volume), 5)

    # Alpha099 (IR=0.73): (-1 * RANK(COVIANCE(RANK(CLOSE), RANK(VOLUME), 5)))
    results["alpha099"] = -1 * _rank(_ts_cov(_rank(close), _rank(volume), 5))

    # Alpha062 (IR=0.66): (-1 * CORR(HIGH, RANK(VOLUME), 5))
    results["alpha062"] = -1 * _corr(high, _rank(volume), 5)

    # Alpha090 (IR=0.66): (RANK(CORR(RANK(VWAP), RANK(VOLUME), 5)) * -1)
    results["alpha090"] = -1 * _rank(_corr(_rank(vwap), _rank(volume), 5))

    # Alpha032 (IR=0.66): (-1 * SUM(RANK(CORR(RANK(HIGH), RANK(VOLUME), 3)), 3))
    results["alpha032"] = -1 * _ts_sum(_rank(_corr(_rank(high), _rank(volume), 3)), 3)

    # Alpha016 (IR=0.66): (-1 * TSMAX(RANK(CORR(RANK(VOLUME), RANK(VWAP), 5)), 5))
    results["alpha016"] = -1 * _ts_max(_rank(_corr(_rank(volume), _rank(vwap), 5)), 5)

    # ===== 负向因子 (空头/反向信号) =====

    # Alpha176: CORR(RANK(((CLOSE - TSMIN(LOW, 12)) / (TSMAX(HIGH, 12) - TSMIN(LOW,12)))), RANK(VOLUME), 6)
    price_pos = (close - _ts_min(low, 12)) / (_ts_max(high, 12) - _ts_min(low, 12) + 1e-9)
    results["alpha176"] = _corr(_rank(price_pos), _rank(volume), 6)

    # Alpha074: RANK(CORR(SUM(((LOW * 0.35) + (VWAP * 0.65)), 20), SUM(MEAN(VOLUME,40), 20), 7)) + RANK(CORR(RANK(VWAP), RANK(VOLUME), 6))
    blended = low * 0.35 + vwap * 0.65
    vol40_mean = _ts_mean(volume, 40)
    part1 = _rank(_corr(_ts_sum(blended, 20), _ts_sum(vol40_mean, 20), 7))
    part2 = _rank(_corr(_rank(vwap), _rank(volume), 6))
    results["alpha074"] = part1 + part2

    # Alpha070 (STD AMOUNT): STD(AMOUNT,6)
    amount = close * volume
    results["alpha070"] = _std(amount, 6)

    # Alpha150: (CLOSE+HIGH+LOW)/3*VOLUME
    typical = (close + high + low) / 3
    results["alpha150"] = typical * volume

    # Alpha179: RANK(CORR(VWAP, VOLUME, 4)) * RANK(CORR(RANK(LOW), RANK(MEAN(VOLUME,50)), 12))
    corr1 = _rank(_corr(vwap, volume, 4))
    corr2 = _rank(_corr(_rank(low), _rank(adv50), 12))
    results["alpha179"] = corr1 * corr2

    # Alpha036: RANK(SUM(CORR(RANK(VOLUME), RANK(VWAP)), 6), 2)
    # Note: ts_rank on a sum, takes top 2nd element (rank=2)
    corr_vol_vwap = _corr(_rank(volume), _rank(vwap), 6)
    results["alpha036"] = _rank(_ts_sum(corr_vol_vwap, 6))

    return results


@register
class GTJAShortTermFactors(BaseStrategy):
    """国泰君安短周期价量因子策略。

    综合使用研报中的高效正向因子（多头）和负向因子（空头）。
    信号逻辑：
    - 计算各因子截面排名
    - 正向因子高分 -> BUY
    - 负向因子高分 -> SELL (反向信号)
    - 综合评分给出最终信号
    """
    name = "gtja_short_term_factors"
    description = "国泰君安短周期价量因子策略（多空信号）"
    timeframes = ["1d"]
    params = {
        "pos_thresh": 0.65,    # 正向因子综合阈值 (0-1)
        "neg_thresh": 0.65,    # 负向因子综合阈值 (0-1)
        "conf_boost": 1.2,     # 置信度增强系数
    }

    def compute(self, df: pd.DataFrame, symbol: str = "") -> Signal | None:
        """计算策略信号。

        Args:
            df: K线数据，包含 high, low, close, open, volume, vwap
            symbol: 合约代码

        Returns:
            Signal: 交易信号
        """
        if len(df) < 60:
            return None

        required = ["high", "low", "close", "open", "volume", "vwap"]
        if not all(c in df.columns for c in required):
            return None

        try:
            alphas = compute_alphas(df)
        except Exception:
            return None

        if not alphas:
            return None

        # 提取最新截面因子值
        latest = {}
        for name, series in alphas.items():
            if len(series) > 0 and not pd.isna(series.iloc[-1]):
                latest[name] = series.iloc[-1]

        if len(latest) < 6:
            return None

        # 正向因子 (值越高越好)
        pos_factors = ["alpha083", "alpha099", "alpha062", "alpha090", "alpha032", "alpha016"]
        # 负向因子 (值越高越差 / 反向信号)
        neg_factors = ["alpha176", "alpha074", "alpha070", "alpha150", "alpha179", "alpha036"]

        pos_scores = [latest[f] for f in pos_factors if f in latest]
        neg_scores = [latest[f] for f in neg_factors if f in latest]

        if not pos_scores or not neg_scores:
            return None

        # 标准化分数
        pos_avg = np.mean(pos_scores)
        neg_avg = np.mean(neg_scores)

        cv = float(df["close"].iloc[-1])
        thresh = self.params

        # 多头信号: 正向因子强 + 负向因子弱
        buy_conf = min(pos_avg * thresh["conf_boost"], 1.0)
        sell_conf = min(neg_avg * thresh["conf_boost"], 1.0)

        reason_parts = []
        if pos_avg > 0:
            reason_parts.append(f"正因子均值={pos_avg:.4f}")
        if neg_avg > 0:
            reason_parts.append(f"负因子均值={neg_avg:.4f}")

        reason = ", ".join(reason_parts) if reason_parts else "GTJA短周期因子"

        # 决定信号方向
        if buy_conf > thresh["pos_thresh"] and sell_conf < thresh["neg_thresh"] * 0.8:
            return Signal(
                symbol=symbol,
                direction=Direction.BUY,
                confidence=buy_conf,
                score=pos_avg,
                price=cv,
                reason=f"GTJA多头: {reason}",
                strategy_name=self.name,
                timeframe=self.timeframes[0],
                extra={"pos_avg": pos_avg, "neg_avg": neg_avg, "factors": latest}
            )
        elif sell_conf > thresh["neg_thresh"] and buy_conf < thresh["pos_thresh"] * 0.8:
            return Signal(
                symbol=symbol,
                direction=Direction.SELL,
                confidence=sell_conf,
                score=neg_avg,
                price=cv,
                reason=f"GTJA空头: {reason}",
                strategy_name=self.name,
                timeframe=self.timeframes[0],
                extra={"pos_avg": pos_avg, "neg_avg": neg_avg, "factors": latest}
            )

        return Signal(
            symbol=symbol,
            direction=Direction.HOLD,
            confidence=0.0,
            price=cv,
            reason=f"GTJA中性: {reason}",
            strategy_name=self.name,
            timeframe=self.timeframes[0],
            extra={"pos_avg": pos_avg, "neg_avg": neg_avg, "factors": latest}
        )
