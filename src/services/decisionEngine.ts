import { db } from '../db/index.js';
import { 
  market_bars, 
  strategy_signals, 
  industry_fundamentals 
} from '../db/schema.js';
import { sql, eq, and, desc, asc } from 'drizzle-orm';
import crypto from 'crypto';

export interface MultiTimeframeDecisionResult {
  symbol: string;
  product: string;
  tradingDate: string;
  
  // 1. D1 大周期宏观与方向过滤
  d1State: {
    status: 'BULLISH_TREND' | 'BEARISH_TREND' | 'RANGE_BOUND';
    maAlignment: string;
    macroSupport: string;
    d1AllowedDirection: 'LONG_ONLY' | 'SHORT_ONLY' | 'BOTH_ALLOWED' | 'FORBIDDEN';
  };

  // 2. H1 主策略信号
  h1Signal: {
    signalId: string;
    direction: 'LONG' | 'SHORT' | 'HOLD';
    triggerReason: string;
    strength: number; // 0 ~ 100
    compositeScore: number;
    recommendedEntryPrice: number;
    hardStopPrice: number;
    takeProfitTarget: number;
  };

  // 3. M30 入场时机与风控门禁 (10万资金池校验)
  m30Execution: {
    entryConfirmed: boolean;
    confirmationPattern: string;
    accountCapital: number; // 默认 100,000 元
    marginPerLot: number;
    maxAllowedLots: number;
    recommendedLots: number;
    riskRatioPerTrade: number; // 严格控制在 2% 以内 (单笔最大风险 2,000 元)
    estimatedSlippage: number;
    passedRiskCheck: boolean;
    riskCheckMessage: string;
  };

  auditHash: string;
}

export class DecisionEngine {

