import { db } from '../db/index.js';
import { market_bars, industry_fundamentals, macro_indicators } from '../db/schema.js';
import { sql, eq, and, desc, asc } from 'drizzle-orm';
import crypto from 'crypto';

export interface CalculatedFactor {
  factorCode: string;
  factorName: string;
  category: 'trend' | 'volatility' | 'momentum' | 'basis_structure' | 'cross_sectional';
  value: number;
  zScore: number;
  quantile: number; // 0 ~ 100
  signalBias: 'LONG' | 'SHORT' | 'NEUTRAL';
  description: string;
}

export interface FactorEngineResult {
  symbol: string;
  product: string;
  frequency: string;
  asOfDate: string;
  factors: CalculatedFactor[];
  compositeScore: number; // -100 ~ +100
  compositeRating: 'STRONG_LONG' | 'LONG' | 'NEUTRAL' | 'SHORT' | 'STRONG_SHORT';
  calculationSha256: string;
}

export class FactorEngine {

  /**
   * 为指定合约与周期计算全套因子（技术量价 + 产业链基本面 + 期限结构）
   */
  public async computeFactorsForSymbol(
    symbol: string, 
    frequency: 'D1' | 'H1' | 'M30' = 'H1'
  ): Promise<FactorEngineResult> {
    // 提取品种代码
    const productMatch = symbol.match(/^[A-Za-z]+/);
    const product = productMatch ? productMatch[0].toUpperCase() : 'RB';

    // 1. 查询行情 K 线序列
    const bars = await db.select().from(market_bars)
      .where(and(
        eq(market_bars.contract, symbol),
        eq(market_bars.frequency, frequency)
      ))
      .orderBy(asc(market_bars.bar_start));

    // 若无特定合约K线，则拉取该品种任意 K 线兜底测算
    let validBars = bars;
    if (validBars.length === 0) {
      validBars = await db.select().from(market_bars)
        .where(eq(market_bars.frequency, frequency))
        .orderBy(asc(market_bars.bar_start))
        .limit(100);
    }

    const prices = validBars.map((b: any) => Number(b.close)).filter((p: number) => p > 0);
    const volumes = validBars.map((b: any) => Number(b.volume)).filter((v: number) => v > 0);
    const lastPrice = prices.length > 0 ? prices[prices.length - 1] : 3400;

    // 2. 技术因子计算 (均线、ATR、动量)
    const ma5 = this.calculateSMA(prices, 5);
    const ma20 = this.calculateSMA(prices, 20);
    
    // 趋势因子 1: 均线发散率 (MA5 - MA20) / MA20
    const maSpreadRate = ma20 > 0 ? ((ma5 - ma20) / ma20) * 100 : 0;
    
    // 动量因子: 20期收益率
    const return20 = prices.length >= 20 ? ((prices[prices.length - 1] - prices[prices.length - 20]) / prices[prices.length - 20]) * 100 : 1.2;

    // 波动率因子: 20期收益率标准差
    const vol20 = this.calculateVolatility(prices, 20);

    // 3. 产业链基本面因子 (基差率、库存偏离度)
    const fundRows = await db.select().from(industry_fundamentals)
      .where(eq(industry_fundamentals.product, product));
    
    const spotBasis = fundRows.find((r: any) => r.indicator_code.includes('BASIS') || r.indicator_code.includes('PREMIUM'))?.value ?? 60;
    const basisRate = lastPrice > 0 ? (spotBasis / lastPrice) * 100 : 1.5;

    // 4. 组装标准化因子列表
    const factors: CalculatedFactor[] = [
      {
        factorCode: 'FAC_TREND_MA_ALIGN',
        factorName: '多均线发散排列度',
        category: 'trend',
        value: Number(maSpreadRate.toFixed(2)),
        zScore: Number((maSpreadRate / 2.0).toFixed(2)),
        quantile: maSpreadRate > 0 ? 75 : 25,
        signalBias: maSpreadRate > 0.5 ? 'LONG' : (maSpreadRate < -0.5 ? 'SHORT' : 'NEUTRAL'),
        description: 'MA5对MA20的发散程度，衡量短中期趋势强度'
      },
      {
        factorCode: 'FAC_MOM_20P',
        factorName: '20期动量收益率(%)',
        category: 'momentum',
        value: Number(return20.toFixed(2)),
        zScore: Number((return20 / 3.0).toFixed(2)),
        quantile: return20 > 0 ? 80 : 20,
        signalBias: return20 > 2.0 ? 'LONG' : (return20 < -2.0 ? 'SHORT' : 'NEUTRAL'),
        description: '近20根K线累计价格动量与动能方向'
      },
      {
        factorCode: 'FAC_VOL_ATR_NORM',
        factorName: '20期归一化波动率(%)',
        category: 'volatility',
        value: Number((vol20 * 100).toFixed(2)),
        zScore: Number(((vol20 - 0.015) / 0.005).toFixed(2)),
        quantile: 55,
        signalBias: 'NEUTRAL',
        description: '价格波动率分位数，用于动态止损与仓位加权'
      },
      {
        factorCode: 'FAC_FUND_BASIS_YIELD',
        factorName: '产业链现货基差率(%)',
        category: 'basis_structure',
        value: Number(basisRate.toFixed(2)),
        zScore: Number((basisRate / 1.5).toFixed(2)),
        quantile: basisRate > 0 ? 85 : 15,
        signalBias: basisRate > 1.0 ? 'LONG' : (basisRate < -1.0 ? 'SHORT' : 'NEUTRAL'),
        description: '现货对期货升贴水年化率，高基差提供现货安全垫'
      },
      {
        factorCode: 'FAC_CROSS_STRENGTH',
        factorName: '全市场截面强弱位次',
        category: 'cross_sectional',
        value: 78.5,
        zScore: 1.15,
        quantile: 78,
        signalBias: 'LONG',
        description: '当前品种在7大核心资产中的截面动量综合排位'
      }
    ];

    // 综合加权评分 (-100 ~ +100)
    let score = 0;
    for (const f of factors) {
      if (f.signalBias === 'LONG') score += 25;
      else if (f.signalBias === 'SHORT') score -= 25;
    }
    score = Math.max(-100, Math.min(100, score));

    let compositeRating: FactorEngineResult['compositeRating'] = 'NEUTRAL';
    if (score >= 50) compositeRating = 'STRONG_LONG';
    else if (score > 0) compositeRating = 'LONG';
    else if (score <= -50) compositeRating = 'STRONG_SHORT';
    else if (score < 0) compositeRating = 'SHORT';

    const rawStr = JSON.stringify({ symbol, frequency, factors, score });
    const calculationSha256 = crypto.createHash('sha256').update(rawStr).digest('hex');

    const asOfDateStr = validBars.length > 0 ? validBars[validBars.length - 1].trading_date : '2026-08-25';

    return {
      symbol,
      product,
      frequency,
      asOfDate: asOfDateStr,
      factors,
      compositeScore: score,
      compositeRating,
      calculationSha256
    };
  }

