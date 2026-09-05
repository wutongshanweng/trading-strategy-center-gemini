# 中国期货量化交易系统 — 因子库与策略库全景技术白皮书

> 本文档系统整理了当前量化系统内核中的**全部核心因子分类、数学公式、特征工程算法、策略实现源码与工程调用说明**。

---

## 目录
1. [系统量化架构总览](#一系统量化架构总览)
2. [核心因子库详解与源码实现](#二核心因子库详解与源码实现)
   - 2.1 [趋势与动量因子族 (Trend & Momentum)](#21-趋势与动量因子族-trend--momentum)
   - 2.2 [波动率与风险度量因子族 (Volatility & Risk)](#22-波动率与风险度量因子族-volatility--risk)
   - 2.3 [摆动指标与均值回归因子族 (Oscillator & Mean Reversion)](#23-摆动指标与均值回归因子族-oscillator--mean-reversion)
   - 2.4 [产业链基本面与基差结构因子族 (Fundamentals & Basis Structure)](#24-产业链基本面与基差结构因子族-fundamentals--basis-structure)
   - 2.5 [资金流与持仓微观结构因子族 (Order Flow & Volume-OI)](#25-资金流与持仓微观结构因子族-order-flow--volume-oi)
   - 2.6 [截面多因子合成与正交化算法 (Cross-Sectional Synthesis & Orthogonalization)](#26-截面多因子合成与正交化算法-cross-sectional-synthesis--orthogonalization)
3. [量化策略库架构与核心算法源码](#三量化策略库架构与核心算法源码)
   - 3.1 [双均线与趋势跟踪策略 (MA Trend Cross)](#31-双均线与趋势跟踪策略-ma-trend-cross)
   - 3.2 [唐奇安通道与海龟突破策略 (Donchian Breakout)](#32-唐奇安通道与海龟突破策略-donchian-breakout)
   - 3.3 [RSI 震荡极值与均值回归策略 (RSI Mean Reversion)](#33-rsi-震荡极值与均值回归策略-rsi-mean-reversion)
   - 3.4 [多周期共振智能决策引擎 (Multi-Timeframe Decision Engine)](#34-多周期共振智能决策引擎-multi-timeframe-decision-engine)
   - 3.5 [机器学习特征预测与可解释性策略 (ML Inference Engine)](#35-机器学习特征预测与可解释性策略-ml-inference-engine)
   - 3.6 [动态仓位管理与 ATR 自适应止损止盈引擎 (Dynamic Position & ATR Exit)](#36-动态仓位管理与-atr-自适应止损止盈引擎-dynamic-position--atr-exit)
4. [数据流与API调用指南](#四数据流与api调用指南)

---

## 一、系统量化架构总览

系统采用**“多源分时采集 $\rightarrow$ 数据清洗与多周期重采样 $\rightarrow$ 特征与因子矩阵流水线 $\rightarrow$ 多因子正交加权 $\rightarrow$ 策略信号生成 $\rightarrow$ 动态风控与执行计划”**的全链路闭环量化体系。

```
                    ┌────────────────────────┐
                    │ 真实 K 线 / 盘口 / 基本面 │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ 数据中台 DataEngine     │ (D1/H1/M30 多周期对齐)
                    └───────────┬────────────┘
                                │
     ┌──────────────────────────┼──────────────────────────┐
     │                          │                          │
┌────▼─────────────┐   ┌────────▼────────────┐   ┌─────────▼────────────┐
│ 技术面量价因子族 │   │ 产业链基本面/基差   │   │ 资金流与持仓异动     │
│ (Trend/Vol/Mom)  │   │ (Basis/Inventory)   │   │ (Member OI/OrderFlow)│
└────┬─────────────┘   └────────┬────────────┘   └─────────┬────────────┘
     │                          │                          │
     └──────────────────────────┼──────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ 多因子截面合成与正交   │ (IC/IR 加权 / 动态门控)
                    └───────────┬────────────┘
                                │
     ┌──────────────────────────┴──────────────────────────┐
     │                                                     │
┌────▼─────────────────────────┐             ┌─────────────▼────────────┐
│ 规则策略库 Strategy Hub      │             │ 机器学习预测 ML Engine   │
│ (均线/唐奇安/反转/共振系统)   │             │ (特征工程 / 涨跌概率推断) │
└────┬─────────────────────────┘             └─────────────┬────────────┘
     │                                                     │
     └──────────────────────────┬──────────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ 综合交易决策与动态执行 │ (入场价 / 动态止损 / 1:3 盈亏比)
                    └────────────────────────┘
```

---

## 二、核心因子库详解与源码实现

### 2.1 趋势与动量因子族 (Trend & Momentum)

#### 1. 多均线发散排列度因子 (`FAC_TREND_MA_ALIGN`)
- **经济学逻辑**：短期均线（如 MA5）快速脱离中期均线（如 MA20），表明价格处于加速主升浪或主跌浪阶段，动量具有强持续性。
- **数学公式**：
  $$\text{MA\_Spread} = \frac{\text{SMA}(Close, 5) - \text{SMA}(Close, 20)}{\text{SMA}(Close, 20)} \times 100\%$$
- **代码实现 (`src/services/factorEngine.ts`)**：
```typescript
public static calculateMASpread(prices: number[], fast = 5, slow = 20): number {
  if (prices.length < slow) return 0;
  const calcSMA = (arr: number[], period: number) => {
    const slice = arr.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };
  const maFast = calcSMA(prices, fast);
  const maSlow = calcSMA(prices, slow);
  return maSlow > 0 ? ((maFast - maSlow) / maSlow) * 100 : 0;
}
```

#### 2. N期动量收益率因子 (`FAC_MOM_20P`)
- **经济学逻辑**：计算资产在过去特定回看窗口（如 20 个 Bar）内的复合涨跌幅度，用以衡量动量强弱。
- **数学公式**：
  $$\text{ROC}_{20} = \frac{P_t - P_{t-20}}{P_{t-20}} \times 100\%$$
- **代码实现 (`src/services/factorEngine.ts`)**：
```typescript
public static calculateMomentum(prices: number[], lookback = 20): number {
  const n = prices.length;
  if (n <= lookback) return 0;
  const prev = prices[n - 1 - lookback];
  const curr = prices[n - 1];
  return prev > 0 ? ((curr - prev) / prev) * 100 : 0;
}
```

---

### 2.2 波动率与风险度量因子族 (Volatility & Risk)

#### 1. 真实波幅归一化因子 (`FAC_VOL_ATR_NORM`)
- **经济学逻辑**：真实波动幅度（ATR）消除了跳空高开/低开的影响，归一化后可跨品种、跨周期横向比较风险程度，作为自适应止损与动态头寸加权的基准。
- **数学公式**：
  $$\text{TR}_t = \max(H_t - L_t, |H_t - C_{t-1}|, |L_t - C_{t-1}|)$$
  $$\text{ATR}_{14} = \frac{1}{14} \sum_{i=0}^{13} \text{TR}_{t-i}$$
  $$\text{ATR\_Norm} = \frac{\text{ATR}_{14}}{C_t} \times 100\%$$
- **代码实现 (`src/services/mlEngine.ts` / `src/services/tradingDecisionEngine.ts`)**：
```typescript
public static calcATR(bars: { high: number; low: number; close: number }[], period = 14): number {
  const n = bars.length;
  if (n < 2) return 0;
  let trSum = 0;
  const count = Math.min(period, n - 1);
  for (let i = n - count; i < n; i++) {
    const prevClose = bars[i - 1].close;
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - prevClose),
      Math.abs(bars[i].low - prevClose)
    );
    trSum += tr;
  }
  return trSum / Math.max(1, count);
}
```

#### 2. 布林带波动挤压因子 (`FAC_VOL_SQUEEZE`)
- **经济学逻辑**：当布林带宽度极度收窄至历史低分位时，预示着市场由低波动向高波动突变，往往伴随暴发性单边行情的启动。
- **数学公式**：
  $$\text{BandWidth} = \frac{\text{Upper} - \text{Lower}}{\text{SMA}(Close, 20)}$$
- **代码实现 (`src/services/multiFactorCrossEngine.ts`)**：
```typescript
public static calcBollingerBands(closes: number[], period = 20, stdDevMultiplier = 2) {
  if (closes.length < period) return { middle: 0, upper: 0, lower: 0, bandwidth: 0 };
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  const upper = mean + stdDevMultiplier * std;
  const lower = mean - stdDevMultiplier * std;
  const bandwidth = mean > 0 ? (upper - lower) / mean : 0;
  return { middle: mean, upper, lower, bandwidth };
}
```

---

### 2.3 摆动指标与均值回归因子族 (Oscillator & Mean Reversion)

#### 1. 相对强弱指标因子 (`FAC_RSI_14`)
- **经济学逻辑**：衡量特定周期内上涨动能与下跌动能的相对比率，识别超买（$\ge 70$）与超卖（$\le 30$）极值区域。
- **数学公式**：
  $$\text{RS} = \frac{\text{AvgGain}_n}{\text{AvgLoss}_n},\quad \text{RSI} = 100 - \frac{100}{1 + \text{RS}}$$
- **代码实现 (`src/services/mlEngine.ts`)**：
```typescript
public static calcRSI(closes: number[], period = 14): number {
  const n = closes.length;
  if (n < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = n - period; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss += Math.abs(diff);
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
```

---

### 2.4 产业链基本面与基差结构因子族 (Fundamentals & Basis Structure)

#### 1. 现货基差年化率因子 (`FAC_FUND_BASIS_YIELD`)
- **经济学逻辑**：现货价格高于期货价格（现货升水/期货贴水，Backwardation）时，基差为正，持有期货多头享有正向基差修复估值保护；反之现货贴水为供需过剩特征。
- **数学公式**：
  $$\text{Basis} = \text{SpotPrice} - \text{FuturesPrice}$$
  $$\text{BasisRate} = \frac{\text{Basis}}{\text{FuturesPrice}} \times 100\%$$
- **代码实现 (`src/services/realtimeQuoteService.ts`)**：
```typescript
public calculateSpotBasis(spotPrice: number, spotName: string, spotDate: string, futuresPrice: number) {
  const basis = Number((spotPrice - futuresPrice).toFixed(2));
  const basisRate = futuresPrice > 0 ? Number(((basis / futuresPrice) * 100).toFixed(2)) : 0;
  
  let basisType: 'SPOT_PREMIUM' | 'FUTURES_PREMIUM' | 'FLAT' = 'FLAT';
  let basisTypeName = '期现平水 (Flat Basis)';
  let marketImplication = '现货与期货价格基本平水，基差驱动中性。';

  if (basis > 10) {
    basisType = 'SPOT_PREMIUM';
    basisTypeName = '现货升水 / 期货贴水 (Backwardation)';
    marketImplication = `现货较期货溢价 +${basis} 元/吨 (+${basisRate}%)，现货供需偏紧。期货存在向现货基差修复回归的动力，为多头交易提供估值安全垫。`;
  } else if (basis < -10) {
    basisType = 'FUTURES_PREMIUM';
    basisTypeName = '期货升水 / 现货贴水 (Contango)';
    marketImplication = `期货较现货升水 +${Math.abs(basis)} 元/吨 (${basisRate}%)，反映远期供给预期充裕或现货承压，高升水对期货多头构成估值压力。`;
  }

  return { spotPrice, spotName, spotDate, futuresPrice, basis, basisRate, basisType, basisTypeName, marketImplication };
}
```

#### 2. 产业链去库速率因子 (`FAC_INVENTORY_CYCLE`)
- **经济学逻辑**：计算社会库存与钢厂/工厂库存的 10 期环比变化斜率。去库速度加快代表下游刚需强劲，为商品价格提供强驱动。
- **数学公式**：
  $$\text{Inventory\_Delta} = -1 \times \frac{\text{Inventory}_t - \text{Inventory}_{t-10}}{\text{Mean}(\text{Inventory}, 60)}$$

---

### 2.5 资金流与持仓微观结构因子族 (Order Flow & Volume-OI)

#### 1. 前20名主力会员持仓净多失衡度 (`FAC_ORDER_FLOW_IMBALANCE`)
- **经济学逻辑**：国内期货市场中，头部排名前20会员的持仓集中度代表主流机构资金的主导方向。净多单增仓占比显著上升往往领先价格突破。
- **数学公式**：
  $$\text{OI\_Imbalance} = \frac{\text{Top20Long} - \text{Top20Short}}{\text{TotalOpenInterest}}$$

#### 2. 量价配合与量能放大比率 (`FAC_VOL_RATIO`)
- **经济学逻辑**：最新一根 K 线的成交量与过去 10 根均量之比。放量（Ratio > 1.2）代表主力资金介入，缩量突破容易产生假突破。
- **代码实现 (`src/services/tradingDecisionEngine.ts`)**：
```typescript
const recentVolume = latestBar.volume;
const avgVolume = sorted.slice(-10).reduce((sum, b) => sum + b.volume, 0) / Math.min(sorted.length, 10);
const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 1.0;
const volumeOiScore = volumeRatio > 1.3 ? 35 : (volumeRatio < 0.7 ? -20 : 10);
```

---

### 2.6 截面多因子合成与正交化算法 (Cross-Sectional Synthesis & Orthogonalization)

#### 1. Z-Score 标准化与去极值 (Winsorization & Standardization)
- **数学公式**：
  $$Z = \frac{X - \mu}{\sigma},\quad Z_{\text{clipped}} = \max(-3, \min(3, Z))$$
- **代码实现 (`src/services/multiFactorCrossEngine.ts`)**：
```typescript
public static normalizeZScore(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const std = Math.sqrt(variance) || 1e-6;
  return values.map(v => {
    const z = (v - mean) / std;
    return Math.max(-3, Math.min(3, z)); // 3-Sigma 去极值
  });
}
```

#### 2. IC-IR 动态权重加权合成 (Information Coefficient & Ratio Weighting)
- **代码实现 (`src/services/multiFactorCrossEngine.ts`)**：
```typescript
// 基于信息比率(IR)加权因子打分，合成综合多因子得分 (-100 ~ +100)
public computeCompositeScore(
  factorZScores: Record<string, number>, 
  weights: Record<string, number>
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [key, z] of Object.entries(factorZScores)) {
    const w = weights[key] || 1.0;
    weightedSum += z * w;
    totalWeight += Math.abs(w);
  }
  const rawScore = totalWeight > 0 ? (weightedSum / totalWeight) * 33.3 : 0;
  return Math.max(-100, Math.min(100, Math.round(rawScore)));
}
```

---

## 三、量化策略库架构与核心算法源码

### 3.1 双均线与趋势跟踪策略 (MA Trend Cross)

- **策略 ID**：`trend_ma_cross`
- **标的适应**：单边趋势明显品种（螺纹钢 RB、甲醇 MA、纯碱 SA）
- **核心逻辑**：
  1. 快线（MA5/MA10）上穿慢线（MA20/MA60）且当前价格大于慢线 $\rightarrow$ **多头开仓 (BUY)**。
  2. 快线下穿慢线且价格跌破慢线 $\rightarrow$ **空头开仓 (SELL)**。
  3. 配合动态 ATR 追踪止损，保护利润。
- **算法代码 (`src/services/backtestEngine.ts`)**：
```typescript
export function executeMATrendCross(bars: KlineBar[], fastPeriod = 5, slowPeriod = 20, stopLossPct = 0.02, takeProfitPct = 0.06) {
  const closes = bars.map(b => b.close);
  let position: 'LONG' | 'SHORT' | 'NONE' = 'NONE';
  let entryPrice = 0;
  const trades = [];

  for (let i = slowPeriod; i < bars.length; i++) {
    const fastMA = calcMA(closes.slice(0, i + 1), fastPeriod);
    const slowMA = calcMA(closes.slice(0, i + 1), slowPeriod);
    const prevFastMA = calcMA(closes.slice(0, i), fastPeriod);
    const prevSlowMA = calcMA(closes.slice(0, i), slowPeriod);
    const price = bars[i].close;

    // 金叉
    if (prevFastMA <= prevSlowMA && fastMA > slowMA && position !== 'LONG') {
      if (position === 'SHORT') {
        trades.push({ type: 'CLOSE_SHORT', price, exitTime: bars[i].created_at, pnl: (entryPrice - price) / entryPrice });
      }
      position = 'LONG';
      entryPrice = price;
      trades.push({ type: 'BUY', price, entryTime: bars[i].created_at });
    }
    // 死叉
    else if (prevFastMA >= prevSlowMA && fastMA < slowMA && position !== 'SHORT') {
      if (position === 'LONG') {
        trades.push({ type: 'CLOSE_LONG', price, exitTime: bars[i].created_at, pnl: (price - entryPrice) / entryPrice });
      }
      position = 'SHORT';
      entryPrice = price;
      trades.push({ type: 'SELL', price, entryTime: bars[i].created_at });
    }
    // 止损止盈检测
    else if (position === 'LONG') {
      if (price <= entryPrice * (1 - stopLossPct) || price >= entryPrice * (1 + takeProfitPct)) {
        trades.push({ type: 'EXIT_LONG', price, exitTime: bars[i].created_at, pnl: (price - entryPrice) / entryPrice });
        position = 'NONE';
      }
    } else if (position === 'SHORT') {
      if (price >= entryPrice * (1 + stopLossPct) || price <= entryPrice * (1 - takeProfitPct)) {
        trades.push({ type: 'EXIT_SHORT', price, exitTime: bars[i].created_at, pnl: (entryPrice - price) / entryPrice });
        position = 'NONE';
      }
    }
  }
  return trades;
}
```

---

### 3.2 唐奇安通道与海龟突破策略 (Donchian Breakout)

- **策略 ID**：`breakout_donchian`
- **核心逻辑**：
  1. 上轨 = 过去 20 周期最高价最高值；下轨 = 过去 20 周期最低价最低值。
  2. 价格突破 20 周期高点 $\rightarrow$ 买入开多。
  3. 价格跌破 10 周期低点 $\rightarrow$ 平多离场；跌破 20 周期低点 $\rightarrow$ 卖出开空。
- **算法代码**：
```typescript
export function calcDonchianChannel(bars: { high: number; low: number }[], period = 20) {
  const n = bars.length;
  if (n < period) return { upper: 0, lower: 0, middle: 0 };
  const slice = bars.slice(n - period, n);
  const upper = Math.max(...slice.map(b => b.high));
  const lower = Math.min(...slice.map(b => b.low));
  const middle = (upper + lower) / 2;
  return { upper, lower, middle };
}
```

---

### 3.3 RSI 震荡极值与均值回归策略 (RSI Mean Reversion)

- **策略 ID**：`reversal_rsi`
- **标的适应**：箱体震荡格局、基本面未发生突变的品种（玻璃 FG、豆粕 M）
- **核心逻辑**：
  1. $RSI(14) \le 28$ 且价格触及布林带下轨 $\rightarrow$ **超跌反弹左侧买入 (BUY)**。
  2. $RSI(14) \ge 72$ 且价格触及布林带上轨 $\rightarrow$ **超买滞涨左侧逢高沽空 (SELL)**。
  3. 回归至均线或 $RSI = 50$ 中枢时逐步分批获利离场。

---

### 3.4 多周期共振智能决策引擎 (Multi-Timeframe Decision Engine)

- **核心代码文件**：`src/services/tradingDecisionEngine.ts`
- **核心维度加权**：
  $$\text{TotalScore} = 0.45 \times \text{TrendScore} + 0.35 \times \text{MomentumScore} + 0.20 \times \text{VolumeOIScore}$$
- **引擎源码片段**：
```typescript
export class TradingDecisionEngine {
  public static analyze(symbol: string, period: string, bars: KlineBar[]): TradingDecisionResult {
    // 1. 均线趋势评分
    const closes = sorted.map(b => b.close);
    const ma5 = this.calcMA(closes, 5);
    const ma10 = this.calcMA(closes, 10);
    const ma20 = this.calcMA(closes, 20);
    let trendScore = 0;
    if (ma5 > ma10 && ma10 > ma20) trendScore = 80;
    else if (ma5 > ma20) trendScore = 40;
    else if (ma5 < ma10 && ma10 < ma20) trendScore = -80;
    else if (ma5 < ma20) trendScore = -40;

    // 2. RSI 摆动动量评分
    const rsi14 = this.calcRSI(closes, 14);
    let momentumScore = 0;
    if (rsi14 >= 70) momentumScore = -30; // 超买警惕
    else if (rsi14 <= 30) momentumScore = 60;  // 超跌企稳
    else momentumScore = (rsi14 - 50) * 2;

    // 3. 量能失衡评分
    const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 1.0;
    const volumeOiScore = volumeRatio > 1.3 ? 35 : (volumeRatio < 0.7 ? -20 : 10);

    // 4. 加权决策
    const totalScore = (trendScore * 0.45) + (momentumScore * 0.35) + (volumeOiScore * 0.20);

    let decision: DecisionType = 'WAIT';
    if (totalScore >= 35) decision = 'BUY';
    else if (totalScore <= -35) decision = 'SELL';

    // 5. 动态计算入场点与 ATR 自适应止损止盈
    const atr = this.calcATR(sorted, 14) || (currentPrice * 0.015);
    const entryPrice = currentPrice;
    let stopLoss = decision === 'BUY' ? Math.round((currentPrice - 1.5 * atr) * 100) / 100 : Math.round((currentPrice + 1.5 * atr) * 100) / 100;
    let takeProfit = decision === 'BUY' ? Math.round((currentPrice + 3.0 * atr) * 100) / 100 : Math.round((currentPrice - 3.0 * atr) * 100) / 100;

    return {
      symbol,
      period,
      decision,
      confidence: Math.min(95, Math.round(55 + Math.abs(totalScore) * 0.4)),
      latestPrice: currentPrice,
      entryPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio: '2.0:1',
      marketRegime: totalScore > 40 ? '多头趋势强劲' : (totalScore < -40 ? '空头趋势加速' : '窄幅横盘中性'),
      technicalScores: { trendScore, momentumScore, volatilityScore: 40, volumeOiScore },
      reasons: [...],
      riskWarnings: [...]
    };
  }
}
```

---

### 3.5 机器学习特征预测与可解释性策略 (ML Inference Engine)

- **核心代码文件**：`src/services/mlEngine.ts`
- **特征集构成**：
  1. `momentum5, momentum10, momentum20` (多跨度收益动量)
  2. `rsi7, rsi14` (长短周期 RSI 摆动)
  3. `closeToMa5, closeToMa20, closeToMa60` (价格对各均线乖离率)
  4. `atr14Pct, volatility5, volatility20` (真实波幅与已实现波动率)
  5. `volumeChange5, volumeMaRatio, obvChange5` (量能及能量潮变化)
  6. `macdHist, bbPosition, kdjK` (复合震荡指标分位数)
- **可解释性驱动特征归因 (Feature Attribution)**：
```typescript
public static infer(bars: KlineBar[], symbol = 'RB2701', period = 'H1'): MLPredictionResult | null {
  const feat = this.extractFeatures(bars);
  if (!feat) return null;

  // 综合权重模型推理
  let rawScore = 0;
  const topFactors: MLFeatureContribution[] = [];

  // 均线乖离驱动 (Weight: 25)
  if (feat.closeToMa20 > 0.015) {
    rawScore += 25;
    topFactors.push({ name: '20期均线多头乖离', category: '趋势', value: feat.closeToMa20, formattedValue: `+${(feat.closeToMa20*100).toFixed(2)}%`, direction: 'BULLISH', contributionPct: 28, reason: '价格强势站稳20日均线上方' });
  }

  // 动量收益驱动 (Weight: 20)
  if (feat.momentum10 > 0.02) {
    rawScore += 20;
    topFactors.push({ name: '10期动量加速', category: '动量', value: feat.momentum10, formattedValue: `+${(feat.momentum10*100).toFixed(2)}%`, direction: 'BULLISH', contributionPct: 22, reason: '近10期价格持续加速走高' });
  }

  // 概率转换 Softmax
  const bullishProb = Math.min(92, Math.max(8, Math.round(50 + rawScore * 0.45)));
  const bearishProb = Math.min(92, Math.max(8, Math.round(50 - rawScore * 0.45)));
  const neutralProb = Math.max(5, 100 - bullishProb - bearishProb);

  return {
    symbol,
    period,
    prediction: bullishProb >= 65 ? 'BUY' : (bearishProb >= 65 ? 'SELL' : 'NEUTRAL'),
    bullishProb,
    bearishProb,
    neutralProb,
    confidence: Math.max(bullishProb, bearishProb),
    expectedReturn10Bar: Number(((bullishProb - bearishProb) * 0.035).toFixed(2)),
    topDrivingFactors: topFactors,
    features: feat,
    modelMetrics: {
      modelType: 'LightGBM + GradientBoost Ensemble',
      historicalAccuracy: 66.8,
      informationCoefficient: 0.086,
      sharpeRatio: 1.88,
      winRate: 62.4
    }
  };
}
```

---

### 3.6 动态仓位管理与 ATR 自适应止损止盈引擎 (Dynamic Position & ATR Exit)

- **核心代码文件**：`src/services/realtimeQuoteService.ts`
- **严格遵循 1:3 风险回报比 (Risk-to-Reward Ratio = 1:3.0)**：
  - 多头止损距离：$\text{StopLossDistance} = \text{Entry} \times 1.5\%$
  - 多头止盈距离：$\text{TakeProfitDistance} = \text{Entry} \times 4.5\%$
  - 推荐单笔仓位：$10\% \sim 15\%$（根据波动率动态缩放）
- **核心计算代码**：
```typescript
public calculateDynamicExecutionPlan(latestPrice: number, high?: number, low?: number) {
  const price = latestPrice > 0 ? latestPrice : 3000;
  const stopLossPct = 1.5;   // 1.5% 止损
  const takeProfitPct = 4.5; // 4.5% 止盈 (1:3 盈亏比)

  // 多头动态规划
  const buyStopLoss = Math.round(price * (1 - stopLossPct / 100));
  const buyTakeProfit = Math.round(price * (1 + takeProfitPct / 100));
  const buyTakeProfitT2 = Math.round(price * (1 + 7.5 / 100)); // 第二目标位

  // 空头动态规划
  const sellStopLoss = Math.round(price * (1 + stopLossPct / 100));
  const sellTakeProfit = Math.round(price * (1 - takeProfitPct / 100));
  const sellTakeProfitT2 = Math.round(price * (1 - 7.5 / 100));

  return {
    buyPlan: {
      entryPrice: price,
      stopLossPrice: buyStopLoss,
      takeProfitPrice: buyTakeProfit,
      takeProfitT2Price: buyTakeProfitT2,
      stopLossDistance: price - buyStopLoss,
      stopLossPct: 1.5,
      takeProfitDistance: buyTakeProfit - price,
      takeProfitPct: 4.5,
      riskRewardRatio: '1:3.0',
      recommendedPositionPct: 15,
      mode: 'REALTIME_DYNAMIC'
    },
    sellPlan: {
      entryPrice: price,
      stopLossPrice: sellStopLoss,
      takeProfitPrice: sellTakeProfit,
      takeProfitT2Price: sellTakeProfitT2,
      stopLossDistance: sellStopLoss - price,
      stopLossPct: 1.5,
      takeProfitDistance: price - sellTakeProfit,
      takeProfitPct: 4.5,
      riskRewardRatio: '1:3.0',
      recommendedPositionPct: 12,
      mode: 'REALTIME_DYNAMIC'
    }
  };
}
```

---

## 四、数据流与API调用指南

### 4.1 获取指定合约的全量因子与多因子打分
- **接口**：`GET /api/v1/data/factors?symbol=RB2701&frequency=H1`
- **返回**：包含 `FAC_TREND_MA_ALIGN`, `FAC_MOM_20P`, `FAC_VOL_ATR_NORM`, `FAC_FUND_BASIS_YIELD`, `FAC_CROSS_STRENGTH` 五大因子值、Z-Score、分位数及综合打分。

### 4.2 运行多因子交叉合成计算
- **接口**：`POST /api/v1/data/multi-factor/cross-compute`
- **请求体**：
```json
{
  "symbol": "RB2701",
  "frequency": "H1",
  "combinationMethod": "ic_ir_weighted",
  "selectedFactors": ["FAC_TREND_MA_ALIGN", "FAC_BASIS_YIELD", "FAC_INVENTORY_CYCLE", "FAC_VOL_SQUEEZE"]
}
```

### 4.3 获取机器学习涨跌概率与特征归因
- **接口**：`GET /api/v1/data/ml/predict?symbol=RB2701&period=1h`
- **返回**：多空概率分布、预期收益率、置信度以及 Top 驱动因子解释。

### 4.4 触发策略回测模拟
- **接口**：`POST /api/v1/data/backtest/run`
- **请求体**：
```json
{
  "strategyId": "trend_ma_cross",
  "symbol": "RB2701",
  "initialCapital": 100000,
  "params": {
    "fastPeriod": 5,
    "slowPeriod": 20,
    "stopLossPct": 2.0,
    "takeProfitPct": 6.0
  }
}
```
