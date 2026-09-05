/**
 * China Futures Contract Resolver & Lifecycle Engine
 * 中国期货全合约月份生成、历史年份归档、主力判定与交割日解析引擎
 */

import { getContractSpec, CHINA_FUTURES_SPECS, type ChinaFuturesContractSpec } from './chinaFuturesMaster.js';

export type ContractStatus = 'DOMINANT' | 'SUB_DOMINANT' | 'ACTIVE' | 'EXPIRED' | 'NEAR_MONTH';

export interface ContractDetails {
  symbol: string;           // 完整合约代码，如 IF2609, RB2610, IF2406
  productCode: string;      // 品种前缀，如 IF, RB, CU
  contractMonth: string;    // 年月如 2609, 2406
  year: number;             // 年份如 2026, 2024
  month: number;            // 月份如 9, 6
  name: string;             // 如 沪深300 2609
  exchange: string;         // 交易所
  category: string;         // 分类
  status: ContractStatus;   // 主力/次主力/活跃/已交割
  statusLabel: string;      // 中文标签
  isDominant: boolean;      // 是否为当前主力
  isCrossYearDominant?: boolean; // 是否为跨年主力合约 (如2026年9月已切换至2701)
  isExpired: boolean;       // 是否已交割停止交易
  expiryDate: string;       // 到期交割日期 YYYY-MM-DD
  daysToExpiry: number;     // 距离交割剩余天数（负数表示已交割天数）
  multiplier: number;
  minTick: number;
  marginRate: number;
  basePrice: number;
}

/**
 * 辅助计算某年某月的第 N 个星期五（中金所股指期货为第3个星期五）
 */
function getNthFriday(year: number, month: number, nth: number = 3): Date {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  let dayOfWeek = firstDay.getUTCDay(); // 0 is Sun, 5 is Fri
  let firstFridayDate = 1 + ((5 - dayOfWeek + 7) % 7);
  let nthFridayDate = firstFridayDate + (nth - 1) * 7;
  return new Date(Date.UTC(year, month - 1, nthFridayDate));
}

/**
 * 计算中国期货指定合约的精确到期交割日
 */
export function calculateContractExpiryDate(productCode: string, year: number, month: number): Date {
  const spec = getContractSpec(productCode);

  if (spec.exchange === 'CFFEX') {
    if (productCode === 'T' || productCode === 'TF' || productCode === 'TS') {
      // 国债期货：到期月份的第二个星期五
      return getNthFriday(year, month, 2);
    }
    // 股指期货（IF/IC/IM/IH）：到期月份的第三个星期五
    return getNthFriday(year, month, 3);
  }

  if (spec.exchange === 'SHFE' || spec.exchange === 'GFEX') {
    // 上期所与广期所：合约月份的 15 日（若遇周末顺延）
    let d = new Date(Date.UTC(year, month - 1, 15));
    if (d.getUTCDay() === 6) d = new Date(Date.UTC(year, month - 1, 17)); // 周六延至周一
    if (d.getUTCDay() === 0) d = new Date(Date.UTC(year, month - 1, 16)); // 周日延至周一
    return d;
  }

  if (spec.exchange === 'DCE') {
    // 大商所：最后交易日为合约月份第 10 个交易日，交割在第 3 个工作日（约每月 15-18 日）
    return new Date(Date.UTC(year, month - 1, 16));
  }

  // 郑商所 CZCE：合约交割月份第 10 个交易日（约每月 14-16 日）
  return new Date(Date.UTC(year, month - 1, 15));
}

/**
 * 各品种在常规自然年内发行的典型月份分布
 */