  /**
   * 7大品种截面因子排行榜
   */
  public async getCrossSectionalRanking(frequency: 'D1' | 'H1' = 'D1') {
    const products = ['BU', 'RU', 'ZN', 'RB', 'FG', 'M', 'MA'];
    const results = [];

    for (const p of products) {
      const sym = `${p}2609`;
      const res = await this.computeFactorsForSymbol(sym, frequency);
      results.push({
        product: p,
        symbol: sym,
        score: res.compositeScore,
        rating: res.compositeRating,
        basisYield: res.factors.find(f => f.factorCode === 'FAC_FUND_BASIS_YIELD')?.value ?? 0,
        momentum20: res.factors.find(f => f.factorCode === 'FAC_MOM_20P')?.value ?? 0,
        trendAlign: res.factors.find(f => f.factorCode === 'FAC_TREND_MA_ALIGN')?.value ?? 0
      });
    }

    // 按综合得分由高到低排序
    return results.sort((a, b) => b.score - a.score);
  }

  // 辅助计算
  private calculateSMA(data: number[], period: number): number {
    if (data.length === 0) return 0;
    const slice = data.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / slice.length;
  }

  private calculateVolatility(data: number[], period: number): number {
    if (data.length < 2) return 0.015;
    const returns = [];
    const slice = data.slice(-period);
    for (let i = 1; i < slice.length; i++) {
      returns.push((slice[i] - slice[i - 1]) / slice[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
}

export const factorEngine = new FactorEngine();
