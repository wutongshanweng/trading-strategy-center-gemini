/**
 * China Futures Dynamic Live Signal Engine
 * 动态综合分析交易信号生成引擎：
 * 深度融合多周期物理K线(D1/H1/M30)、量化技术指标、机器学习(ML)截面因子归因、缠论分型与盘中实时新浪行情，
 * 动态推演输出高置信度实战交易信号。
 */

import { dataEngine } from './dataEngine.js';
import { TradingDecisionEngine } from './tradingDecisionEngine.js';
import { MLEngine } from './mlEngine.js';
import { getContractSpec } from './chinaFuturesMaster.js';
import { sevenProductsEngine } from './sevenProductsEngine.js';

export interface SignalItem {
  id: string;
  symbol: string;
  name: string;
  assetType: 'futures' | 'stock' | 'crypto';
  direction: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  starRating: 1 | 2 | 3 | 4 | 5;
  freshness: string;
  timestamp: number;
  status: 'active' | 'triggered' | 'expired';
  quality: 'high' | 'medium' | 'low';
  tradingPlan: {
    entry: number;
    stopLoss: number;
    takeProfit: number;
    riskReward: string;
    positionPct: number;
  };
  tripleScreen: {
    d1Trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    h1Signal: 'BUY' | 'SELL' | 'NEUTRAL';
    m30Confirm: boolean;
    chanPattern: string;
  };
  resonance: {
    strategy: {
      total: number;
      bullish: number;
      bearish: number;
      neutral: number;
      highlights: string[];
    };
    factors: {
      total: number;
      netScore: number;
      highlights: string[];
    };
    macro: {
      sentiment: 'positive' | 'negative' | 'neutral';
      news: string[];
    };
  };
  reason: string;
  whitelistRequired?: boolean;
}

export class LiveSignalEngine {
  private cache: { timestamp: number; signals: SignalItem[]; key: string } | null = null;
  private readonly CACHE_TTL_MS = 10000; // 10秒内存缓存

  /**
   * 严格获取在数据中心纳管的核心品种及其当前主力合约
   */
  public getDataCenterCoreSymbols(): { product: string; symbol: string; name: string; exchange: string; category: string }[] {
    return sevenProductsEngine.getCoreDominantSymbols();
  }

  /**
   * 主动清理信号缓存（如数据中心增删品种时）
   */
  public invalidateCache(): void {
    this.cache = null;
  }

  /**
   * 获取动态计算的实时交易信号流（严格限定为数据中心纳管的核心品种，绝不输出非纳管品种）
   */
  public async getDynamicSignals(symbols?: string[], forceRefresh: boolean = false): Promise<SignalItem[]> {
    const now = Date.now();
    const coreList = this.getDataCenterCoreSymbols();
    const coreSymbolSet = new Set(coreList.map(item => item.symbol.toUpperCase()));
    const coreProductSet = new Set(coreList.map(item => item.product.toUpperCase()));

    // 严格过滤：若指定了 symbols，仅保留属于数据中心纳管核心品种的合约；若未指定，直接使用数据中心纳管全部核心合约
    let targetSymbols: string[] = [];
    if (symbols && symbols.length > 0) {
      targetSymbols = symbols
        .map(s => s.toUpperCase().trim())
        .filter(s => {
          const prod = s.replace(/[0-9]+/, '');
          return coreSymbolSet.has(s) || coreProductSet.has(prod);
        });
      if (targetSymbols.length === 0) {
        targetSymbols = coreList.map(item => item.symbol);
      }
    } else {
      targetSymbols = coreList.map(item => item.symbol);
    }

    const cacheKey = targetSymbols.slice().sort().join(',');

    if (!forceRefresh && this.cache && this.cache.key === cacheKey && (now - this.cache.timestamp < this.CACHE_TTL_MS)) {
      return this.cache.signals;
    }

    const signalPromises = targetSymbols.map(sym => this.computeSymbolSignal(sym));
    const results = await Promise.allSettled(signalPromises);

    const validSignals: SignalItem[] = [];
    results.forEach((res, index) => {
      if (res.status === 'fulfilled' && res.value) {
        validSignals.push(res.value);
      } else {
        console.warn(`[LiveSignalEngine] Failed to compute signal for ${targetSymbols[index]}:`, res.status === 'rejected' ? res.reason : 'null');
      }
    });

    // 按照置信度降序排序，优质信号靠前
    validSignals.sort((a, b) => {
      if (b.starRating !== a.starRating) {
        return b.starRating - a.starRating;
      }
      return b.confidence - a.confidence;
    });

    this.cache = {
      timestamp: now,
      signals: validSignals,
      key: cacheKey
    };

    return validSignals;
  }

