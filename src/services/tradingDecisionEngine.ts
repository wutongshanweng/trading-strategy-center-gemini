/**
 * China Futures Quantitative Analysis & Decision Engine
 * 中国期货量化多维指标分析与交易决策建议引擎（无券商下单，纯策略决策与研判）
 */

import { KlineBar } from './klineResampler.js';
import { getContractSpec } from './chinaFuturesMaster.js';

export type DecisionType = 'BUY' | 'SELL' | 'WAIT' | 'CLOSE';

export interface TradingDecisionResult {
  symbol: string;
  contractName: string;
  exchange: string;
  period: string;
  decision: DecisionType;
  decisionLabel: string;
  confidence: number;      // 0 ~ 100
  latestPrice: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: string;
  marketRegime: '多头趋势强劲' | '空头趋势加速' | '高位震荡滞涨' | '低位筑底反弹' | '窄幅横盘中性';
  technicalScores: {
    trendScore: number;    // -100 ~ 100
    momentumScore: number; // -100 ~ 100
    volatilityScore: number; // 0 ~ 100
    volumeOiScore: number; // -100 ~ 100
  };
  keyLevels: {
    strongResistance: number;
    weakResistance: number;
    weakSupport: number;
    strongSupport: number;
  };
  reasons: string[];
  riskWarnings: string[];
  timestamp: string;
}