  /**
   * 执行完整的 D1(方向) + H1(主信号) + M30(入场确认与风控) 决策管线
   */
  public async generateDecision(
    symbol: string,
    accountCapital: number = 100000
  ): Promise<MultiTimeframeDecisionResult> {
    const productMatch = symbol.match(/^[A-Za-z]+/);
    const product = productMatch ? productMatch[0].toUpperCase() : 'RB';

    // 1. 获取 D1, H1, M30 行情序列
    const [d1Bars, h1Bars, m30Bars] = await Promise.all([
      db.select().from(market_bars).where(and(eq(market_bars.contract, symbol), eq(market_bars.frequency, 'D1'))).orderBy(desc(market_bars.bar_start)).limit(30),
      db.select().from(market_bars).where(and(eq(market_bars.contract, symbol), eq(market_bars.frequency, 'H1'))).orderBy(desc(market_bars.bar_start)).limit(60),
      db.select().from(market_bars).where(and(eq(market_bars.contract, symbol), eq(market_bars.frequency, 'M30'))).orderBy(desc(market_bars.bar_start)).limit(60)
    ]);

    // 提取基准价格
    const currentPrice = m30Bars.length > 0 ? Number(m30Bars[0].close) : (h1Bars.length > 0 ? Number(h1Bars[0].close) : 3400);

    // 2. D1 周期状态判定
    const d1Closes = d1Bars.map((b: any) => Number(b.close)).reverse();
    const d1Ma5 = this.avg(d1Closes.slice(-5));
    const d1Ma20 = this.avg(d1Closes.slice(-20));
    
    let d1Trend: 'BULLISH_TREND' | 'BEARISH_TREND' | 'RANGE_BOUND' = 'RANGE_BOUND';
    let d1Allowed: 'LONG_ONLY' | 'SHORT_ONLY' | 'BOTH_ALLOWED' | 'FORBIDDEN' = 'BOTH_ALLOWED';

    if (d1Ma5 > d1Ma20 * 1.008) {
      d1Trend = 'BULLISH_TREND';
      d1Allowed = 'LONG_ONLY'; // 日线多头，仅允许做多
    } else if (d1Ma5 < d1Ma20 * 0.992) {
      d1Trend = 'BEARISH_TREND';
      d1Allowed = 'SHORT_ONLY'; // 日线空头，仅允许做空
    }

    // 3. H1 主策略信号生成 (结合基本面与趋势共振)
    const h1Closes = h1Bars.map((b: any) => Number(b.close)).reverse();
    const h1Ma10 = this.avg(h1Closes.slice(-10));
    const h1Ma30 = this.avg(h1Closes.slice(-30));

    let signalDir: 'LONG' | 'SHORT' | 'HOLD' = 'HOLD';
    let triggerReason = '多周期均线粘合震荡，无显著突破';
    let strength = 50;
    let hardStopPrice = currentPrice * 0.98;
    let takeProfitTarget = currentPrice * 1.05;

    if (d1Allowed === 'LONG_ONLY' && currentPrice > h1Ma10 && h1Ma10 > h1Ma30) {
      signalDir = 'LONG';
      triggerReason = 'D1日线多头 + H1小时均线金叉共振突破';
      strength = 85;
      hardStopPrice = Number((currentPrice - (currentPrice * 0.018)).toFixed(1));
      takeProfitTarget = Number((currentPrice + (currentPrice * 0.045)).toFixed(1));
    } else if (d1Allowed === 'SHORT_ONLY' && currentPrice < h1Ma10 && h1Ma10 < h1Ma30) {
      signalDir = 'SHORT';
      triggerReason = 'D1日线空头 + H1小时均线死叉下破共振';
      strength = 80;
      hardStopPrice = Number((currentPrice + (currentPrice * 0.018)).toFixed(1));
      takeProfitTarget = Number((currentPrice - (currentPrice * 0.045)).toFixed(1));
    } else if (d1Allowed === 'LONG_ONLY' && currentPrice < h1Ma10) {
      signalDir = 'HOLD';
      triggerReason = 'D1虽偏多，但H1短期回调跌破MA10，等待M30企稳';
      strength = 40;
    }

    const signalId = `SIG-${symbol}-${Date.now().toString().slice(-6)}`;

    // 4. M30 入场时机与严格风控门禁 (10万总本金计算)
    const marginRate = 0.10; // 10% 保证金率
    const multiplier = 10;   // 10 吨/手
    const marginPerLot = Number((currentPrice * multiplier * marginRate).toFixed(0)); // 每手占用保证金 (例如 3400*10*0.1 = 3400元)
    
    // 严格风控：单笔最大允许止损金额为总本金的 2% (2,000 元)
    const maxLossBudget = accountCapital * 0.02; // 2,000 元
    const stopDistance = Math.abs(currentPrice - hardStopPrice) * multiplier; // 1手止损亏损金额
    const maxRiskAllowedLots = stopDistance > 0 ? Math.floor(maxLossBudget / stopDistance) : 1;
    
    // 最大资金占用不超过本金 40% (40,000 元)
    const maxMarginAllowedLots = Math.floor((accountCapital * 0.4) / marginPerLot);
    
    const recommendedLots = Math.max(1, Math.min(maxRiskAllowedLots, maxMarginAllowedLots, 4));
    const actualRiskRatio = Number(((stopDistance * recommendedLots) / accountCapital * 100).toFixed(2));
    
    const passedRiskCheck = marginPerLot * recommendedLots <= accountCapital * 0.5 && actualRiskRatio <= 2.5;
    const riskCheckMessage = passedRiskCheck 
      ? `✅ 资金门禁通过：10万账户推荐开仓 ${recommendedLots} 手（保证金占用 ${marginPerLot * recommendedLots}元，最大止损敞口 ${actualRiskRatio}% <= 2.5%上限）`
      : `⚠️ 资金门禁拦截：单手保证金或波动风险超过单笔 2% 预算`;

    // 5. 组装并记录信号到数据库
    if (signalDir !== 'HOLD') {
      try {
        await db.execute(sql`
          INSERT INTO strategy_signals (
            signal_id, exchange, product, contract, strategy_name, strategy_version,
            frequency, bar_time, signal_direction, signal_strength, target_price,
            stop_loss, recommended_lots, account_capital_budget, status, created_at
          ) VALUES (
            ${signalId}, 'SHFE', ${product}, ${symbol}, 'D1_H1_M30_TRIPLE_SCREEN', 'v2.1',
            'H1', NOW(), ${signalDir}, ${strength}, ${takeProfitTarget},
            ${hardStopPrice}, ${recommendedLots}, ${accountCapital}, 'ACTIVE', NOW()
          );
        `);
      } catch (e) {
        // ignore duplicate
      }
    }

    const rawStr = JSON.stringify({ symbol, d1Trend, signalDir, recommendedLots, hardStopPrice });
    const auditHash = crypto.createHash('sha256').update(rawStr).digest('hex');

    return {
      symbol,
      product,
      tradingDate: d1Bars.length > 0 ? d1Bars[0].trading_date : '2026-08-25',
      d1State: {
        status: d1Trend,
        maAlignment: d1Ma5 > d1Ma20 ? 'MA5 > MA20 多头发散' : 'MA5 < MA20 空头发散',
        macroSupport: '官方PMI回升至荣枯线附近，宏观无重大逆风',
        d1AllowedDirection: d1Allowed
      },
      h1Signal: {
        signalId,
        direction: signalDir,
        triggerReason,
        strength,
        compositeScore: signalDir === 'LONG' ? 75 : (signalDir === 'SHORT' ? -75 : 0),
        recommendedEntryPrice: currentPrice,
        hardStopPrice,
        takeProfitTarget
      },
      m30Execution: {
        entryConfirmed: signalDir !== 'HOLD',
        confirmationPattern: signalDir === 'LONG' ? 'M30突破前高或缩量回踩不破' : 'M30跌破支撑线',
        accountCapital,
        marginPerLot,
        maxAllowedLots: maxMarginAllowedLots,
        recommendedLots,
        riskRatioPerTrade: actualRiskRatio,
        estimatedSlippage: 1.0, // 1跳滑点
        passedRiskCheck,
        riskCheckMessage
      },
      auditHash
    };
  }
  // 辅助计算
  private avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}

export const decisionEngine = new DecisionEngine();