  /**
   * 为单一品种执行全维动态分析并生成信号
   * 数据不足时返回 null（调用方跳过该品种），绝不基于占位价出方向性信号
   */
  public async computeSymbolSignal(rawSymbol: string): Promise<SignalItem | null> {
    const symbol = rawSymbol.toUpperCase();
    const spec = getContractSpec(symbol);

    // P2-8 品种波动率基准校准：按板块设定基础阈值与滤波器
    const cal = this.getCalibration(spec.category);

    // 1. 获取该品种日线 (D1, 60根) 与 30分钟线 (M30, 60根)
    const [d1Result, m30Result] = await Promise.all([
      dataEngine.getKlinesWithResampling(symbol, '1d', 60, undefined, { scoreThreshold: cal.scoreThresholdBase }),
      dataEngine.getKlinesWithResampling(symbol, '30m', 60)
    ]);

    const d1Bars = d1Result.data;
    const m30Bars = m30Result.data;

    // P1-7 数据完整性守卫：K线不足或价格缺失，拒绝出信号
    if (!d1Bars || d1Bars.length < 20 || !m30Bars || m30Bars.length < 20) return null;

    const decision = d1Result.decision;
    const rawPrice: number = decision.latestPrice > 0 ? decision.latestPrice : (d1Bars[d1Bars.length - 1]?.close || 0);
    if (!(rawPrice > 0)) return null;
    const latestPrice = rawPrice;

    const mlPrediction = d1Result.mlPrediction || MLEngine.predict(symbol, '1d', d1Bars);

    // 3. 计算 缠论 (Chan Theory) 形态
    const chanPattern = this.analyzeChanPattern(d1Bars);

    // 4. 三重滤网 (Triple Screen: D1 趋势 + H1/M30 信号 + M30 入场)
    const d1Closes = d1Bars.map(b => b.close);
    const d1Ma5 = this.calcMA(d1Closes, 5);
    const d1Ma20 = this.calcMA(d1Closes, 20);

    let d1Trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (d1Ma5 > d1Ma20 * (1 + cal.trendTolPct / 100)) {
      d1Trend = 'BULLISH';
    } else if (d1Ma5 < d1Ma20 * (1 - cal.trendTolPct / 100)) {
      d1Trend = 'BEARISH';
    }

    const m30Closes = m30Bars.map(b => b.close);
    const m30Ma10 = this.calcMA(m30Closes, 10);
    const lastM30Close = m30Closes[m30Closes.length - 1];

    let h1Signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    if (decision.decision === 'BUY' || (mlPrediction.prediction === 'BUY' || mlPrediction.prediction === 'STRONG_BUY')) {
      h1Signal = 'BUY';
    } else if (decision.decision === 'SELL' || (mlPrediction.prediction === 'SELL' || mlPrediction.prediction === 'STRONG_SELL')) {
      h1Signal = 'SELL';
    }

    const m30Confirm = h1Signal === 'BUY'
      ? lastM30Close >= m30Ma10 * (1 - cal.m30TolPct / 100)
      : (h1Signal === 'SELL' ? lastM30Close <= m30Ma10 * (1 + cal.m30TolPct / 100) : true);

    // P1-5 ADX 趋势过滤器：非趋势市不做方向性交易
    const adx = this.calcADX(d1Bars, 14);
    const trending = adx >= cal.adxMin;

    // P1-4 综合多空方向判定：严格三重滤网 + ADX，移除 decision 单独兜底
    let finalDirection: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (trending && h1Signal === 'BUY' && d1Trend !== 'BEARISH' && m30Confirm) {
      finalDirection = 'BUY';
    } else if (trending && h1Signal === 'SELL' && d1Trend !== 'BULLISH' && m30Confirm) {
      finalDirection = 'SELL';
    }

    // 综合置信度计算
    const baseConf = decision.confidence || 60;
    const mlConf = mlPrediction.confidence || 60;
    let confidence = Math.round(baseConf * 0.55 + mlConf * 0.45);
    if (m30Confirm) confidence = Math.min(95, confidence + 5);

    // P2-8 波动率校准：波动率越高，同等置信度的信号星级要求越严
    const atrPct = this.calcAtrPct(d1Bars, 14);
    const volFactor = Math.min(1.8, Math.max(0.7, atrPct / 0.012));
    const calConf = confidence / volFactor;

    // 星级评定 (1-5星)：HOLD 无方向性推荐恒为 1 星
    let starRating: 1 | 2 | 3 | 4 | 5 = 1;
    if (finalDirection !== 'HOLD') {
      if (calConf >= 82) starRating = 5;
      else if (calConf >= 74) starRating = 4;
      else if (calConf >= 64) starRating = 3;
      else starRating = 2;
    }

    // 交易计划与风控参数 (基于真实 ATR 与支撑阻力位)
    const entry = decision.entryPrice || latestPrice;
    let stopLoss = 0;
    let takeProfit = 0;
    if (finalDirection === 'BUY') {
      stopLoss = decision.stopLoss || Math.round(entry * 0.985);
      takeProfit = decision.takeProfit || Math.round(entry * 1.045);
    } else if (finalDirection === 'SELL') {
      stopLoss = decision.stopLoss || Math.round(entry * 1.015);
      takeProfit = decision.takeProfit || Math.round(entry * 0.955);
    } else {
      stopLoss = decision.keyLevels?.weakSupport || 0;
      takeProfit = decision.keyLevels?.weakResistance || 0;
    }
    stopLoss = Math.max(0, stopLoss);
    takeProfit = Math.max(0, takeProfit);
    const riskReward = decision.riskRewardRatio || '—';
    const positionPct = finalDirection === 'HOLD' ? 0 : (starRating === 5 ? 18 : starRating === 4 ? 14 : 10);

    // P0-1 策略表决：由真实子信号逐项投票计票，不再伪造 90 策略矩阵
    const mlBullish = mlPrediction.prediction === 'BUY' || mlPrediction.prediction === 'STRONG_BUY';
    const mlBearish = mlPrediction.prediction === 'SELL' || mlPrediction.prediction === 'STRONG_SELL';
    const chanBullish = chanPattern.includes('多') || chanPattern.includes('一买');
    const chanBearish = chanPattern.includes('空') || chanPattern.includes('一卖');
    const votes = [
      { label: `D1均线趋势 MA5 ¥${d1Ma5} vs MA20 ¥${d1Ma20}`, bullish: d1Trend === 'BULLISH', bearish: d1Trend === 'BEARISH' },
      { label: `决策引擎 (${decision.decision}) 分阈值 ${cal.scoreThresholdBase}`, bullish: decision.decision === 'BUY', bearish: decision.decision === 'SELL' },
      { label: `ML预测 ${mlPrediction.prediction || 'N/A'}`, bullish: mlBullish, bearish: mlBearish },
      { label: `ADX(${adx.toFixed(1)}) 趋势强度 ${trending ? '达标' : '不足(过滤)'}`, bullish: trending && finalDirection === 'BUY', bearish: trending && finalDirection === 'SELL' },
      { label: `M30收盘 ${lastM30Close} vs MA10 ${m30Ma10}`, bullish: m30Confirm && h1Signal === 'BUY', bearish: m30Confirm && h1Signal === 'SELL' },
      { label: `缠论 ${chanPattern}`, bullish: chanBullish, bearish: chanBearish }
    ];
    const bullishVotes = votes.filter(v => v.bullish).length;
    const bearishVotes = votes.filter(v => v.bearish).length;
    const neutralVotes = votes.length - bullishVotes - bearishVotes;
    let strategyHighlights = votes.filter(v => v.bullish || v.bearish).slice(0, 3).map(v => v.label);
    if (strategyHighlights.length === 0) {
      strategyHighlights = votes.slice(0, 3).map(v => `${v.label} (中性)`);
    }

    // P0-3 截面因子亮点：优先真实 ML 归因；无归因时使用真实计算的简因子，绝不伪造 RankIC
    const factorFacts = this.buildFactorFacts(d1Bars);
    const factorHighlights: string[] = [];
    if (mlPrediction.topDrivingFactors && mlPrediction.topDrivingFactors.length > 0) {
      mlPrediction.topDrivingFactors.slice(0, 3).forEach((f: any) => {
        factorHighlights.push(`${f.name}: ${f.reason} (贡献度 ${f.contributionPct}%)`);
      });
    } else {
      const mom5 = factorFacts.momentum5 >= 0 ? `+${factorFacts.momentum5.toFixed(2)}%` : `${factorFacts.momentum5.toFixed(2)}%`;
      factorHighlights.push(`5日动量 ${mom5}`);
      factorHighlights.push(`RSI(14) ${factorFacts.rsi14.toFixed(1)}${factorFacts.rsi14 >= 70 ? ' (超买)' : factorFacts.rsi14 <= 30 ? ' (超卖)' : ''}`);
      factorHighlights.push(`20日价格区间分位 ${factorFacts.pos20.toFixed(0)}%`);
      factorHighlights.push(`量能比(最新/10日均) ${factorFacts.volRatio.toFixed(2)}x`);
    }
    const factorNetScore = this.buildFactorNetScore(factorFacts);

    // 板块宏观资讯与驱动逻辑（诚实标注：静态产业参考，非实时事件流）
    const macro = this.getSectorMacro(spec.category);

    // P1-6 信号生命周期：止盈触发 / 止损失效 / 数据过期
    const now = Date.now();
    const lastBarTime = d1Bars[d1Bars.length - 1]?.created_at ? new Date(d1Bars[d1Bars.length - 1].created_at).getTime() : now;
    const barAgeDays = (now - lastBarTime) / 86400000;
    let status: 'active' | 'triggered' | 'expired' = 'active';
    if (barAgeDays > 10) {
      status = 'expired';
    } else if (finalDirection === 'BUY') {
      if (stopLoss > 0 && latestPrice <= stopLoss) status = 'expired';
      else if (takeProfit > 0 && latestPrice >= takeProfit) status = 'triggered';
    } else if (finalDirection === 'SELL') {
      if (stopLoss > 0 && latestPrice >= stopLoss) status = 'expired';
      else if (takeProfit > 0 && latestPrice <= takeProfit) status = 'triggered';
    }

    const lifespanMin = Math.floor((now - lastBarTime) / 60000);
    const freshness = finalDirection === 'HOLD'
      ? '观望等待'
      : (lifespanMin < 60 ? `时间${lifespanMin}分钟` : `${Math.floor(lifespanMin / 60)}小时`);

    const id = `SIG-${symbol.replace(/[^A-Za-z0-9]/g, '')}-${now.toString().slice(-4)}`;

    return {
      id,
      symbol,
      name: `${spec.name}${symbol.replace(/^[A-Za-z]+/, '')}`,
      assetType: 'futures',
      direction: finalDirection,
      confidence,
      starRating,
      freshness,
      timestamp: now,
      status,
      quality: finalDirection === 'HOLD' ? 'low' : (starRating >= 4 ? 'high' : (starRating === 3 ? 'medium' : 'low')),
      tradingPlan: {
        entry,
        stopLoss,
        takeProfit,
        riskReward,
        positionPct
      },
      tripleScreen: {
        d1Trend,
        h1Signal,
        m30Confirm,
        chanPattern
      },
      resonance: {
        strategy: {
          total: votes.length,
          bullish: bullishVotes,
          bearish: bearishVotes,
          neutral: neutralVotes,
          highlights: strategyHighlights
        },
        factors: {
          total: 4,
          netScore: factorNetScore,
          highlights: factorHighlights
        },
        macro
      },
      reason: decision.reasons && decision.reasons.length > 0
        ? `多周期动态分析：${decision.reasons[0]}；ADX(${adx.toFixed(1)})${trending ? '趋势达标' : '不足(滤网拦截)'}；${chanPattern}${finalDirection === 'HOLD' ? '；当前不构成方向性交易' : `；建议参考入场位 ¥${entry}。`}`
        : `${chanPattern}；${finalDirection === 'HOLD' ? '各周期未共振，保持观望' : `ML综合概率预测与技术指标指向${finalDirection === 'BUY' ? '做多' : '沽空'}。`}`
    };
  }