export const PRODUCT_MONTH_PATTERNS: Record<string, number[]> = {
  // 季月滚动
  IF: [3, 6, 9, 12],
  IC: [3, 6, 9, 12],
  IM: [3, 6, 9, 12],
  IH: [3, 6, 9, 12],
  T:  [3, 6, 9, 12],
  TF: [3, 6, 9, 12],
  TS: [3, 6, 9, 12],

  // 黑色系主力与辅月 (1, 5, 10 + 临时月)
  RB: [1, 5, 10],
  HC: [1, 5, 10],
  I:  [1, 5, 9],
  J:  [1, 5, 9],
  JM: [1, 5, 9],

  // 有色金属 (逐月发行，取主要代表月份)
  CU: [1, 3, 5, 7, 9, 10, 11, 12],
  AL: [1, 3, 5, 7, 9, 10, 11, 12],
  ZN: [1, 3, 5, 7, 9, 10, 11, 12],
  PB: [1, 3, 5, 7, 9, 10, 11, 12],
  NI: [1, 3, 5, 7, 9, 10, 11, 12],

  // 贵金属 (6, 12 + 偶数月)
  AU: [2, 6, 8, 10, 12],
  AG: [2, 6, 8, 10, 12],

  // 能化商品 (1, 5, 9)
  TA: [1, 5, 9],
  MA: [1, 5, 9],
  SA: [1, 5, 9],
  FG: [1, 5, 9],
  PP: [1, 5, 9],

  // 农产品 (1, 5, 9, 11)
  M:  [1, 5, 9, 11],
  Y:  [1, 5, 9],
  P:  [1, 5, 9],
  C:  [1, 5, 9, 11],

  // 新能源 (1, 7, 11)
  LC: [1, 7, 11],
  SI: [1, 7, 11]
};

/**
 * 中国期货各品种主力月份轮换规则与主力计算
 * 传入当前基准时间（默认 2026-08-21）
 */
