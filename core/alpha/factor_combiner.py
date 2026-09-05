from __future__ import annotations

from typing import Dict, List, Optional, Union

import numpy as np
import pandas as pd
from loguru import logger


class FactorCombiner:
    def __init__(self, factors: Optional[pd.DataFrame] = None) -> None:
        self.factors = factors

    def set_factors(self, factors: pd.DataFrame) -> None:
        self.factors = factors

    def equal_weight(
        self,
        factors: Optional[pd.DataFrame] = None,
    ) -> pd.Series:
        df = factors if factors is not None else self.factors
        if df is None or df.empty:
            return pd.Series(dtype=float)
        return df.mean(axis=1)

    def ic_weight(
        self,
        factors: Optional[pd.DataFrame] = None,
        ic_values: Optional[Dict[str, float]] = None,
    ) -> pd.Series:
        df = factors if factors is not None else self.factors
        if df is None or df.empty:
            return pd.Series(dtype=float)

        if ic_values is None:
            ic_values = {}

        weights = {}
        for col in df.columns:
            ic = ic_values.get(col, 0.0)
            weights[col] = abs(ic)

        total_weight = sum(weights.values())
        if total_weight == 0:
            return self.equal_weight(df)

        normalized = {k: v / total_weight for k, v in weights.items()}
        result = sum(
            df[col] * w for col, w in normalized.items() if col in df.columns
        )
        return result

    def regime_weight(
        self,
        factors: Optional[pd.DataFrame] = None,
        regimes: Optional[pd.Series] = None,
        regime_weights: Optional[Dict[Union[str, int], Dict[str, float]]] = None,
    ) -> pd.Series:
        df = factors if factors is not None else self.factors
        if df is None or df.empty:
            return pd.Series(dtype=float)

        if regimes is None:
            regimes = pd.Series(0, index=df.index)

        if regime_weights is None:
            regime_weights = {}

        result = pd.Series(0.0, index=df.index)
        for regime in regimes.unique():
            mask = regimes == regime
            regime_data = df[mask]
            if regime_data.empty:
                continue

            weights = regime_weights.get(regime, {})
            if not weights:
                regime_result = regime_data.mean(axis=1)
            else:
                total_weight = sum(abs(w) for w in weights.values())
                if total_weight == 0:
                    regime_result = regime_data.mean(axis=1)
                else:
                    normalized = {
                        k: abs(w) / total_weight for k, w in weights.items()
                    }
                    regime_result = sum(
                        regime_data[col] * w
                        for col, w in normalized.items()
                        if col in regime_data.columns
                    )

            result[mask] = regime_result

        return result

    def max_ic_ir_weight(
        self,
        factors: Optional[pd.DataFrame] = None,
        ic_series: Optional[Dict[str, pd.Series]] = None,
        use_shrinkage: bool = True,
    ) -> pd.Series:
        """最大化 IC_IR 组合 (均值-方差优化 → max IR = IC' * Σ⁻¹)。

        Args:
            factors: 因子值 DataFrame (T x N)
            ic_series: {factor_name: IC时间序列} 用于估计协方差
            use_shrinkage: 是否使用 Ledoit-Wolf 压缩协方差估计 (否则用样本协方差)

        基于 Qian-Hua-Sorensen (2007) 框架: w* ∝ Σ⁻¹ * IC_mean
        """
        df = factors if factors is not None else self.factors
        if df is None or df.empty:
            return pd.Series(dtype=float)

        if ic_series is None:
            return self.equal_weight(df)

        cols = [c for c in df.columns if c in ic_series]
        if len(cols) < 2:
            return self.equal_weight(df[cols]) if cols else self.equal_weight(df)

        # 估计 IC 均值向量
        ic_mean = np.array([ic_series[c].mean() for c in cols])

        # 估计 IC 协方差矩阵
        ic_df = pd.DataFrame({c: ic_series[c] for c in cols}).dropna()
        if ic_df.shape[0] < len(cols) * 2:
            return self.ic_weight(df, {c: ic_mean[i] for i, c in enumerate(cols)})

        if use_shrinkage:
            try:
                from sklearn.covariance import LedoitWolf
                cov = LedoitWolf().fit(ic_df.values).covariance_
            except ImportError:
                cov = ic_df.cov().values
        else:
            cov = ic_df.cov().values

        try:
            inv_cov = np.linalg.inv(cov)
            w = inv_cov @ ic_mean
            w = np.maximum(w, 0)  # 约束非负权重
            w = w / (w.sum() + 1e-10)
        except np.linalg.LinAlgError:
            return self.ic_weight(df, {c: ic_mean[i] for i, c in enumerate(cols)})

        result = sum(df[cols[i]] * w[i] for i in range(len(cols)))
        return result

    def pca_combine(
        self,
        factors: Optional[pd.DataFrame] = None,
        n_components: int = 1,
    ) -> pd.Series:
        """PCA 第一主成分合成 (因子信息的最大方差方向)。

        利用 Incremental PCA 支持大数据集。
        """
        df = factors if factors is not None else self.factors
        if df is None or df.empty or df.shape[1] < 2:
            return pd.Series(0.0, index=df.index) if df is not None else pd.Series(dtype=float)

        from sklearn.decomposition import PCA
        clean = df.dropna()
        if clean.empty:
            return pd.Series(0.0, index=df.index)

        pca = PCA(n_components=min(n_components, df.shape[1]))
        transformed = pca.fit_transform(clean.values)
        result = pd.Series(0.0, index=df.index)
        result.loc[clean.index] = transformed[:, 0]
        return result

    def half_life_weight(
        self,
        factors: Optional[pd.DataFrame] = None,
        ic_series: Optional[Dict[str, pd.Series]] = None,
        half_life: int = 60,
    ) -> pd.Series:
        """半衰期加权组合 — 近期 IC 权重大, 远期 IC 权重小。

        Args:
            half_life: 半衰期天数 (60天内权重衰减一半)
        """
        df = factors if factors is not None else self.factors
        if df is None or df.empty:
            return pd.Series(dtype=float)

        if ic_series is None:
            return self.equal_weight(df)

        cols = [c for c in df.columns if c in ic_series]
        if not cols:
            return self.equal_weight(df)

        decay = np.log(2) / half_life
        w_all = {}
        for c in cols:
            ic = ic_series[c].dropna()
            if len(ic) < 2:
                w_all[c] = abs(ic.mean())
            else:
                t = np.arange(len(ic))[::-1]
                weights = np.exp(-decay * t)
                w_all[c] = abs(np.average(ic.values, weights=weights))

        total = sum(w_all.values())
        if total == 0:
            return self.equal_weight(df[cols])

        normalized = {c: w_all[c] / total for c in cols}
        result = sum(df[c] * normalized[c] for c in cols)
        return result

    def normalize_factors(
        self,
        factors: Optional[pd.DataFrame] = None,
        method: str = "zscore",
    ) -> pd.DataFrame:
        df = factors if factors is not None else self.factors
        if df is None or df.empty:
            return pd.DataFrame()

        if method == "zscore":
            return (df - df.mean()) / (df.std() + 1e-10)
        elif method == "minmax":
            min_vals = df.min()
            max_vals = df.max()
            return (df - min_vals) / (max_vals - min_vals + 1e-10)
        elif method == "rank":
            return df.rank(pct=True)
        else:
            raise ValueError(f"Unknown normalization method: {method}")