  /**
   * 板块维度信号校准参数（按波动率特征设定，起步经验值，可依回测持续调优）
   */
  private getCalibration(category: string): { adxMin: number; scoreThresholdBase: number; trendTolPct: number; m30TolPct: number } {
    switch (category) {
      case '黑色金属': return { adxMin: 20, scoreThresholdBase: 38, trendTolPct: 0.4, m30TolPct: 0.2 };
      case '有色金属': return { adxMin: 18, scoreThresholdBase: 34, trendTolPct: 0.35, m30TolPct: 0.2 };
      case '能源化工': return { adxMin: 17, scoreThresholdBase: 32, trendTolPct: 0.5, m30TolPct: 0.25 };
      case '农产品': return { adxMin: 16, scoreThresholdBase: 30, trendTolPct: 0.6, m30TolPct: 0.3 };
      default: return { adxMin: 20, scoreThresholdBase: 35, trendTolPct: 0.4, m30TolPct: 0.2 };
    }
  }

  /**
   * 真实简因子事实集（源自 D1 K线，非伪造值）
   */
  private buildFactorFacts(bars: any[]): { momentum5: number; momentum20: number; rsi14: number; atrPct: number; volRatio: number; pos20: number } {
    const closes = bars.map((b: any) => Number(b.close || 0));
    const n = closes.length;
    const c = closes[n - 1] || 0;
    const momentum5 = n >= 6 && closes[n - 6] > 0 ? ((c / closes[n - 6]) - 1) * 100 : 0;
    const momentum20 = n >= 21 && closes[n - 21] > 0 ? ((c / closes[n - 21]) - 1) * 100 : 0;
    const rsi14 = this.calcRSI(closes, 14);
    const atrPct = this.calcAtrPct(bars, 14);
    const avgVol = bars.slice(-10).reduce((s: number, b: any) => s + Number(b.volume || 0), 0) / Math.min(n, 10);
    const volRatio = avgVol > 0 ? Number(bars[n - 1]?.volume || 0) / avgVol : 0;
    const window = closes.slice(-20);
    const hi = Math.max(...window);
    const lo = Math.min(...window);
    const pos20 = hi === lo ? 50 : ((c - lo) / (hi - lo)) * 100;
    return { momentum5, momentum20, rsi14, atrPct, volRatio, pos20 };
  }