export class TradingDecisionEngine {
  /**
   * Generate quantitative trading decision from OHLCV bars
   */
  /**
   * Generate quantitative trading decision from OHLCV bars
   * @param options.scoreThreshold 可选的品种校准分阈值（默认 35），用于按品种波动率调整建仓门槛
   */
  public static analyze(symbol: string, period: string, bars: KlineBar[], options?: { scoreThreshold?: number }): TradingDecisionResult {
    const spec = getContractSpec(symbol);
    const sorted = [...bars].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const scoreThreshold = options?.scoreThreshold ?? 35;

    if (sorted.length < 5) {
      const dummyPrice = spec.basePrice;
      return {
        symbol: symbol.toUpperCase(),
        contractName: spec.name,
        exchange: spec.exchange,
        period,
        decision: 'WAIT',
        decisionLabel: '数据样本不足，建议观望',
        confidence: 50,
        latestPrice: dummyPrice,
        entryPrice: dummyPrice,
        stopLoss: Math.round(dummyPrice * 0.98 * 100) / 100,
        takeProfit: Math.round(dummyPrice * 1.04 * 100) / 100,
        riskRewardRatio: '2.0:1',
        marketRegime: '窄幅横盘中性',
        technicalScores: { trendScore: 0, momentumScore: 0, volatilityScore: 40, volumeOiScore: 0 },
        keyLevels: {
          strongResistance: Math.round(dummyPrice * 1.05 * 100) / 100,
          weakResistance: Math.round(dummyPrice * 1.02 * 100) / 100,
          weakSupport: Math.round(dummyPrice * 0.98 * 100) / 100,
          strongSupport: Math.round(dummyPrice * 0.95 * 100) / 100
        },
        reasons: ['历史 K 线数据样本少于 5 根，暂无法形成强共振信号'],
        riskWarnings: ['请等待更多 K 线数据入库后再做决策评估'],
        timestamp: new Date().toISOString()
      };
    }

    const latestBar = sorted[sorted.length - 1];
    const prevBar = sorted[sorted.length - 2];
    const currentPrice = latestBar.close;

    // 1. Moving Averages (MA5, MA10, MA20)
    const closes = sorted.map(b => b.close);
    const ma5 = this.calcMA(closes, 5);
    const ma10 = this.calcMA(closes, 10);
    const ma20 = this.calcMA(closes, 20);

    // 2. Momentum & RSI (14)
    const rsi14 = this.calcRSI(closes, 14);

    // 3. Volatility / ATR
    const atr = this.calcATR(sorted, 14) || (currentPrice * 0.012);

    // 4. Volume Trend
    const recentVolume = latestBar.volume;
    const avgVolume = sorted.slice(-10).reduce((sum, b) => sum + b.volume, 0) / Math.min(sorted.length, 10);
    const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 1.0;

    // Technical scoring
    let trendScore = 0;
    if (ma5 > ma10 && ma10 > ma20) trendScore = 80;
    else if (ma5 > ma20) trendScore = 40;
    else if (ma5 < ma10 && ma10 < ma20) trendScore = -80;
    else if (ma5 < ma20) trendScore = -40;

    let momentumScore = 0;
    if (rsi14 >= 70) momentumScore = -30; // Overbought warning
    else if (rsi14 <= 30) momentumScore = 60; // Oversold rebound potential
    else if (rsi14 > 50) momentumScore = (rsi14 - 50) * 2;
    else momentumScore = (rsi14 - 50) * 2;

    const volatilityScore = Math.min(100, Math.round((atr / currentPrice) * 3000));
    const volumeOiScore = volumeRatio > 1.3 ? 35 : (volumeRatio < 0.7 ? -20 : 10);

    const totalScore = (trendScore * 0.45) + (momentumScore * 0.35) + (volumeOiScore * 0.20);

    let decision: DecisionType = 'WAIT';
    let decisionLabel = '区间震荡观望 (WAIT)';
    let confidence = 50;
    let regime: TradingDecisionResult['marketRegime'] = '窄幅横盘中性';

    const reasons: string[] = [];
    const riskWarnings: string[] = [];

    if (totalScore >= scoreThreshold) {
      decision = 'BUY';
      decisionLabel = '建议顺势建多 (BUY)';
      confidence = Math.min(95, Math.round(55 + totalScore * 0.4));
      regime = trendScore > 50 ? '多头趋势强劲' : '低位筑底反弹';
      reasons.push(`短期 MA5 (¥${ma5}) 处于多头排列，价格站在关键均线之上`);
      reasons.push(`RSI 指标 (${rsi14.toFixed(1)}) 处于多头有效进攻区间`);
      if (volumeRatio > 1.2) {
        reasons.push(`放量突破，近期成交量为均量的 ${(volumeRatio * 100).toFixed(0)}%`);
      }
    } else if (totalScore <= -scoreThreshold) {
      decision = 'SELL';
      decisionLabel = '建议逢高沽空 (SELL)';
      confidence = Math.min(95, Math.round(55 + Math.abs(totalScore) * 0.4));
      regime = trendScore < -50 ? '空头趋势加速' : '高位震荡滞涨';
      reasons.push(`均线呈现空头排列 (MA5: ¥${ma5} < MA20: ¥${ma20})`);
      reasons.push(`动能指标拐头向下，空方主导盘面`);
      if (volumeRatio > 1.2) {
        reasons.push(`放量下挫，空头资金增仓压制明显`);
      }
    } else {
      decision = 'WAIT';
      decisionLabel = '信号中性，等待突破 (WAIT)';
      confidence = 60;
      regime = '窄幅横盘中性';
      reasons.push(`均线纠缠无明显单边趋势，建议等待区间突破`);
      reasons.push(`RSI (${rsi14.toFixed(1)}) 位于中性平衡轴 50 附近`);
    }

    // Key technical levels
    const weakResistance = Math.round((currentPrice + atr * 1.2) * 100) / 100;
    const strongResistance = Math.round((currentPrice + atr * 2.5) * 100) / 100;
    const weakSupport = Math.round((currentPrice - atr * 1.2) * 100) / 100;
    const strongSupport = Math.round((currentPrice - atr * 2.5) * 100) / 100;

    // Entry, SL, TP calculation
    let entryPrice = currentPrice;
    let stopLoss = 0;
    let takeProfit = 0;

    if (decision === 'BUY') {
      stopLoss = Math.round((currentPrice - atr * 1.5) * 100) / 100;
      takeProfit = Math.round((currentPrice + atr * 3.0) * 100) / 100;
    } else if (decision === 'SELL') {
      stopLoss = Math.round((currentPrice + atr * 1.5) * 100) / 100;
      takeProfit = Math.round((currentPrice - atr * 3.0) * 100) / 100;
    } else {
      stopLoss = weakSupport;
      takeProfit = weakResistance;
    }

    const riskDist = Math.abs(currentPrice - stopLoss);
    const rewardDist = Math.abs(takeProfit - currentPrice);
    const rrRatio = riskDist > 0 ? (rewardDist / riskDist).toFixed(1) + ':1' : '2.0:1';

    riskWarnings.push(`单笔交易建议风险敞口不超过账户总资金的 2%`);
    riskWarnings.push(`若日内价格有效跌破/突破止损位 ¥${stopLoss}，务必坚决止损出场`);

    return {
      symbol: symbol.toUpperCase(),
      contractName: spec.name,
      exchange: spec.exchange,
      period,
      decision,
      decisionLabel,
      confidence,
      latestPrice: currentPrice,
      entryPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio: rrRatio,
      marketRegime: regime,
      technicalScores: {
        trendScore: Math.round(trendScore),
        momentumScore: Math.round(momentumScore),
        volatilityScore: Math.round(volatilityScore),
        volumeOiScore: Math.round(volumeOiScore)
      },
      keyLevels: {
        strongResistance,
        weakResistance,
        weakSupport,
        strongSupport
      },
      reasons,
      riskWarnings,
      timestamp: new Date().toISOString()
    };
  }

  private static calcMA(data: number[], period: number): number {
    if (data.length === 0) return 0;
    const slice = data.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return Math.round((sum / slice.length) * 100) / 100;
  }

  private static calcRSI(closes: number[], period: number = 14): number {
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
    return Math.round((100 - (100 / (1 + rs))) * 10) / 10;
  }

  private static calcATR(bars: KlineBar[], period: number = 14): number {
    if (bars.length < 2) return 0;
    const trs: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const high = bars[i].high;
      const low = bars[i].low;
      const prevClose = bars[i - 1].close;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trs.push(tr);
    }
    const slice = trs.slice(-period);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return Math.round(avg * 100) / 100;
  }
}
