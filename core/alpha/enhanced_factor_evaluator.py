"""
EnhancedFactorEvaluator — 增强版因子评估器。

新增功能:
  - 条件 IC: 按市场状态/板块/波动率分组计算 IC
  - 因子衰减: IC 随时间/品种的变化
  - 多维度报告: 年度/品种/市场状态条件 IC
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

import numpy as np
import pandas as pd


class MarketRegime(str, Enum):
    TREND_UP = "trend_up"
    TREND_DOWN = "trend_down"
    RANGING = "ranging"
    HIGH_VOL = "high_vol"
    LOW_VOL = "low_vol"


class FactorDecayAnalysis:
    """因子衰减分析。"""

    def __init__(self, factor_values: pd.Series, forward_returns: pd.Series):
        self.factor = factor_values
        self.returns = forward_returns
        self.decay_matrix: Optional[pd.DataFrame] = None
        self.decay_by_period: Optional[pd.Series] = None

    def compute_decay_matrix(self, max_periods: int = 10) -> pd.DataFrame:
        """计算因子在不同持有期的 IC 衰减矩阵。"""
        rows = []
        for period in range(1, max_periods + 1):
            shifted_returns = self.returns.shift(-period)
            aligned = pd.concat([self.factor, shifted_returns], axis=1).dropna()
            if len(aligned) > 10:
                ic = aligned.iloc[:, 0].corr(aligned.iloc[:, 1])
                rows.append({"period": period, "ic": ic, "abs_ic": abs(ic)})
        self.decay_matrix = pd.DataFrame(rows).set_index("period")
        return self.decay_matrix

    def compute_decay_by_lookback(self, windows: List[int] = None) -> pd.Series:
        """计算不同回溯期的因子 IC 衰减。"""
        if windows is None:
            windows = [5, 10, 20, 30, 60, 120]
        results = []
        for w in windows:
            factor_window = self.factor.rolling(w).mean()
            aligned = pd.concat([factor_window, self.returns], axis=1).dropna()
            if len(aligned) > 10:
                ic = aligned.iloc[:, 0].corr(aligned.iloc[:, 1])
                results.append({"lookback": w, "ic": ic})
        self.decay_by_period = pd.DataFrame(results).set_index("lookback")["ic"]
        return self.decay_by_period

    def to_dict(self) -> dict:
        return {
            "decay_matrix": self.decay_matrix.to_dict() if self.decay_matrix is not None else {},
            "decay_by_lookback": self.decay_by_period.to_dict() if self.decay_by_period is not None else {},
        }


@dataclass
class ConditionalICResult:
    """条件 IC 结果。"""
    condition: str
    ic_mean: float
    ic_count: int
    ic_std: float = 0.0
    ir: float = 0.0
    hit_rate: float = 0.0  # IC > 0 的比例


@dataclass
class EnhancedFactorReport:
    """增强版因子报告。"""
    factor_name: str

    # 基础 IC
    ic_mean: float = 0.0
    ic_std: float = 0.0
    ir: float = 0.0
    rank_ic_mean: float = 0.0
    turnover: float = 0.0

    # 条件 IC
    regime_conditional_ic: List[ConditionalICResult] = field(default_factory=list)
    volatility_conditional_ic: List[ConditionalICResult] = field(default_factory=list)

    # 衰减分析
    decay_analysis: Optional[Dict] = None

    # 多空收益
    long_short_return: float = 0.0
    long_return: float = 0.0
    short_return: float = 0.0
    win_rate: float = 0.0

    # 统计
    n_observations: int = 0
    year_ic: Optional[pd.Series] = None
    sector_ic: Optional[Dict[str, float]] = None

    def to_dict(self) -> dict:
        return {
            "factor_name": self.factor_name,
            "ic_mean": round(self.ic_mean, 4),
            "ic_std": round(self.ic_std, 4),
            "ir": round(self.ir, 3),
            "rank_ic_mean": round(self.rank_ic_mean, 4),
            "turnover": round(self.turnover, 4),
            "long_short_return": round(self.long_short_return, 4),
            "long_return": round(self.long_return, 4),
            "short_return": round(self.short_return, 4),
            "win_rate": round(self.win_rate, 3),
            "n_observations": self.n_observations,
            "regime_conditional_ic": [
                {"condition": r.condition, "ic_mean": round(r.ic_mean, 4), "ic_count": r.ic_count}
                for r in self.regime_conditional_ic
            ],
            "volatility_conditional_ic": [
                {"condition": r.condition, "ic_mean": round(r.ic_mean, 4), "ic_count": r.ic_count}
                for r in self.volatility_conditional_ic
            ],
        }


class EnhancedFactorEvaluator:
    """增强版因子评估器。

    用法:
        evaluator = EnhancedFactorEvaluator()
        report = evaluator.evaluate(
            factor_values=factor_series,
            forward_returns=returns_series,
            regime=regime_series,        # 可选: 市场状态
            volatility=vol_series,       # 可选: 波动率状态
            sector=sector_series,        # 可选: 板块
        )
    """

    def evaluate(
        self,
        factor_values: pd.Series,
        forward_returns: pd.Series,
        regime: Optional[pd.Series] = None,
        volatility: Optional[pd.Series] = None,
        sector: Optional[pd.Series] = None,
        periods: int = 1,
    ) -> EnhancedFactorReport:
        """综合评估因子。"""
        report = EnhancedFactorReport(factor_name=factor_values.name or "unknown")
        report.n_observations = len(factor_values.dropna())

        # 基础 IC
        aligned = pd.concat([factor_values, forward_returns], axis=1).dropna()
        if len(aligned) < 10:
            return report

        report.ic_mean = float(aligned.iloc[:, 0].corr(aligned.iloc[:, 1]))
        report.rank_ic_mean = float(
            aligned.iloc[:, 0].corr(aligned.iloc[:, 1], method="spearman")
        )

        # IC 标准差和 IR
        if regime is not None:
            ic_series = self._rolling_ic(factor_values, forward_returns, window=20)
            report.ic_std = float(ic_series.std()) if len(ic_series) > 1 else 0.0
            report.ir = report.ic_mean / report.ic_std if report.ic_std > 0 else 0.0

        # 换手率
        report.turnover = self._compute_turnover(factor_values)

        # 条件 IC — 市场状态
        if regime is not None:
            report.regime_conditional_ic = self._compute_conditional_ic(
                factor_values, forward_returns, regime
            )

        # 条件 IC — 波动率状态
        if volatility is not None:
            report.volatility_conditional_ic = self._compute_conditional_ic(
                factor_values, forward_returns, volatility
            )

        # 多空收益
        report.long_return, report.short_return, report.long_short_return = \
            self._compute_long_short(factor_values, forward_returns)

        # 胜率
        report.win_rate = self._compute_win_rate(factor_values, forward_returns)

        # 衰减分析
        decay = FactorDecayAnalysis(factor_values, forward_returns)
        decay.compute_decay_by_lookback([5, 10, 20, 30, 60])
        report.decay_analysis = decay.to_dict()

        return report

    def _rolling_ic(self, factor: pd.Series, returns: pd.Series, window: int = 20) -> pd.Series:
        """计算滚动 IC。"""
        ic_list = []
        for i in range(window, len(factor)):
            f = factor.iloc[i - window:i]
            r = returns.iloc[i - window:i]
            aligned = pd.concat([f, r], axis=1).dropna()
            if len(aligned) > 5:
                ic = aligned.iloc[:, 0].corr(aligned.iloc[:, 1])
                ic_list.append(ic)
        return pd.Series(ic_list, index=factor.index[window:])

    def _compute_conditional_ic(
        self,
        factor: pd.Series,
        returns: pd.Series,
        condition: pd.Series,
    ) -> List[ConditionalICResult]:
        """按条件分组计算 IC。"""
        aligned = pd.concat([factor, returns, condition], axis=1).dropna()
        aligned.columns = ["factor", "returns", "condition"]

        results = []
        for cond_val, group in aligned.groupby("condition"):
            if len(group) >= 10:
                ic = group["factor"].corr(group["returns"])
                hit_rate = (group["factor"] * group["returns"] > 0).mean()
                results.append(ConditionalICResult(
                    condition=str(cond_val),
                    ic_mean=float(ic),
                    ic_count=len(group),
                    hit_rate=float(hit_rate),
                ))
        return results

    def _compute_turnover(self, factor: pd.Series, quantile: float = 0.2) -> float:
        """计算组合换手率。"""
        if len(factor) < 20:
            return 0.0

        threshold = factor.quantile(1 - quantile)
        long_prev = set(factor.iloc[:-1][factor.iloc[:-1] >= threshold].index)
        long_curr = set(factor.iloc[1:][factor.iloc[1:] >= threshold].index)

        if not long_prev or not long_curr:
            return 0.0

        turnover = 1 - len(long_prev & long_curr) / max(len(long_curr), 1)
        return float(turnover)

    def _compute_long_short(
        self,
        factor: pd.Series,
        returns: pd.Series,
        quantile: float = 0.2,
    ) -> Tuple[float, float, float]:
        """计算多空组合收益。"""
        aligned = pd.concat([factor, returns], axis=1).dropna()
        if len(aligned) < 20:
            return 0.0, 0.0, 0.0

        q_high = aligned.iloc[:, 0].quantile(1 - quantile)
        q_low = aligned.iloc[:, 0].quantile(quantile)

        long_ret = aligned.iloc[:, 1][aligned.iloc[:, 0] >= q_high].mean()
        short_ret = aligned.iloc[:, 1][aligned.iloc[:, 0] <= q_low].mean()

        return float(long_ret), float(short_ret), float(long_ret - short_ret)

    def _compute_win_rate(self, factor: pd.Series, returns: pd.Series) -> float:
        """计算因子胜率。"""
        aligned = pd.concat([factor, returns], axis=1).dropna()
        if len(aligned) < 10:
            return 0.0
        correct = (aligned.iloc[:, 0] * aligned.iloc[:, 1] > 0).sum()
        return float(correct) / len(aligned)
