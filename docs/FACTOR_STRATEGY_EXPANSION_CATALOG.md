# 因子与策略研究扩展目录

## 1. 扩展结果

| 项目 | 扩展前 | 本轮新增 | 扩展后 |
| --- | ---: | ---: | ---: |
| 注册因子 | 483 | 96 | 579 |
| 注册策略 | 111 | 32 | 143 |

本轮新增内容来自公开量化研究与常见可复现研究范式。这里的“全部”指本轮建立的有限、可审计公开研究语料库，不代表覆盖所有未发表、专有或未来出现的方法。

新增因子和策略均为 `research-only`。注册成功仅证明定义可计算、可发现、可测试，不证明具有超额收益，也不允许绕过现有回测、走样本、成本、风控和人工审批门禁。

## 2. 去重规则

只排除计算定义完全相同的项目。名称不同但公式相同的别名只保留一个，例如本轮审计发现并删除了计算完全一致的 `money_flow_pressure_20` / `chaikin_pressure_20` 重复项。

以下任一差异均视为独立研究定义并保留：

- 公式、信号组合或阈值不同。
- 窗口、滞后或持有期不同。
- 排名、标准化、波动率缩放或中性化方式不同。
- 所需原始数据不同。
- 经济假设和适用市场状态不同。

每项定义使用规范化公式或逻辑的 SHA-256 指纹。自动测试要求本轮 96 个因子和 32 个策略内部无指纹冲突，并要求旧名称仍可访问，防止新增注册覆盖现有实现。

## 3. 因子目录

所有标准因子需要 `open/high/low/close/volume`。标有“扩展字段”的因子只有在对应权威数据列存在时计算，否则返回全 `NaN`，不使用替代值或合成代理。

### 3.1 动量与趋势（12）

- 动量：`log_momentum_5`、`log_momentum_10`、`log_momentum_20`、`log_momentum_60`、`log_momentum_120`、`residual_momentum_20`、`momentum_acceleration_5_20`。
- 趋势：`trend_tstat_20`、`trend_tstat_60`、`path_efficiency_20`、`path_efficiency_60`、`true_range_trend_strength_20`。
- 研究依据：Jegadeesh-Titman 动量、Blitz-Huij-Martens 残差动量、Kaufman 效率比和时间序列趋势显著性。

### 3.2 尾部风险与高阶矩（14）

- `maximum_daily_return_20`、`minimum_daily_return_20`、`return_skewness_20`、`return_kurtosis_20`、`return_mean_absolute_deviation_20`。
- `downside_semivariance_20`、`upside_semivariance_20`、`tail_asymmetry_20`、`historical_var_95_60`、`expected_shortfall_95_60`。
- `rolling_drawdown_20`、`ulcer_index_20`、`drawdown_duration`、`jump_intensity_20`。
- 研究依据：MAX 异象、高阶矩、下行风险、历史 VaR/ES、Martin-McCann Ulcer Index 和跳跃风险。

### 3.3 波动率（14）

- 收盘实现波动率：`realized_volatility_5`、`realized_volatility_10`、`realized_volatility_20`、`realized_volatility_60`。
- OHLC 估计器：`parkinson_volatility_20`、`garman_klass_volatility_20`、`rogers_satchell_volatility_20`、`yang_zhang_volatility_20`。
- 波动结构：`volatility_of_volatility_20`、`volatility_term_ratio_5_20`、`downside_upside_vol_ratio_20`、`bipower_variation_20`、`range_compression_5_20`、`range_expansion_20`。
- 研究依据：Parkinson、Garman-Klass、Rogers-Satchell、Yang-Zhang 和 Barndorff-Nielsen 双幂变差。

### 3.4 流动性与微观结构（25）

- 流动性：`amihud_illiquidity_20`、`volume_shock_20`、`volume_coefficient_variation_20`、`log_dollar_volume_20`、`signed_price_impact_20`、`zero_return_ratio_20`、`illiquidity_trend_20`、`volume_price_correlation_20`、`volume_breakout_20`、`price_volume_divergence_20`。
- OHLCV 微观结构：`roll_implied_spread_20`、`high_low_spread_20`、`close_location_value_20`、`money_flow_pressure_20`、`wick_imbalance_20`、`body_range_ratio_20`、`open_close_pressure_20`、`typical_price_deviation_20`、`signed_volume_imbalance_20`、`volume_return_asymmetry_20`、`obv_trend_tstat_20`、`ease_of_movement_20`。
- 扩展字段：`order_flow_imbalance` 需要 `bid_volume/ask_volume`；`effective_spread` 需要 `bid/ask`；`vpin_50` 需要 `buy_volume/sell_volume`。
- 研究依据：Amihud 非流动性、Roll 隐含价差、Corwin-Schultz 高低价差、订单流不平衡和 VPIN。