export function getDominantMonthPattern(productCode: string, referenceDate: Date = new Date()): {
  dominantSymbol: string;
  subDominantSymbol: string;
  activeMonths: string[];
} {
  const p = productCode.toUpperCase();
  const nowYear = referenceDate.getUTCFullYear();
  const nowMonth = referenceDate.getUTCMonth() + 1; // 1 ~ 12
  const day = referenceDate.getUTCDate();

  const fmt = (code: string, yr: number, m: number) => {
    const yStr = (yr % 100).toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    return `${code}${yStr}${mStr}`;
  };

  // 1. 中金所股指期货 (IF, IC, IM, IH): 当月、下月及随后两个季月 (3, 6, 9, 12)
  if (['IF', 'IC', 'IM', 'IH'].includes(p)) {
    let domM = nowMonth;
    if (day > 18) domM = (nowMonth % 12) + 1;
    let domYr = domM < nowMonth ? nowYear + 1 : nowYear;

    let subM = (domM % 12) + 1;
    let subYr = subM < domM ? domYr + 1 : domYr;

    const dom = fmt(p, domYr, domM);
    const sub = fmt(p, subYr, subM);
    const active = [
      fmt(p, nowYear, nowMonth),
      fmt(p, domYr, domM),
      fmt(p, subYr, subM),
      fmt(p, nowYear, 9),
      fmt(p, nowYear, 12),
      fmt(p, nowYear + 1, 3)
    ];
    return { dominantSymbol: dom, subDominantSymbol: sub, activeMonths: Array.from(new Set(active)) };
  }

  // 2. 黑色金属 (RB, HC): 1月, 5月, 10月为主力 (01, 05, 10)
  if (['RB', 'HC'].includes(p)) {
    let domYr = nowYear, domM = 10, subYr = nowYear + 1, subM = 1;
    if (nowMonth < 5) {
      domYr = nowYear; domM = 5;
      subYr = nowYear; subM = 10;
    } else if (nowMonth >= 5 && nowMonth < 10) {
      if ((nowMonth === 8 && day >= 10) || nowMonth === 9) {
        domYr = nowYear + 1; domM = 1;
        subYr = nowYear + 1; subM = 5;
      } else {
        domYr = nowYear; domM = 10;
        subYr = nowYear + 1; subM = 1;
      }
    } else {
      domYr = nowYear + 1; domM = 1;
      subYr = nowYear + 1; subM = 5;
    }
    const dom = fmt(p, domYr, domM);
    const sub = fmt(p, subYr, subM);
    const active = [
      fmt(p, nowYear, 5),
      fmt(p, nowYear, 10),
      fmt(p, nowYear + 1, 1),
      fmt(p, nowYear + 1, 5)
    ];
    return { dominantSymbol: dom, subDominantSymbol: sub, activeMonths: Array.from(new Set(active)) };
  }

  // 3. 有色金属 (CU, AL, ZN, PB, NI, SN): 逐月连续滚动 (CU2609, CU2610, CU2701)
  if (['CU', 'AL', 'ZN', 'PB', 'NI', 'SN'].includes(p)) {
    let domM = (nowMonth % 12) + 1;
    let domYr = domM === 1 ? nowYear + 1 : nowYear;
    let subM = (domM % 12) + 1;
    let subYr = subM <= domM ? domYr + 1 : domYr;

    const dom = fmt(p, domYr, domM);
    const sub = fmt(p, subYr, subM);
    const active = [
      fmt(p, nowYear, nowMonth),
      fmt(p, domYr, domM),
      fmt(p, subYr, subM),
      fmt(p, subYr, (subM % 12) + 1)
    ];
    return { dominantSymbol: dom, subDominantSymbol: sub, activeMonths: Array.from(new Set(active)) };
  }

  // 4. 贵金属 (AU, AG): 6月, 12月为主力
  if (['AU', 'AG'].includes(p)) {
    let domYr = nowYear, domM = 12, subYr = nowYear + 1, subM = 6;
    if (nowMonth < 6) {
      domYr = nowYear; domM = 6;
      subYr = nowYear; subM = 12;
    } else if (nowMonth >= 6 && nowMonth < 12) {
      domYr = nowYear; domM = 12;
      subYr = nowYear + 1; subM = 6;
    } else {
      domYr = nowYear + 1; domM = 6;
      subYr = nowYear + 1; subM = 12;
    }
    const dom = fmt(p, domYr, domM);
    const sub = fmt(p, subYr, subM);
    const active = [
      fmt(p, nowYear, 6),
      fmt(p, nowYear, 12),
      fmt(p, nowYear + 1, 6),
      fmt(p, nowYear + 1, 12)
    ];
    return { dominantSymbol: dom, subDominantSymbol: sub, activeMonths: Array.from(new Set(active)) };
  }

  // 5. 大商所、郑商所农商品与能化 (I, M, Y, P, TA, MA, SA, FG, SR, C, CS): 1月, 5月, 9月为主力
  if (['I', 'M', 'Y', 'P', 'TA', 'MA', 'SA', 'FG', 'SR', 'C', 'CS'].includes(p)) {
    let domYr = nowYear, domM = 9, subYr = nowYear + 1, subM = 1;
    if (nowMonth < 5) {
      domYr = nowYear; domM = 5;
      subYr = nowYear; subM = 9;
    } else if (nowMonth >= 5 && nowMonth < 9) {
      if (nowMonth === 8 && day >= 10) {
        domYr = nowYear + 1; domM = 1;
        subYr = nowYear + 1; subM = 5;
      } else {
        domYr = nowYear; domM = 9;
        subYr = nowYear + 1; subM = 1;
      }
    } else {
      domYr = nowYear + 1; domM = 1;
      subYr = nowYear + 1; subM = 5;
    }
    const dom = fmt(p, domYr, domM);
    const sub = fmt(p, subYr, subM);
    const active = [
      fmt(p, nowYear, 5),
      fmt(p, nowYear, 9),
      fmt(p, nowYear + 1, 1),
      fmt(p, nowYear + 1, 5)
    ];
    return { dominantSymbol: dom, subDominantSymbol: sub, activeMonths: Array.from(new Set(active)) };
  }

  // 6. 广期所新能源 (LC, SI): 1月, 7月, 11月为主力
  if (['LC', 'SI'].includes(p)) {
    let domYr = nowYear, domM = 11, subYr = nowYear + 1, subM = 1;
    if (nowMonth < 7) {
      domYr = nowYear; domM = 7;
      subYr = nowYear; subM = 11;
    } else if (nowMonth >= 7 && nowMonth < 11) {
      domYr = nowYear; domM = 11;
      subYr = nowYear + 1; subM = 1;
    } else {
      domYr = nowYear + 1; domM = 1;
      subYr = nowYear + 1; subM = 7;
    }
    const dom = fmt(p, domYr, domM);
    const sub = fmt(p, subYr, subM);
    const active = [
      fmt(p, nowYear, 7),
      fmt(p, nowYear, 11),
      fmt(p, nowYear + 1, 1),
      fmt(p, nowYear + 1, 7)
    ];
    return { dominantSymbol: dom, subDominantSymbol: sub, activeMonths: Array.from(new Set(active)) };
  }

  // 7. 国债期货 (T, TF, TS, TL): 3, 6, 9, 12 季月
  if (['T', 'TF', 'TS', 'TL'].includes(p)) {
    let domYr = nowYear, domM = 9, subYr = nowYear, subM = 12;
    if (nowMonth < 3) { domM = 3; subM = 6; }
    else if (nowMonth < 6) { domM = 6; subM = 9; }
    else if (nowMonth < 9) { domM = 9; subM = 12; }
    else if (nowMonth < 12) { domM = 12; subYr = nowYear + 1; subM = 3; }
    else { domYr = nowYear + 1; domM = 3; subYr = nowYear + 1; subM = 6; }

    const dom = fmt(p, domYr, domM);
    const sub = fmt(p, subYr, subM);
    const active = [
      fmt(p, domYr, domM),
      fmt(p, subYr, subM),
      fmt(p, nowYear + 1, 3)
    ];
    return { dominantSymbol: dom, subDominantSymbol: sub, activeMonths: Array.from(new Set(active)) };
  }

  // 默认通用规则
  let domYr = nowYear, domM = 9, subYr = nowYear + 1, subM = 1;
  if (nowMonth < 5) { domM = 5; subM = 9; }
  else if (nowMonth >= 5 && nowMonth < 9) { domM = 9; subYr = nowYear + 1; subM = 1; }
  else { domYr = nowYear + 1; domM = 1; subYr = nowYear + 1; subM = 5; }

  const defaultDom = fmt(p, domYr, domM);
  const defaultSub = fmt(p, subYr, subM);
  return {
    dominantSymbol: defaultDom,
    subDominantSymbol: defaultSub,
    activeMonths: [defaultDom, defaultSub]
  };
}

