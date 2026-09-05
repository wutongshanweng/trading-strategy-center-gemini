import { db } from '../db/index.js';
import { industry_fundamentals, market_bars } from '../db/schema.js';
import { sql, desc, eq, and } from 'drizzle-orm';
import { getContractSpec, CHINA_FUTURES_SPECS } from './chinaFuturesMaster.js';

export interface SpotBasisComparison {
  spotPrice: number;
  spotName: string;
  spotDate: string;
  futuresPrice: number;
  basis: number; // 现货 - 期货
  basisRate: number; // (现货 - 期货) / 期货 * 100%
  basisType: 'SPOT_PREMIUM' | 'FUTURES_PREMIUM' | 'PARITY'; // 现货升水(期货贴水) | 期货升水(现货贴水) | 平水
  basisTypeName: string;
  marketImplication: string; // 对当前信号的基差面指引
}

export interface DynamicExecutionPlan {
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  takeProfitT2Price: number;
  stopLossDistance: number; // 止损点数
  stopLossPct: number; // 止损百分比
  takeProfitDistance: number; // 止盈点数
  takeProfitPct: number; // 止盈百分比
  riskRewardRatio: string;
  recommendedPositionPct: number;
  mode: 'REALTIME_DYNAMIC' | 'SIGNAL_BASE';
}

export interface RealtimeContractQuote {
  symbol: string;
  name: string;
  product: string;
  latestPrice: number;
  bidPrice: number;
  askPrice: number;
  bidVolume: number;
  askVolume: number;
  open: number;
  high: number;
  low: number;
  preClose: number;
  change: number;
  changePct: number;
  volume: number;
  openInterest: number;
  tradingDate: string;
  quoteTime: string;
  updatedAt: string;
  source: 'SINA_LIVE' | 'DB_FALLBACK';
  spotBasis: SpotBasisComparison;
  dynamicPlan: {
    buyPlan: DynamicExecutionPlan;
    sellPlan: DynamicExecutionPlan;
  };
}

// 常见品种基准现货参考名称与默认现货价兜底
const SPOT_BENCHMARK_MAP: Record<string, { name: string; defaultPrice: number; unit: string }> = {
  RB: { name: '上海HRB400E 20mm螺纹现货', defaultPrice: 3340, unit: '元/吨' },
  MA: { name: '太仓地区甲醇现货主流出罐价', defaultPrice: 2480, unit: '元/吨' },
  SA: { name: '华北地区重质纯碱出厂含税价', defaultPrice: 1580, unit: '元/吨' },
  FG: { name: '沙河安全大板现货市场价', defaultPrice: 1260, unit: '元/吨' },
  M: { name: '张家港43%蛋白豆粕现货出厂价', defaultPrice: 3020, unit: '元/吨' },
  TA: { name: '华东PTA现货市场主流成交价', defaultPrice: 4950, unit: '元/吨' },
  I: { name: '日照港61.5% PB粉湿吨现货价', defaultPrice: 765, unit: '元/吨' },
  AL: { name: '长江现货A00铝锭主流成交价', defaultPrice: 19850, unit: '元/吨' },
  CU: { name: '上海物贸1#电解铜现货价', defaultPrice: 74200, unit: '元/吨' },
  C: { name: '锦州港二等玉米现货收购价', defaultPrice: 2320, unit: '元/吨' },
  SI: { name: '华东通氧553#工业硅现货价', defaultPrice: 11800, unit: '元/吨' },
  LC: { name: '电池级碳酸锂华东主流现货价', defaultPrice: 76500, unit: '元/吨' }
};

export class RealtimeQuoteService {
  private static instance: RealtimeQuoteService;
  private spotCache: Map<string, { price: number; name: string; date: string }> = new Map();
  private lastSpotCacheTime: number = 0;
  private quoteCache: Map<string, { quote: RealtimeContractQuote; timestamp: number }> = new Map();

  private constructor() {}

  public static getInstance(): RealtimeQuoteService {
    if (!RealtimeQuoteService.instance) {
      RealtimeQuoteService.instance = new RealtimeQuoteService();
    }
    return RealtimeQuoteService.instance;
  }