### 3.5 收益分解与季节性（8）

- 收益分解：`intraday_return`、`overnight_return`、`intraday_reversal_20`、`gap_persistence_20`。
- 季节性：`weekday_return_history`、`month_return_history`、`turn_of_month_pressure_60`、`weekday_return_dispersion`。
- 所有季节性历史均使用当前行之前的扩展窗口，不读取未来同日历组数据。

### 3.6 序列依赖与价格结构（10）

- 序列依赖：`return_autocorrelation_20`、`squared_return_autocorrelation_20`、`variance_ratio_5_60`、`hurst_proxy_5_60`、`return_entropy_20`、`return_sign_persistence_20`。
- 均值回归：`short_long_reversal_5_20`。
- 价格结构：`range_position_20`、`breakout_distance_20`、`support_distance_20`。
- 研究依据：Lo-MacKinlay 方差比、Hurst 代理、信息熵、短长周期反转和前期区间位置。

### 3.7 期限、基本面、持仓和期权（13）

- 期限结构，扩展字段：`term_structure_slope`、`term_structure_curvature`、`annualized_roll_yield_proxy` 需要远近月价格列。
- 基差，扩展字段：`basis_zscore_60`、`basis_momentum_20` 需要 `basis`。
- 库存，扩展字段：`inventory_surprise_60`、`inventory_price_divergence_20` 需要 `inventory`。
- 持仓，扩展字段：`open_interest_momentum_20`、`open_interest_price_divergence_20` 需要 `open_interest`；`long_short_crowding`、`member_position_concentration` 需要交易所会员持仓列。
- 期权，扩展字段：`variance_risk_premium_20` 需要 `implied_vol`；`skew_risk_premium` 需要 `put_iv/call_iv`。

## 4. 策略目录

| 策略 | 核心逻辑 | 数据 | 状态 |
| --- | --- | --- | --- |
| `research_cta_multi_speed` | 20/60/120 日动量多数投票 | OHLCV | research-only |
| `research_dual_horizon_disagreement` | 20 与 120 日趋势分歧时反向短周期 | OHLCV | research-only |
| `research_residual_momentum` | 20 日收益减去长期均值漂移 | OHLCV | research-only |
| `research_momentum_carry` | 60 日动量与期限结构共振 | `close_far` | research-only |
| `research_vol_scaled_breakout` | 前期区间距离按 ATR 缩放 | OHLCV | research-only |
| `research_jump_continuation` | 超过 2.5 倍波动的跳跃延续 | OHLCV | research-only |
| `research_jump_reversal` | 超过 2.5 倍波动的跳跃反转 | OHLCV | research-only |
| `research_intraday_continuation` | 5 日开收到收盘收益延续 | OHLCV | research-only |
| `research_overnight_intraday_divergence` | 隔夜与日内收益差 | OHLCV | research-only |
| `research_liquidity_shock_reversal` | 放量价格冲击反向 | OHLCV | research-only |
| `research_signed_volume_continuation` | 带符号成交量压力延续 | OHLCV | research-only |
| `research_compression_release` | 区间压缩后按短期动量释放 | OHLCV | research-only |
| `research_tail_risk_defensive_trend` | 以预期损失惩罚 60 日趋势 | OHLCV | research-only |
| `research_drawdown_aware_trend` | 以当前回撤惩罚 60 日趋势 | OHLCV | research-only |
| `research_vol_of_vol_regime` | 波动率之波动 z-score 反向 | OHLCV | research-only |
| `research_variance_ratio_adaptive` | 方差比决定趋势或反转 | OHLCV | research-only |
| `research_entropy_regime_switch` | 低熵趋势、高熵反转 | OHLCV | research-only |
| `research_autocorrelation_adaptive` | 一阶自相关决定趋势或反转 | OHLCV | research-only |
| `research_seasonality_momentum` | 历史同月收益与当前动量共振 | OHLCV + 日期索引 | research-only |
| `research_turn_of_month` | 月末月初历史收益效应 | OHLCV + 日期索引 | research-only |
| `research_price_volume_divergence` | 价格与成交量动量背离反转 | OHLCV | research-only |
| `research_obv_tstat` | OBV 斜率 t 统计量 | OHLCV | research-only |
| `research_support_rebound` | 距前期低点 3% 内反弹 | OHLCV | research-only |
| `research_breakout_distance` | 相对前期高点的突破距离 | OHLCV | research-only |
| `research_term_curvature` | 近中远月曲线曲率 | `close_near/close_mid/close_far` | research-only |
| `research_basis_momentum` | 20 日基差变化 | `basis` | research-only |
| `research_inventory_price_divergence` | 价格与库存变化背离 | `inventory` | research-only |
| `research_open_interest_confirmation` | 价格与持仓量同向确认 | `open_interest` | research-only |
| `research_member_crowding_contrarian` | 交易所会员多空拥挤度反向 | `long_position/short_position` | research-only |
| `research_order_flow_imbalance` | 买卖盘量不平衡 | `bid_volume/ask_volume` | research-only |
| `research_variance_risk_premium` | 隐含波动率减实现波动率 | `implied_vol` | research-only |
| `research_skew_risk_premium` | 看跌与看涨隐波偏斜反向 | `put_iv/call_iv` | research-only |