/**
 * 解析并生成单个合约的完整画像与交割状态
 */
export function resolveContractDetails(fullSymbol: string, referenceDate: Date = new Date()): ContractDetails {
  const upper = fullSymbol.toUpperCase().trim();
  const match = upper.match(/^([A-Z]+)(\d{3,4})$/);

  let productCode = upper;
  let contractMonth = '2609';
  let year = referenceDate.getUTCFullYear();
  let month = referenceDate.getUTCMonth() + 1;

  if (match) {
    productCode = match[1];
    const rawMonthDigits = match[2];

    if (rawMonthDigits.length === 4) {
      const yy = parseInt(rawMonthDigits.slice(0, 2), 10);
      const mm = parseInt(rawMonthDigits.slice(2, 4), 10);
      year = 2000 + yy;
      month = mm;
      contractMonth = rawMonthDigits;
    } else {
      // 3位格式 (如 TA409 / MA501)
      const yDigit = parseInt(rawMonthDigits.slice(0, 1), 10);
      const mm = parseInt(rawMonthDigits.slice(1, 3), 10);
      year = 2020 + yDigit;
      month = mm;
      contractMonth = `${(year % 100).toString().padStart(2, '0')}${mm.toString().padStart(2, '0')}`;
    }
  } else {
    // If just passed product code like 'IF', get current dominant contract
    const pattern = getDominantMonthPattern(upper, referenceDate);
    return resolveContractDetails(pattern.dominantSymbol, referenceDate);
  }

  const spec = getContractSpec(productCode);
  const expiryDateObj = calculateContractExpiryDate(productCode, year, month);
  const expiryDateStr = expiryDateObj.toISOString().split('T')[0];

  const nowTime = referenceDate.getTime();
  const expiryTime = expiryDateObj.getTime();
  const diffDays = Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24));

  const pattern = getDominantMonthPattern(productCode, referenceDate);
  const isDominant = upper === pattern.dominantSymbol;
  const isSubDominant = upper === pattern.subDominantSymbol;
  const isExpired = diffDays < 0;

  const currentCalendarYear = referenceDate.getUTCFullYear();
  const isCrossYearDominant = isDominant && (year > currentCalendarYear || (year === currentCalendarYear + 1));

  let status: ContractStatus = 'ACTIVE';
  let statusLabel = '活跃交易中';

  if (isExpired) {
    status = 'EXPIRED';
    statusLabel = '已到期交割 (停止交易)';
  } else if (isDominant) {
    status = 'DOMINANT';
    statusLabel = isCrossYearDominant ? '跨年主力 (2701已换月)' : '当前主力合约';
  } else if (isSubDominant) {
    status = 'SUB_DOMINANT';
    statusLabel = year > currentCalendarYear ? '跨年次主力' : '次主力合约';
  } else if (diffDays <= 7 && diffDays >= 0) {
    status = 'NEAR_MONTH';
    statusLabel = '近月临期合约';
  }

  return {
    symbol: `${productCode}${contractMonth}`,
    productCode,
    contractMonth,
    year,
    month,
    name: `${spec.name} ${contractMonth}`,
    exchange: spec.exchange,
    category: spec.category,
    status,
    statusLabel,
    isDominant,
    isCrossYearDominant,
    isExpired,
    expiryDate: expiryDateStr,
    daysToExpiry: diffDays,
    multiplier: spec.multiplier,
    minTick: spec.minTick,
    marginRate: spec.marginRate,
    basePrice: spec.basePrice
  };
}