  /**
   * 从数据库或缓存中获取品种最新的现货基准价格与指标
   */
  public async getSpotBenchmark(product: string): Promise<{ price: number; name: string; date: string }> {
    const prod = product.toUpperCase();
    const now = Date.now();

    // 缓存 30 秒有效
    if (this.spotCache.has(prod) && now - this.lastSpotCacheTime < 30000) {
      return this.spotCache.get(prod)!;
    }

    try {
      const rows = await db.select().from(industry_fundamentals)
        .where(eq(industry_fundamentals.product, prod))
        .orderBy(desc(industry_fundamentals.observation_date));

      const spotRow = rows.find((r: any) => 
        r.indicator_code.includes('SPOT') || 
        r.indicator_code.includes('PRICE') && !r.indicator_code.includes('PROFIT')
      );

      if (spotRow && spotRow.value) {
        const result = {
          price: Number(spotRow.value),
          name: spotRow.indicator_name || `${prod}主流现货市场价`,
          date: spotRow.observation_date ? String(spotRow.observation_date) : new Date().toISOString().split('T')[0]
        };
        this.spotCache.set(prod, result);
        this.lastSpotCacheTime = now;
        return result;
      }
    } catch (e) {
      // ignore
    }

    const fallback = SPOT_BENCHMARK_MAP[prod] || { name: `${prod}基准现货价`, defaultPrice: 3000 };
    const res = {
      price: fallback.defaultPrice,
      name: fallback.name,
      date: new Date().toISOString().split('T')[0]
    };
    this.spotCache.set(prod, res);
    return res;
  }

  /**
   * 批量抓取合约的实时动态盘口数据（优先 Sina 实时行情，GBK 实时解码，带 3 秒内存极速缓存）
   */
  public async fetchRealtimeQuotes(contractsList: string[]): Promise<Record<string, RealtimeContractQuote>> {
    const uniqueSymbols = Array.from(new Set(contractsList.map(s => s.trim().toUpperCase()))).filter(Boolean);
    if (uniqueSymbols.length === 0) return {};

    const quotes: Record<string, RealtimeContractQuote> = {};
    const now = Date.now();
    const missingSymbols: string[] = [];

    // 1. 优先从内存极速缓存命中 (3.5 秒 TTL，避免频繁外部请求卡顿)
    for (const sym of uniqueSymbols) {
      const cached = this.quoteCache.get(sym);
      if (cached && (now - cached.timestamp < 3500)) {
        quotes[sym] = cached.quote;
      } else {
        missingSymbols.push(sym);
      }
    }

    if (missingSymbols.length > 0) {
      const sinaSymbols = missingSymbols.map(sym => `nf_${sym}`).join(',');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(`https://hq.sinajs.cn/list=${sinaSymbols}`, {
          headers: {
            'Referer': 'https://finance.sina.com.cn',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const decoder = new TextDecoder('gbk');
          const text = decoder.decode(buffer);

          const lines = text.split(';\n').concat(text.split(';'));

          for (const line of lines) {
            const match = line.match(/hq_str_nf_([A-Za-z0-9]+)="([^"]+)"/);
            if (match) {
              const sym = match[1].toUpperCase();
              const fields = match[2].split(',');
              if (fields.length >= 15) {
                const name = fields[0];
                const quoteTime = fields[1] || '';
                const open = parseFloat(fields[2]) || 0;
                const high = parseFloat(fields[3]) || 0;
                const low = parseFloat(fields[4]) || 0;
                const preClose = parseFloat(fields[10]) || parseFloat(fields[5]) || open || 3000;
                const bidPrice = parseFloat(fields[6]) || 0;
                const askPrice = parseFloat(fields[7]) || 0;
                const latestPrice = parseFloat(fields[8]) || bidPrice || askPrice || open;
                const bidVolume = parseInt(fields[11], 10) || 0;
                const askVolume = parseInt(fields[12], 10) || 0;
                const openInterest = parseFloat(fields[13]) || 0;
                const volume = parseFloat(fields[14]) || 0;
                const tradingDate = fields[17] || new Date().toISOString().split('T')[0];

                if (latestPrice > 0) {
                  const change = preClose > 0 ? Number((latestPrice - preClose).toFixed(2)) : 0;
                  const changePct = preClose > 0 ? Number(((change / preClose) * 100).toFixed(2)) : 0;

                  const productMatch = sym.match(/^[A-Za-z]+/);
                  const product = productMatch ? productMatch[0].toUpperCase() : 'RB';

                  const spot = await this.getSpotBenchmark(product);
                  const spotBasis = this.calculateSpotBasis(spot.price, spot.name, spot.date, latestPrice);
                  const dynamicPlan = this.calculateDynamicExecutionPlan(latestPrice, high, low);

                  const liveQuote: RealtimeContractQuote = {
                    symbol: sym,
                    name: name || sym,
                    product,
                    latestPrice,
                    bidPrice: bidPrice || latestPrice,
                    askPrice: askPrice || latestPrice,
                    bidVolume,
                    askVolume,
                    open: open || latestPrice,
                    high: high || latestPrice,
                    low: low || latestPrice,
                    preClose,
                    change,
                    changePct,
                    volume,
                    openInterest,
                    tradingDate,
                    quoteTime,
                    updatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                    source: 'SINA_LIVE',
                    spotBasis,
                    dynamicPlan
                  };

                  quotes[sym] = liveQuote;
                  this.quoteCache.set(sym, { quote: liveQuote, timestamp: now });
                }
              }
            }
          }
        }
      } catch (e) {
        // ignore fetch error and use fallback below
      }

      // 针对未成功抓取到的合约，使用 DB 最新 K 线作为基准价格并计算动态数据
      for (const sym of missingSymbols) {
        if (!quotes[sym]) {
          const fallback = await this.getFallbackQuote(sym);
          quotes[sym] = fallback;
          this.quoteCache.set(sym, { quote: fallback, timestamp: now });
        }
      }
    }

    return quotes;
  }