  /**
   * 因子净得分：由真实简因子合成，方向与数值均来自实际数据
   */
  private buildFactorNetScore(f: { momentum5: number; rsi14: number; pos20: number; volRatio: number }): number {
    const raw = f.momentum5 * 2 + (f.rsi14 - 50) * 0.6 + (f.pos20 - 50) * 0.5 + (f.volRatio - 1) * 10;
    return Math.round(Math.max(-100, Math.min(100, raw)));
  }

  /**
   * 缠论形态模式识别算法
   */
  private analyzeChanPattern(bars: any[]): string {
    if (!bars || bars.length < 5) return '数据样本积累中';
    const n = bars.length;
    const b0 = bars[n - 1]; // 当前K线
    const b1 = bars[n - 2];
    const b2 = bars[n - 3];
    const b3 = bars[n - 4];

    // 底分型判定：中间K线低点最低，左右K线低点均高于它
    if (b1.low < b2.low && b1.low < b0.low) {
      if (b0.close > b1.high) {
        return '日线底分型确立 + 一买向上突破';
      } else {
        return '底分型初成，待放量确认';
      }
    }

    // 顶分型判定：中间K线高点最高，左右K线高点均低于它
    if (b1.high > b2.high && b1.high > b0.high) {
      if (b0.close < b1.low) {
        return '日线顶分型确立 + 一卖向下突破';
      } else {
        return '顶分型滞涨，谨防冲高回落';
      }
    }

    // 连续上涨或下跌判定
    if (b0.close > b1.high && b1.close > b2.high) {
      return '多头向上笔延伸，中枢上方进攻';
    } else if (b0.close < b1.low && b1.close < b2.low) {
      return '空头向下笔延伸，中枢破位寻底';
    }

    return '中枢内部震荡蓄势';
  }