/**
 * 获取指定年份（如 2024, 2025, 2023 等）的全部历史/活跃合约池
 */
export function getContractsByYear(targetYear: number, referenceDate: Date = new Date()): ContractDetails[] {
  const result: ContractDetails[] = [];
  const yy = (targetYear % 100).toString().padStart(2, '0');

  for (const [code] of Object.entries(CHINA_FUTURES_SPECS)) {
    const months = PRODUCT_MONTH_PATTERNS[code] || [3, 6, 9, 12];
    for (const m of months) {
      const mm = m.toString().padStart(2, '0');
      const sym = `${code}${yy}${mm}`;
      const detail = resolveContractDetails(sym, referenceDate);
      result.push(detail);
    }
  }

  return result;
}

/**
 * 获取所有期货品种当前的主力合约列表与全部合约池（支持跨年与多年度参数）
 */
export function getAllChinaFuturesContracts(options?: {
  year?: number | string;
  referenceDate?: Date;
}): {
  dominantContracts: ContractDetails[];
  allContracts: ContractDetails[];
} {
  const refDate = options?.referenceDate || new Date();
  const currentYear = refDate.getUTCFullYear();
  const dominantContracts: ContractDetails[] = [];
  let allContracts: ContractDetails[] = [];

  // 计算当前基准主力合约
  for (const [code] of Object.entries(CHINA_FUTURES_SPECS)) {
    const pattern = getDominantMonthPattern(code, refDate);
    const dominantDetail = resolveContractDetails(pattern.dominantSymbol, refDate);
    dominantContracts.push(dominantDetail);
  }

  const selectedYear = options?.year;

  if (selectedYear === 'CROSS_YEAR' || selectedYear === 'DOMINANT') {
    // 专门筛选跨年主力合约与当期主力
    allContracts = dominantContracts.filter(c => c.isCrossYearDominant || c.isDominant);
  } else if (selectedYear && selectedYear !== 'ALL') {
    const yNum = typeof selectedYear === 'string' ? parseInt(selectedYear, 10) : selectedYear;
    allContracts = getContractsByYear(yNum, refDate);

    // 重点逻辑：如果是当前交易年（例如2026年），必须把已经换月到次年1月/5月的跨年主力合约（如FG2701, RB2701, MA2701, SA2701, M2701）合入活跃列表中
    // 避免用户选择2026年时，发现所有主力合约已交割或不在当前年份列表中的缺陷
    if (yNum === currentYear) {
      for (const dom of dominantContracts) {
        if (dom.year > currentYear && !allContracts.some(c => c.symbol === dom.symbol)) {
          allContracts.unshift(dom); // 放在列表前列优先展示
        }
      }
    }
  } else if (selectedYear === 'ALL') {
    // 聚合 2005 ~ 2027 年全量历史及当前合约
    for (let y = 2005; y <= currentYear + 1; y++) {
      allContracts.push(...getContractsByYear(y, refDate));
    }
  } else {
    // 默认展示当期活跃及临近交割月份（包含跨年主力合约）
    for (const [code] of Object.entries(CHINA_FUTURES_SPECS)) {
      const pattern = getDominantMonthPattern(code, refDate);
      for (const sym of pattern.activeMonths) {
        const detail = resolveContractDetails(sym, refDate);
        if (!allContracts.some(c => c.symbol === detail.symbol)) {
          allContracts.push(detail);
        }
      }
    }
  }

  return { dominantContracts, allContracts };
}

