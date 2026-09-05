"""
FeatureStore — 特征元数据注册与管理。

每个特征包含:
  - 基础: name, category, description
  - 数据: data_required, lookback, frequency
  - 可用性: available_in_realtime, leakage_risk
  - 市场: target_market
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable
from enum import Enum


class FeatureCategory(str, Enum):
    PRICE = "price"
    TREND = "trend"
    OSCILLATION = "oscillation"
    VOLATILITY = "volatility"
    VOLUME_OI = "volume_oi"
    TERM_STRUCTURE = "term_structure"
    CROSS_ASSET = "cross_asset"
    OPTIONS = "options"
    FUNDAMENTAL = "fundamental"
    SENTIMENT = "sentiment"


class LeakageRisk(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class FeatureMeta:
    """特征元数据。"""
    name: str
    category: FeatureCategory
    description: str = ""
    data_required: List[str] = field(default_factory=lambda: ["close"])
    lookback: int = 20
    frequency: str = "1d"
    available_in_realtime: bool = True
    leakage_risk: LeakageRisk = LeakageRisk.LOW
    target_market: List[str] = field(default_factory=lambda: ["futures"])
    compute_fn: Optional[Callable] = None
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "data_required": self.data_required,
            "lookback": self.lookback,
            "frequency": self.frequency,
            "available_in_realtime": self.available_in_realtime,
            "leakage_risk": self.leakage_risk.value,
            "target_market": self.target_market,
            "tags": self.tags,
        }


class FeatureStore:
    """特征注册中心。

    用法:
        store = FeatureStore()
        store.register(FeatureMeta(name="return_5", category=FeatureCategory.PRICE, ...))
        features = store.list_by_category("trend")
    """

    def __init__(self):
        self._features: Dict[str, FeatureMeta] = {}
        self._register_builtins()

    def register(self, meta: FeatureMeta) -> None:
        self._features[meta.name] = meta

    def get(self, name: str) -> Optional[FeatureMeta]:
        return self._features.get(name)

    def list_all(self) -> List[FeatureMeta]:
        return list(self._features.values())

    def list_by_category(self, category: str) -> List[FeatureMeta]:
        return [f for f in self._features.values() if f.category.value == category]

    def list_by_market(self, market: str) -> List[FeatureMeta]:
        return [f for f in self._features.values() if market in f.target_market]

    def list_realtime(self) -> List[FeatureMeta]:
        return [f for f in self._features.values() if f.available_in_realtime]

    def categories(self) -> List[str]:
        return sorted(set(f.category.value for f in self._features.values()))

    def stats(self) -> dict:
        cats = {}
        for f in self._features.values():
            cats[f.category.value] = cats.get(f.category.value, 0) + 1
        return {
            "total_features": len(self._features),
            "by_category": cats,
            "realtime_count": len(self.list_realtime()),
        }

    # ─── 内置特征注册 ──────────────────────────────────────────────

    def _register_builtins(self):
        builtins = [
            # ── 基础价格特征 ──
            ("return_1", FeatureCategory.PRICE, "1周期收益率"),
            ("return_5", FeatureCategory.PRICE, "5周期收益率", [], 5),
            ("return_10", FeatureCategory.PRICE, "10周期收益率", [], 10),
            ("return_20", FeatureCategory.PRICE, "20周期收益率", [], 20),
            ("log_return", FeatureCategory.PRICE, "对数收益率"),
            ("rolling_mean_20", FeatureCategory.PRICE, "20周期滚动均值", [], 20),
            ("rolling_std_20", FeatureCategory.PRICE, "20周期滚动标准差", [], 20),
            ("high_low_range", FeatureCategory.PRICE, "高低价差", ["high", "low"]),
            ("close_open_return", FeatureCategory.PRICE, "收盘-开盘收益", ["open", "close"]),
            ("overnight_gap", FeatureCategory.PRICE, "隔夜跳空", ["open", "close"]),

            # ── 趋势特征 ──
            ("ema_5_20_diff", FeatureCategory.TREND, "EMA5-EMA20差值"),
            ("ema_20_60_diff", FeatureCategory.TREND, "EMA20-EMA60差值", [], 60),
            ("ma_slope_20", FeatureCategory.TREND, "MA20斜率", [], 20),
            ("ma_slope_60", FeatureCategory.TREND, "MA60斜率", [], 60),
            ("adx", FeatureCategory.TREND, "ADX趋势强度", ["high", "low"], 14),
            ("dmi_plus", FeatureCategory.TREND, "DMI+", ["high", "low"], 14),
            ("dmi_minus", FeatureCategory.TREND, "DMI-", ["high", "low"], 14),
            ("supertrend_direction", FeatureCategory.TREND, "SuperTrend方向", ["high", "low"], 14),
            ("donchian_position", FeatureCategory.TREND, "Donchian通道位置", ["high", "low"], 20),
            ("linear_regression_slope", FeatureCategory.TREND, "线性回归斜率", [], 20),

            # ── 震荡特征 ──
            ("rsi_14", FeatureCategory.OSCILLATION, "RSI(14)"),
            ("cci_20", FeatureCategory.OSCILLATION, "CCI(20)", ["high", "low"], 20),
            ("stoch_k", FeatureCategory.OSCILLATION, "随机指标K", ["high", "low"], 14),
            ("stoch_d", FeatureCategory.OSCILLATION, "随机指标D", ["high", "low"], 14),
            ("bollinger_zscore", FeatureCategory.OSCILLATION, "布林带Z-Score"),
            ("bollinger_width", FeatureCategory.OSCILLATION, "布林带宽度"),
            ("vwap_deviation", FeatureCategory.OSCILLATION, "VWAP偏离", ["high", "low", "volume"]),
            ("hurst_exponent", FeatureCategory.OSCILLATION, "Hurst指数", [], 100),

            # ── 波动率特征 ──
            ("atr_14", FeatureCategory.VOLATILITY, "ATR(14)", ["high", "low"], 14),
            ("atr_pct", FeatureCategory.VOLATILITY, "ATR百分比", ["high", "low"], 14),
            ("realized_vol_5", FeatureCategory.VOLATILITY, "5日实现波动率", [], 5),
            ("realized_vol_20", FeatureCategory.VOLATILITY, "20日实现波动率", [], 20),
            ("realized_vol_60", FeatureCategory.VOLATILITY, "60日实现波动率", [], 60),
            ("parkinson_vol", FeatureCategory.VOLATILITY, "Parkinson波动率", ["high", "low"], 20),
            ("garman_klass_vol", FeatureCategory.VOLATILITY, "Garman-Klass波动率", ["open", "high", "low", "close"], 20),
            ("vol_percentile", FeatureCategory.VOLATILITY, "波动率百分位", [], 252),
            ("vol_of_vol", FeatureCategory.VOLATILITY, "波动率的波动率", [], 60),

            # ── 成交量/持仓量特征 ──
            ("volume_zscore", FeatureCategory.VOLUME_OI, "成交量Z-Score", ["volume"], 20),
            ("volume_ratio_20", FeatureCategory.VOLUME_OI, "20日均量比", ["volume"], 20),
            ("turnover_ratio", FeatureCategory.VOLUME_OI, "换手率", ["volume"], 20),
            ("open_interest_change", FeatureCategory.VOLUME_OI, "OI变化率", ["open_interest"], 5),
            ("open_interest_zscore", FeatureCategory.VOLUME_OI, "OI Z-Score", ["open_interest"], 20),
            ("price_oi_interaction", FeatureCategory.VOLUME_OI, "价格-OI互动", ["open_interest"], 20),
            ("volume_price_corr", FeatureCategory.VOLUME_OI, "量价相关性", ["volume"], 20),
            ("obv", FeatureCategory.VOLUME_OI, "OBV", ["volume"], 20),
            ("mfi", FeatureCategory.VOLUME_OI, "MFI资金流指标", ["high", "low", "volume"], 14),

            # ── 期限结构特征 (期货) ──
            ("near_far_spread", FeatureCategory.TERM_STRUCTURE, "近远月价差", ["near_price", "far_price"]),
            ("calendar_spread_zscore", FeatureCategory.TERM_STRUCTURE, "日历价差Z-Score", ["near_price", "far_price"], 60),
            ("term_structure_slope", FeatureCategory.TERM_STRUCTURE, "期限结构斜率", ["near_price", "far_price"]),
            ("roll_yield", FeatureCategory.TERM_STRUCTURE, "展期收益率", ["near_price", "far_price"]),
            ("basis", FeatureCategory.TERM_STRUCTURE, "基差", ["spot_price"]),
            ("contango_backwardation", FeatureCategory.TERM_STRUCTURE, "升贴水状态", ["near_price", "far_price"]),

            # ── 跨品种特征 ──
            ("sector_return", FeatureCategory.CROSS_ASSET, "板块收益", [], 20),
            ("relative_strength_rank", FeatureCategory.CROSS_ASSET, "相对强弱排名", [], 60),
            ("pair_spread", FeatureCategory.CROSS_ASSET, "配对价差", [], 20),
            ("correlation_rolling", FeatureCategory.CROSS_ASSET, "滚动相关性", [], 60),

            # ── 期权特征 ──
            ("iv", FeatureCategory.OPTIONS, "隐含波动率", ["iv"], 1),
            ("iv_rank", FeatureCategory.OPTIONS, "IV Rank", ["iv"], 252),
            ("iv_percentile", FeatureCategory.OPTIONS, "IV Percentile", ["iv"], 252),
            ("iv_hv_spread", FeatureCategory.OPTIONS, "IV-HV价差", ["iv"], 20),
            ("skew_25d", FeatureCategory.OPTIONS, "25D Skew", ["iv", "strike"], 1),
            ("put_call_ratio", FeatureCategory.OPTIONS, "Put/Call比率", ["option_volume"], 1),
            ("delta_exposure", FeatureCategory.OPTIONS, "Delta暴露", ["delta"], 1),
            ("gamma_exposure", FeatureCategory.OPTIONS, "Gamma暴露", ["gamma"], 1),
            ("vega_exposure", FeatureCategory.OPTIONS, "Vega暴露", ["vega"], 1),
            ("theta_decay", FeatureCategory.OPTIONS, "Theta衰减", ["theta"], 1),
            ("term_structure_iv", FeatureCategory.OPTIONS, "IV期限结构", ["iv"], 60),
            ("atm_iv", FeatureCategory.OPTIONS, "ATM隐含波动率", ["iv"], 1),
            ("option_volume_oi_ratio", FeatureCategory.OPTIONS, "期权量仓比", ["option_volume", "open_interest"], 1),
        ]

        # ── 补充期货专属特征 ──
        futures_builtins = [
            # 期限结构 (增强)
            ("term_structure_curve", FeatureCategory.TERM_STRUCTURE, "期限结构曲线", ["near_price", "far_price", "next_far_price"], 20),
            ("main_secondary_spread", FeatureCategory.TERM_STRUCTURE, "主力-次主力价差", ["main_price", "secondary_price"], 1),
            ("basis_zscore", FeatureCategory.TERM_STRUCTURE, "基差Z-Score", ["spot_price", "futures_price"], 60),
            ("carry_cost", FeatureCategory.TERM_STRUCTURE, "carry成本", ["near_price", "far_price", "risk_free_rate"], 1),

            # 持仓量特征 (期货核心)
            ("oi_acceleration", FeatureCategory.VOLUME_OI, "OI加速度", ["open_interest"], 5),
            ("oi_momentum", FeatureCategory.VOLUME_OI, "OI动量", ["open_interest"], 10),
            ("price_volume_divergence", FeatureCategory.VOLUME_OI, "价量背离", ["close", "volume"], 20),
            ("oi_concentration", FeatureCategory.VOLUME_OI, "OI集中度", ["open_interest"], 1),

            # 波动率特征 (增强)
            ("realized_vol_10", FeatureCategory.VOLATILITY, "10日实现波动率", [], 10),
            ("yang_zhang_vol", FeatureCategory.VOLATILITY, "Yang-Zhang波动率", ["open", "high", "low", "close"], 20),
            ("rogers_satchell_vol", FeatureCategory.VOLATILITY, "Rogers-Satchell波动率", ["open", "high", "low", "close"], 20),
            ("vol_regime", FeatureCategory.VOLATILITY, "波动率制度", [], 60),
            ("iv_hv_ratio", FeatureCategory.VOLATILITY, "IV/HV比率", ["iv"], 20),

            # 跨品种特征 (增强)
            ("cointegration_score", FeatureCategory.CROSS_ASSET, "协整得分", [], 60),
            ("residual_momentum", FeatureCategory.CROSS_ASSET, "残差动量", [], 20),
            ("pair_zscore", FeatureCategory.CROSS_ASSET, "配对Z-Score", [], 20),

            # K线形态特征
            ("body_ratio", FeatureCategory.PRICE, "实体占比", ["open", "high", "low", "close"], 1),
            ("upper_shadow_ratio", FeatureCategory.PRICE, "上影线占比", ["open", "high", "low", "close"], 1),
            ("lower_shadow_ratio", FeatureCategory.PRICE, "下影线占比", ["open", "high", "low", "close"], 1),
            ("close_location_value", FeatureCategory.PRICE, "收盘位置值", ["open", "high", "low", "close"], 1),
            ("gap_up", FeatureCategory.PRICE, "跳空缺口", ["open", "close"], 1),
            ("gap_down", FeatureCategory.PRICE, "向下缺口", ["open", "close"], 1),
            ("consecutive_bars", FeatureCategory.PRICE, "连续同向K线", ["close"], 1),

            # 趋势特征 (增强)
            ("trend_r2", FeatureCategory.TREND, "趋势R方", [], 20),
            ("kama_direction", FeatureCategory.TREND, "KAMA方向", [], 20),
            ("hma_direction", FeatureCategory.TREND, "HMA方向", [], 20),
            ("trend_days", FeatureCategory.TREND, "趋势持续天数", [], 1),
            ("new_high_days", FeatureCategory.TREND, "连续新高天数", ["high"], 1),
            ("new_low_days", FeatureCategory.TREND, "连续新低天数", ["low"], 1),
        ]

        for args in futures_builtins:
            name, cat, desc = args[0], args[1], args[2]
            data_req = args[3] if len(args) > 3 else ["close"]
            lookback = args[4] if len(args) > 4 else 20
            self.register(FeatureMeta(
                name=name, category=cat, description=desc,
                data_required=data_req, lookback=lookback,
                tags=["futures_enhanced"],
            ))

        for args in builtins:
            name, cat, desc = args[0], args[1], args[2]
            data_req = args[3] if len(args) > 3 else ["close"]
            lookback = args[4] if len(args) > 4 else 20
            self.register(FeatureMeta(
                name=name, category=cat, description=desc,
                data_required=data_req, lookback=lookback,
            ))


# 全局单例
_feature_store: Optional[FeatureStore] = None


def get_feature_store() -> FeatureStore:
    global _feature_store
    if _feature_store is None:
        _feature_store = FeatureStore()
    return _feature_store