  /**
   * 板块宏观与行业逻辑参考
   * 诚实标注：当前未接入实时新闻流，sentiment 恒为 neutral，news 为静态产业逻辑参考而非实时事件快讯
   */
  private getSectorMacro(category: string): { sentiment: 'positive' | 'negative' | 'neutral'; news: string[] } {
    const reference = (() => {
      switch (category) {
        case '黑色金属':
          return '基建投资与钢厂开工、炉料库存等产业链环节是黑色板块（RB/I等）的关键驱动，未接入实时新闻流';
        case '能源化工':
          return '原油/煤炭成本端与炼化、聚烯烃检修开工是能化板块（RU/MA/BU等）的关键驱动，未接入实时新闻流';
        case '农产品':
          return '产区天气、进口到港与饲料需求是农产品板块（M等）的关键驱动，未接入实时新闻流';
        case '有色金属':
          return '库存、TC加工费与新能源/电网需求是有色板块（CU/AL等）的关键驱动，未接入实时新闻流';
        default:
          return '宏观景气与行业供需为大宗商品共性驱动，未接入实时新闻流';
      }
    })();
    return {
      sentiment: 'neutral',
      news: [
        `静态产业逻辑参考(非实时事件)：${reference}。`,
        '行业资讯接入中——上线后此处将替换为真实新闻流，当前不据此调整方向。'
      ]
    };
  }