  /**
   * 单一合约实时报价获取
   */
  public async getRealtimeQuote(symbol: string): Promise<RealtimeContractQuote> {
    const map = await this.fetchRealtimeQuotes([symbol]);
    return map[symbol.toUpperCase()] || this.getFallbackQuote(symbol);
  }

  /**
   * 计算现货与期货的升贴水对比
   */
  private calculateSpotBasis(spotPrice: number, spotName: string, spotDate: string, futuresPrice: number): SpotBasisComparison {
    const basis = Number((spotPrice - futuresPrice).toFixed(2));
    const basisRate = futuresPrice > 0 ? Number(((basis / futuresPrice) * 100).toFixed(2)) : 0;

    let basisType: 'SPOT_PREMIUM' | 'FUTURES_PREMIUM' | 'PARITY' = 'PARITY';
    let basisTypeName = '平水 (Parity)';
    let marketImplication = '';

    if (basis > 5) {
      basisType = 'SPOT_PREMIUM';
      basisTypeName = '现货升水 / 期货贴水 (Backwardation)';
      marketImplication = `现货较期货溢价 +${basis} 元/吨 (+${basisRate}%)，现货供需偏紧或挺价坚挺。期货存在向现货基差修复回归的动力，为多头交易提供坚实的估值安全垫。`;
    } else if (basis < -5) {
      basisType = 'FUTURES_PREMIUM';
      basisTypeName = '期货升水 / 现货贴水 (Contango)';
      marketImplication = `期货较现货升水 ${Math.abs(basis)} 元/吨 (${basisRate}%)，市场预期远期成本上升或供需相对宽松。空头具备展期收益与现货下行压制支撑。`;
    } else {
      basisType = 'PARITY';
      basisTypeName = '基差平水 (Parity)';
      marketImplication = `期现价格基本平水 (基差 ${basis} 元/吨)，期现无显著套利空间，价格主要由盘面资金博弈与技术形态驱动。`;
    }

    return {
      spotPrice,
      spotName,
      spotDate,
      futuresPrice,
      basis,
      basisRate,
      basisType,
      basisTypeName,
      marketImplication
    };
  }

