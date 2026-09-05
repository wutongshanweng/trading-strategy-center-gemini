/**
 * China Macroeconomic, Factor Lineage & Intelligence News Hub
 * 中国宏观经济指标、量化因子库与期货情报新闻中台服务
 */

export interface MacroIndicator {
  id: string;
  name: string;
  category: '经济增长' | '通胀物价' | '货币信贷' | '行业景气';
  currentValue: string;
  previousValue: string;
  forecastValue: string;
  unit: string;
  publishDate: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impactDescription: string;
  targetAssets: string[];
}

export interface FactorDefinition {
  id: string;
  name: string;
  category: '动量趋势' | '波动风险' | '基差期限' | '持仓异动' | '均值回归' | string;
  formula: string;
  description: string;
  icScore: number;       // 信息系数 (IC)
  irRatio: number;       // 信息比率 (IR)
  winRate: number;       // 因子多空胜率
  turnoverDays: number;  // 平均换手周期
  suitableAssets: string[];
  lastCalculatedAt: string;
}

export interface MarketNewsItem {
  id: string;
  title: string;
  source: string;
  category: '宏观要闻' | '现货基差' | '品种快讯' | '交易所公告' | '持仓异动';
  publishedAt: string;
  summary: string;
  relatedSymbols: string[];
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export const CHINA_MACRO_INDICATORS: MacroIndicator[] = [
  {
    id: 'PMI_MFG',
    name: '官方制造业采购经理指数 (PMI)',
    category: '行业景气',
    currentValue: '50.4%',
    previousValue: '49.8%',
    forecastValue: '50.1%',
    unit: '%',
    publishDate: '2026-08-01',
    impactLevel: 'HIGH',
    sentiment: 'BULLISH',
    impactDescription: 'PMI 重回荣枯线 50% 上方，制造业生产与新订单景气度回升，利好黑色系 (RB/I) 及有色金属 (CU/AL)。',
    targetAssets: ['RB', 'HC', 'I', 'CU', 'AL', 'IF', 'IC']
  },
  {
    id: 'CPI_YOY',
    name: '居民消费价格指数 (CPI 同比)',
    category: '通胀物价',
    currentValue: '+0.8%',
    previousValue: '+0.5%',
    forecastValue: '+0.7%',
    unit: '%',
    publishDate: '2026-08-10',
    impactLevel: 'HIGH',
    sentiment: 'BULLISH',
    impactDescription: '通胀温和回暖，反映下游消费需求逐步修复，农产品与能化板块通胀溢价增强。',
    targetAssets: ['M', 'Y', 'P', 'TA', 'MA', 'IF']
  },
  {
    id: 'PPI_YOY',
    name: '工业生产者出厂价格 (PPI 同比)',
    category: '通胀物价',
    currentValue: '-1.2%',
    previousValue: '-1.8%',
    forecastValue: '-1.4%',
    unit: '%',
    publishDate: '2026-08-10',
    impactLevel: 'MEDIUM',
    sentiment: 'NEUTRAL',
    impactDescription: 'PPI 降幅持续收窄，工业品去库存阶段接近尾声，中上游原材料利润企稳。',
    targetAssets: ['RB', 'I', 'CU', 'TA', 'SA']
  },
  {
    id: 'LPR_1Y',
    name: '央行贷款市场报价利率 (1年期 LPR)',
    category: '货币信贷',
    currentValue: '3.10%',
    previousValue: '3.15%',
    forecastValue: '3.10%',
    unit: '%',
    publishDate: '2026-08-20',
    impactLevel: 'HIGH',
    sentiment: 'BULLISH',
    impactDescription: '货币政策维持适度宽松，流动性充裕，国债期货 (T) 震荡走高，股指期货估值受支撑。',
    targetAssets: ['T', 'IF', 'IC', 'IM', 'IH']
  },
  {
    id: 'SOCIAL_FINANCING',
    name: '社会融资规模新增量 (单月)',
    category: '货币信贷',
    currentValue: '2.14 万亿元',
    previousValue: '1.89 万亿元',
    forecastValue: '2.05 万亿元',
    unit: '万亿元',
    publishDate: '2026-08-12',
    impactLevel: 'HIGH',
    sentiment: 'BULLISH',
    impactDescription: '企业中长期贷款企稳回升，基建与重大工程融资放量，对大宗商品基建链条产生支撑。',
    targetAssets: ['RB', 'HC', 'I', 'IF']
  },
  {
    id: 'GDP_Q2',
    name: '国内生产总值 (季度 GDP 同比)',
    category: '经济增长',
    currentValue: '+5.2%',
    previousValue: '+5.0%',
    forecastValue: '+5.1%',
    unit: '%',
    publishDate: '2026-07-15',
    impactLevel: 'HIGH',
    sentiment: 'BULLISH',
    impactDescription: '中国宏观经济运行在合理区间，高质量发展动能持续积聚。',
    targetAssets: ['IF', 'IC', 'IM', 'IH', 'RB', 'CU']
  }
];

import { quantRegistry } from './quantRegistry.js';

export const QUANT_FACTOR_LIBRARY: FactorDefinition[] = quantRegistry.getAllFactors().map(f => ({
  id: f.name,
  name: `${f.description || f.name} (${f.name})`,
  category: f.category_cn || f.category || '量价特征',
  formula: f.formula || f.description,
  description: f.description,
  icScore: f.ic,
  irRatio: f.ir,
  winRate: Number((50 + Math.abs(f.ic) * 200).toFixed(1)),
  turnoverDays: Math.round(f.turnover * 30),
  suitableAssets: ['RB', 'HC', 'I', 'CU', 'TA', 'SA', 'IF', 'IC', 'IM', 'IH', 'LC', 'M', 'Y', 'P'],
  lastCalculatedAt: new Date().toISOString()
}));


export const RECENT_MARKET_NEWS: MarketNewsItem[] = [
  {
    id: 'NEWS_001',
    title: '中金所：8月股指期货合约今日顺利完成交割，9月主力合约 (IF2609/IC2609) 资金移仓完成',
    source: '中金所官方发布',
    category: '交易所公告',
    publishedAt: '2026-08-21 15:30',
    summary: '今日为 2026年8月第三个星期五，IF2608/IC2608/IM2608/IH2608 顺利完成到期交割结算。多空主力资金已平稳移仓至 2609 季月主力合约，成交与持仓量保持平稳。',
    relatedSymbols: ['IF2609', 'IC2609', 'IM2609', 'IH2609'],
    sentiment: 'NEUTRAL'
  },
  {
    id: 'NEWS_002',
    title: '黑色系商品期货夜盘前瞻：螺纹钢 (RB2610) 钢厂库存连续三周下降，基建需求平稳释放',
    source: '我的钢铁网 (Mysteel)',
    category: '现货基差',
    publishedAt: '2026-08-21 17:15',
    summary: '最新调研显示五大主要钢材品种表观消费量环比上升 2.3%，唐山高炉开工率保持稳定，现货挺价意愿强烈，基差贴水收窄至 45 元/吨。',
    relatedSymbols: ['RB2610', 'HC2610', 'I2609'],
    sentiment: 'BULLISH'
  },
  {
    id: 'NEWS_003',
    title: '有色金属：沪铜 (CU2609) 伦铜库存回落，新能源电网与光伏高弹性需求支撑铜价',
    source: '上海有色网 (SMM)',
    category: '品种快讯',
    publishedAt: '2026-08-21 16:45',
    summary: '海外主要铜矿干扰率上升导致精铜精炼费 (TC) 维持历史低位，国内主流冶炼厂减产检修增多，现货升水结构稳固。',
    relatedSymbols: ['CU2609', 'CU2610', 'AL2609'],
    sentiment: 'BULLISH'
  },
  {
    id: 'NEWS_004',
    title: '央行持续实施稳健精准货币政策，银行间流动性充裕，国债期货 (T2609) 维持高位盘整',
    source: '金融时报',
    category: '宏观要闻',
    publishedAt: '2026-08-21 11:30',
    summary: '央行开展 1500 亿元 7天期逆回购操作，资金面整体保持合理宽裕，长端国债收益率低位企稳。',
    relatedSymbols: ['T2609', 'IF2609'],
    sentiment: 'NEUTRAL'
  },
  {
    id: 'NEWS_005',
    title: '广期所碳酸锂 (LC2611)：锂盐厂挺价惜售，下游动力电池排产环比增长 6%',
    source: '广期所产业快讯',
    category: '品种快讯',
    publishedAt: '2026-08-21 14:10',
    summary: '碳酸锂期货主力合约增仓上行，现货电池级碳酸锂均价企稳，行业去库存逐步进入良性平衡期。',
    relatedSymbols: ['LC2611', 'SI2611'],
    sentiment: 'BULLISH'
  }
];

class MacroFactorHubService {
  public getMacroIndicators(): MacroIndicator[] {
    return CHINA_MACRO_INDICATORS;
  }

  public getFactors(): FactorDefinition[] {
    return QUANT_FACTOR_LIBRARY;
  }

  public getNewsFlow(): MarketNewsItem[] {
    return RECENT_MARKET_NEWS;
  }

  public getFactorsForAsset(symbol: string): FactorDefinition[] {
    const code = symbol.replace(/\d+$/, '').toUpperCase();
    return QUANT_FACTOR_LIBRARY.filter(f => f.suitableAssets.includes(code));
  }

  public getMacroForAsset(symbol: string): MacroIndicator[] {
    const code = symbol.replace(/\d+$/, '').toUpperCase();
    return CHINA_MACRO_INDICATORS.filter(m => m.targetAssets.includes(code));
  }
}

export const macroFactorHub = new MacroFactorHubService();