  /**
   * 简单移动平均
   */
  private calcMA(data: number[], period: number): number {
    if (!data || data.length === 0) return 0;
    const slice = data.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Math.round((sum / slice.length) * 100) / 100;
  }

  private calcRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    if (losses === 0) return 100;
    const rs = (gains / period) / (losses / period);
    return 100 - (100 / (1 + rs));
  }

  /**
   * ATR 占价格百分比 (日线)
   */
  private calcAtrPct(bars: any[], period: number = 14): number {
    if (bars.length < 2) return 0;
    const trs: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const high = Number(bars[i].high || 0);
      const low = Number(bars[i].low || 0);
      const prevClose = Number(bars[i - 1].close || 0);
      trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    }
    const slice = trs.slice(-period);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const price = Number(bars[bars.length - 1].close || 0);
    return price > 0 ? avg / price : 0;
  }

  /**
   * 平均趋向指数 ADX（Wilder），用于过滤震荡市
   */
  private calcADX(bars: any[], period: number = 14): number {
    if (!bars || bars.length < period * 2 + 1) return 0;
    const highs = bars.map((b: any) => Number(b.high || 0));
    const lows = bars.map((b: any) => Number(b.low || 0));
    const closes = bars.map((b: any) => Number(b.close || 0));
    const n = bars.length;

    const trArr: number[] = [];
    const pdmArr: number[] = [];
    const ndmArr: number[] = [];
    for (let i = 1; i < n; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      trArr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
      pdmArr.push(upMove > downMove && upMove > 0 ? upMove : 0);
      ndmArr.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    const wilderSmooth = (arr: number[], p: number): number[] => {
      const out: number[] = [];
      let s = 0;
      for (let i = 0; i < p; i++) s += arr[i];
      out.push(s);
      for (let i = p; i < arr.length; i++) out.push(out[out.length - 1] - out[out.length - 1] / p + arr[i]);
      return out;
    };

    const trS = wilderSmooth(trArr, period);
    const pS = wilderSmooth(pdmArr, period);
    const nS = wilderSmooth(ndmArr, period);

    const dxArr: number[] = [];
    for (let i = 0; i < trS.length; i++) {
      if (trS[i] <= 0) continue;
      const pdi = (pS[i] / trS[i]) * 100;
      const ndi = (nS[i] / trS[i]) * 100;
      const sum = pdi + ndi;
      dxArr.push(sum > 0 ? Math.abs(pdi - ndi) / sum * 100 : 0);
    }
    if (dxArr.length < period) return dxArr.length ? dxArr[dxArr.length - 1] : 0;
    let adxSum = 0;
    for (let i = dxArr.length - period; i < dxArr.length; i++) adxSum += dxArr[i];
    return adxSum / period;
  }
}

export const liveSignalEngine = new LiveSignalEngine();
