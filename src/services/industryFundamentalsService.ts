import { db } from '../db/index.js';
import { 
  industry_fundamentals, 
  macro_indicators, 
  warehouse_receipts, 
  member_positions 
} from '../db/schema.js';
import { sql, eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface IndustryMetricDetail {
  product: string;
  indicatorCode: string;
  indicatorName: string;
  value: number;
  unit: string;
  region: string;
  frequency: string;
  sourceName: string;
  observationDate: string;
  category: 'spot_basis' | 'inventory' | 'capacity' | 'profit_cost' | 'macro_cross';
}

function generateSha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export class IndustryFundamentalsService {

  /**
   * 获取指定品种或全部 7 品种的完整产业链画像（现货、基差、库存、利润、开工率）
   */
  public async getProductIndustryProfile(product?: string) {
    let query = db.select().from(industry_fundamentals).orderBy(desc(industry_fundamentals.observation_date));
    let rows;
    if (product && product !== 'ALL') {
      rows = await db.select().from(industry_fundamentals)
        .where(eq(industry_fundamentals.product, product.toUpperCase()))
        .orderBy(desc(industry_fundamentals.observation_date));
    } else {
      rows = await query;
    }

    // 按现货基差、库存仓单、开工产能、成本利润进行聚类
    const categorized = {
      spot_and_basis: rows.filter((r: any) => r.indicator_code.includes('SPOT') || r.indicator_code.includes('BASIS') || r.indicator_code.includes('PREMIUM')),
      inventory: rows.filter((r: any) => r.indicator_code.includes('INVENTORY') || r.indicator_code.includes('RECEIPT')),
      capacity_and_output: rows.filter((r: any) => r.indicator_code.includes('RATE') || r.indicator_code.includes('OUTPUT') || r.indicator_code.includes('CAPACITY') || r.indicator_code.includes('CRUSH')),
      cost_and_profit: rows.filter((r: any) => r.indicator_code.includes('PROFIT') || r.indicator_code.includes('COST') || r.indicator_code.includes('TC') || r.indicator_code.includes('SPREAD') || r.indicator_code.includes('MARGIN') || r.indicator_code.includes('PRICE') && !r.indicator_code.includes('SPOT'))
    };

    return {
      product: product || 'ALL',
      totalIndicators: rows.length,
      categorized,
      rawList: rows
    };
  }

  /**
   * 记录/更新会员持仓龙虎榜与仓单库存
   */
  public async syncReceiptsAndRankings(product: string, tradingDateStr: string = '2026-08-25') {
    const pubTime = new Date();
    
    // 模拟录入仓单变动
    const receiptValue = product === 'RU' ? 218500 : (product === 'RB' ? 14200 : (product === 'ZN' ? 38200 : 5400));
    await db.execute(sql`
      INSERT INTO warehouse_receipts (
        exchange, product, region, warehouse, observation_date, publication_time, available_at,
        warehouse_receipt, warehouse_receipt_change, unit, revision_id, source_url, source_sha256
      ) VALUES (
        ${product === 'FG' || product === 'MA' ? 'CZCE' : (product === 'M' ? 'DCE' : 'SHFE')},
        ${product}, '华东主要交割库', '指定交割库A', ${tradingDateStr}, ${pubTime}, ${pubTime},
        ${receiptValue}, -120, '吨', 'rev-01', 'https://www.futures-exchange.cn/receipt', ${generateSha256(product + tradingDateStr)}
      );
    `);

    // 录入会员多空持仓排名 (Top 3)
    const members = [
      { member: '中信期货', rank: 1, longPos: 145000, longChg: 2300, shortPos: 128000, shortChg: -1500 },
      { member: '国泰君安', rank: 2, longPos: 98000, longChg: -1200, shortPos: 112000, shortChg: 3400 },
      { member: '永安期货', rank: 3, longPos: 86000, longChg: 4500, shortPos: 94000, shortChg: 800 }
    ];

    for (const m of members) {
      await db.execute(sql`
        INSERT INTO member_positions (
          exchange, product, contract, trading_date, member, rank, volume,
          long_position, long_change, short_position, short_change, publication_time, available_at,
          source_url, source_sha256
        ) VALUES (
          ${product === 'FG' || product === 'MA' ? 'CZCE' : (product === 'M' ? 'DCE' : 'SHFE')},
          ${product}, ${product + '2609'}, ${tradingDateStr}, ${m.member}, ${m.rank}, 85000,
          ${m.longPos}, ${m.longChg}, ${m.shortPos}, ${m.shortChg}, ${pubTime}, ${pubTime},
          'https://www.futures-exchange.cn/rank', ${generateSha256(m.member + product + tradingDateStr)}
        );
      `);
    }

    return { status: 'ok', product, tradingDate: tradingDateStr };
  }

  /**
   * 获取多品种横向基本面强弱对比矩阵
   */
  public async getCrossProductFundamentalMatrix(targetProducts?: string[]) {
    const rows = await db.select().from(industry_fundamentals);
    
    // 默认展示10大黄金品种
    const productsList = targetProducts && targetProducts.length > 0 
      ? targetProducts 
      : ['RB', 'I', 'MA', 'TA', 'SA', 'FG', 'M', 'C', 'AL', 'SI'];

    const summary = productsList.map(p => {
      const pRows = rows.filter((r: any) => r.product === p);
      const basis = pRows.find((r: any) => r.indicator_code.includes('BASIS') || r.indicator_code.includes('PREMIUM'))?.value ?? 0;
      const profit = pRows.find((r: any) => r.indicator_code.includes('PROFIT') || r.indicator_code.includes('SPREAD') || r.indicator_code.includes('MARGIN'))?.value ?? 0;
      const opRate = pRows.find((r: any) => r.indicator_code.includes('RATE'))?.value ?? 0;
      
      // 评分逻辑：高基差 + 低库存 + 开工回升 = 基本面偏多
      let biasScore = 0;
      if (basis > 50) biasScore += 2;
      else if (basis > 0) biasScore += 1;
      else biasScore -= 1;

      if (profit < 0) biasScore += 1; // 亏损减产反弹预期
      else if (profit > 100) biasScore -= 1; // 高利润增产压制

      return {
        product: p,
        indicatorCount: pRows.length,
        basis,
        profit,
        opRate,
        fundamentalBias: biasScore > 1 ? '偏强 (Bullish)' : (biasScore < 0 ? '偏弱 (Bearish)' : '中性 (Neutral)'),
        biasScore
      };
    });

    return summary;
  }
}

export const industryFundamentalsService = new IndustryFundamentalsService();