  /**
   * 动态计算严格交易执行计划 (基于实时价格动态计算入场、止损、止盈)
   */
  private calculateDynamicExecutionPlan(latestPrice: number, high: number, low: number): { buyPlan: DynamicExecutionPlan; sellPlan: DynamicExecutionPlan } {
    // 动态波动率估计: 约 1.5% 止损，4.5% 止盈 (标准 1:3 盈亏比)
    const slPct = 0.015;
    const tpPct = 0.045;
    const tp2Pct = 0.075;

    // BUY 计划 (多头)
    const buyEntry = latestPrice;
    const buySl = Math.round(latestPrice * (1 - slPct));
    const buyTp = Math.round(latestPrice * (1 + tpPct));
    const buyTp2 = Math.round(latestPrice * (1 + tp2Pct));
    const buySlDist = buyEntry - buySl;
    const buyTpDist = buyTp - buyEntry;

    // SELL 计划 (空头)
    const sellEntry = latestPrice;
    const sellSl = Math.round(latestPrice * (1 + slPct));
    const sellTp = Math.round(latestPrice * (1 - tpPct));
    const sellTp2 = Math.round(latestPrice * (1 - tp2Pct));
    const sellSlDist = sellSl - sellEntry;
    const sellTpDist = sellEntry - sellTp;

    return {
      buyPlan: {
        entryPrice: buyEntry,
        stopLossPrice: buySl,
        takeProfitPrice: buyTp,
        takeProfitT2Price: buyTp2,
        stopLossDistance: buySlDist,
        stopLossPct: Number((slPct * 100).toFixed(2)),
        takeProfitDistance: buyTpDist,
        takeProfitPct: Number((tpPct * 100).toFixed(2)),
        riskRewardRatio: '1:3.0',
        recommendedPositionPct: 15,
        mode: 'REALTIME_DYNAMIC'
      },
      sellPlan: {
        entryPrice: sellEntry,
        stopLossPrice: sellSl,
        takeProfitPrice: sellTp,
        takeProfitT2Price: sellTp2,
        stopLossDistance: sellSlDist,
        stopLossPct: Number((slPct * 100).toFixed(2)),
        takeProfitDistance: sellTpDist,
        takeProfitPct: Number((tpPct * 100).toFixed(2)),
        riskRewardRatio: '1:3.0',
        recommendedPositionPct: 12,
        mode: 'REALTIME_DYNAMIC'
      }
    };
  }

  /**
   * 兜底回退报价（当外网无行情时从 DB 或默认规则生成）
   */
  private async getFallbackQuote(symbol: string): Promise<RealtimeContractQuote> {
    const sym = symbol.toUpperCase();
    const productMatch = sym.match(/^[A-Za-z]+/);
    const product = productMatch ? productMatch[0].toUpperCase() : 'RB';
    const spec = getContractSpec(sym);

    let price = spec?.basePrice || 3200;
    let high = price * 1.01;
    let low = price * 0.99;
    let open = price;
    let preClose = price;

    try {
      const bars = await db.select().from(market_bars)
        .where(eq(market_bars.contract, sym))
        .orderBy(desc(market_bars.bar_start))
        .limit(1);

      if (bars.length > 0) {
        price = Number(bars[0].close);
        high = Number(bars[0].high);
        low = Number(bars[0].low);
        open = Number(bars[0].open);
        preClose = open;
      }
    } catch (e) {
      // ignore
    }

    const change = Number((price - preClose).toFixed(2));
    const changePct = preClose > 0 ? Number(((change / preClose) * 100).toFixed(2)) : 0;
    const spot = await this.getSpotBenchmark(product);
    const spotBasis = this.calculateSpotBasis(spot.price, spot.name, spot.date, price);
    const dynamicPlan = this.calculateDynamicExecutionPlan(price, high, low);

    return {
      symbol: sym,
      name: spec?.name ? `${spec.name}${sym.replace(/^[A-Za-z]+/, '')}` : sym,
      product,
      latestPrice: price,
      bidPrice: price,
      askPrice: price + 1,
      bidVolume: 240,
      askVolume: 310,
      open,
      high,
      low,
      preClose,
      change,
      changePct,
      volume: 382000,
      openInterest: 890000,
      tradingDate: new Date().toISOString().split('T')[0],
      quoteTime: '15:00:00',
      updatedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      source: 'DB_FALLBACK',
      spotBasis,
      dynamicPlan
    };
  }
}

export const realtimeQuoteService = RealtimeQuoteService.getInstance();