标准 OHLCV 策略在样本不足、阈值未触发或分数无效时返回 `None`。9 个扩展数据策略在字段缺失时返回 `None`，不会推断、填充或生成替代信号。

## 5. 数据接入要求

以下数据必须按点时语义接入，并保留来源、抓取时间、原始文档哈希和生效时间：

- 交易所结算价、主力/次主力合约和完整期限曲线。
- 现货或官方基准价及可复现基差口径。
- 交易所仓单、库存、持仓量和会员多空排名。
- L1/L2 买卖盘、主动买卖成交拆分和 VPIN 所需成交分类。
- 期权平值隐含波动率、看涨/看跌偏斜及合约选择规则。

禁止用当前主力合约回填历史、用当日最终排名覆盖盘中状态、用未来发布值回填历史时点，或把缺失外部字段替换成随机/合成值。

## 6. 晋级与验收流程

1. 数据验收：完整性、单位、时区、复权/换月、可得时间和来源追溯全部通过。
2. 因子验收：覆盖率、极值、稳定性、IC/RankIC、衰减、换手、相关性和分组单调性。
3. 去冗余：计算指纹先排除完全重复，再用跨品种滚动相关和条件互信息识别经济冗余，但不自动删除。
4. 策略回测：统一使用可信 next-bar-open 引擎、真实手续费、滑点、保证金、涨跌停和换月规则。
5. 稳健性：滚动走样本、参数扰动、分品种/制度/年份切片、延迟和成本压力测试。
6. 过拟合控制：候选规模足够后增加 DSR/PBO；在此之前保留完整试验次数和失败结果。
7. 晋级：只有通过数据、统计、经济性和风控门禁的候选才能进入 challenger；Champion/实盘分配继续人工批准。

## 7. 自动验收证据

- 目录精确为 96 个新增因子和 32 个新增策略。
- 新增目录内名称与规范化公式/逻辑指纹均唯一。
- 所有因子完成注册，并通过前缀一致性测试，证明计算不依赖未来行。
- 所有策略完成注册，置信度限制在 `[0, 1]`，短数据不崩溃。
- 外部字段缺失时因子全 `NaN`、策略 `None`。
- 16 个扩展字段因子在完整权威字段夹具下均产生有限值，9 个扩展字段策略均可安全计算并保持置信度边界。
- 扩展后实际注册总数为 579 个因子、143 个策略，旧 `alpha001` 保持可用。
- 计算级去重审计使用 3 组确定性市场路径，对 80 个纯 OHLCV 新因子与 370 个能够产生有限输出的旧因子比较完整输出序列，未发现完全碰撞。
- 旧目录另有 110 个 GTJA 解释器定义在该审计输入上无法执行、3 个旧定义无有限输出；它们不作为“已完成计算比较”的证据，仍保留公式审查和后续解释器修复边界。
- 策略行为审计在多组确定性行情截面上比较 21 个活跃纯 OHLCV 新策略与 91 个活跃旧策略，未发现方向、分数和置信度序列完全相同的行为指纹。

实现位置：

- 因子：`core/alpha/alpha101/research_factors.py`
- 策略：`signals/strategies/research_expansion.py`
- 验收：`tests/unit/test_research_factor_strategy_expansion.py`
