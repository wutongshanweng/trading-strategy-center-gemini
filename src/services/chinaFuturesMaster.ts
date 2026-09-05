/**
 * China Futures Market Master & Trading Session Engine
 * 中国期货市场全品种规格库与交易时段引擎
 */

export interface ChinaFuturesContractSpec {
  symbol: string;         // 品种前缀代码，如 IF, RB, CU, I, TA, LC
  name: string;           // 中文名称
  exchange: 'CFFEX' | 'SHFE' | 'DCE' | 'CZCE' | 'GFEX'; // 交易所
  category: '金融期货' | '黑色金属' | '有色金属' | '贵金属' | '能源化工' | '农产品' | '新能源/硅锂';
  multiplier: number;     // 合约乘数
  minTick: number;        // 最小变动价位
  marginRate: number;     // 最低交易保证金率
  commissionRate: number; // 手续费基准
  basePrice: number;      // 典型基准价格（用于行情初始化仿真）
  sessionType: 'financial_index' | 'financial_bond' | 'night23' | 'night01' | 'night0230' | 'dayOnly';
}

export const CHINA_FUTURES_SPECS: Record<string, ChinaFuturesContractSpec> = {
  // === 中金所 CFFEX 股指期货 (09:30-11:30, 13:00-15:00, 无夜盘) ===
  'IF': {
    symbol: 'IF',
    name: '沪深300股指期货',
    exchange: 'CFFEX',
    category: '金融期货',
    multiplier: 300,
    minTick: 0.2,
    marginRate: 0.12,
    commissionRate: 0.000023,
    basePrice: 3950,
    sessionType: 'financial_index'
  },
  'IC': {
    symbol: 'IC',
    name: '中证500股指期货',
    exchange: 'CFFEX',
    category: '金融期货',
    multiplier: 200,
    minTick: 0.2,
    marginRate: 0.12,
    commissionRate: 0.000023,
    basePrice: 5800,
    sessionType: 'financial_index'
  },
  'IM': {
    symbol: 'IM',
    name: '中证1000股指期货',
    exchange: 'CFFEX',
    category: '金融期货',
    multiplier: 200,
    minTick: 0.2,
    marginRate: 0.12,
    commissionRate: 0.000023,
    basePrice: 6100,
    sessionType: 'financial_index'
  },
  'IH': {
    symbol: 'IH',
    name: '上证50股指期货',
    exchange: 'CFFEX',
    category: '金融期货',
    multiplier: 300,
    minTick: 0.2,
    marginRate: 0.12,
    commissionRate: 0.000023,
    basePrice: 2750,
    sessionType: 'financial_index'
  },

  // === 中金所 CFFEX 国债期货 (09:15-11:30, 13:00-15:15, 无夜盘) ===
  'T': {
    symbol: 'T',
    name: '10年期国债期货',
    exchange: 'CFFEX',
    category: '金融期货',
    multiplier: 10000,
    minTick: 0.005,
    marginRate: 0.02,
    commissionRate: 3, // 元/手
    basePrice: 106.5,
    sessionType: 'financial_bond'
  },
  'TF': {
    symbol: 'TF',
    name: '5年期国债期货',
    exchange: 'CFFEX',
    category: '金融期货',
    multiplier: 10000,
    minTick: 0.005,
    marginRate: 0.015,
    commissionRate: 3,
    basePrice: 104.2,
    sessionType: 'financial_bond'
  },
  'TS': {
    symbol: 'TS',
    name: '2年期国债期货',
    exchange: 'CFFEX',
    category: '金融期货',
    multiplier: 20000,
    minTick: 0.002,
    marginRate: 0.01,
    commissionRate: 3,
    basePrice: 101.8,
    sessionType: 'financial_bond'
  },
  'TL': {
    symbol: 'TL',
    name: '30年期国债期货',
    exchange: 'CFFEX',
    category: '金融期货',
    multiplier: 10000,
    minTick: 0.01,
    marginRate: 0.035,
    commissionRate: 3,
    basePrice: 112.5,
    sessionType: 'financial_bond'
  },

  // === 上期所 SHFE (日盘 09:00-10:15, 10:30-11:30, 13:30-15:00) ===
  'RB': {
    symbol: 'RB',
    name: '螺纹钢期货',
    exchange: 'SHFE',
    category: '黑色金属',
    multiplier: 10,
    minTick: 1.0,
    marginRate: 0.08,
    commissionRate: 0.0001,
    basePrice: 3180,
    sessionType: 'night23'
  },
  'HC': {
    symbol: 'HC',
    name: '热轧卷板期货',
    exchange: 'SHFE',
    category: '黑色金属',
    multiplier: 10,
    minTick: 1.0,
    marginRate: 0.08,
    commissionRate: 0.0001,
    basePrice: 3550,
    sessionType: 'night23'
  },
  'CU': {
    symbol: 'CU',
    name: '沪铜期货',
    exchange: 'SHFE',
    category: '有色金属',
    multiplier: 5,
    minTick: 10.0,
    marginRate: 0.10,
    commissionRate: 0.00005,
    basePrice: 78500,
    sessionType: 'night01'
  },
  'AL': {
    symbol: 'AL',
    name: '沪铝期货',
    exchange: 'SHFE',
    category: '有色金属',
    multiplier: 5,
    minTick: 5.0,
    marginRate: 0.09,
    commissionRate: 3,
    basePrice: 20500,
    sessionType: 'night01'
  },
  'ZN': {
    symbol: 'ZN',
    name: '沪锌期货',
    exchange: 'SHFE',
    category: '有色金属',
    multiplier: 5,
    minTick: 5.0,
    marginRate: 0.09,
    commissionRate: 3,
    basePrice: 23500,
    sessionType: 'night01'
  },
  'PB': {
    symbol: 'PB',
    name: '沪铅期货',
    exchange: 'SHFE',
    category: '有色金属',
    multiplier: 5,
    minTick: 5.0,
    marginRate: 0.08,
    commissionRate: 0.00004,
    basePrice: 17200,
    sessionType: 'night01'
  },
  'NI': {
    symbol: 'NI',
    name: '沪镍期货',
    exchange: 'SHFE',
    category: '有色金属',
    multiplier: 1,
    minTick: 10.0,
    marginRate: 0.10,
    commissionRate: 3,
    basePrice: 132000,
    sessionType: 'night01'
  },
  'AU': {
    symbol: 'AU',
    name: '沪金期货',
    exchange: 'SHFE',
    category: '贵金属',
    multiplier: 1000,
    minTick: 0.02,
    marginRate: 0.08,
    commissionRate: 10,
    basePrice: 580.5,
    sessionType: 'night0230'
  },
  'AG': {
    symbol: 'AG',
    name: '沪银期货',
    exchange: 'SHFE',
    category: '贵金属',
    multiplier: 15,
    minTick: 1.0,
    marginRate: 0.10,
    commissionRate: 0.00005,
    basePrice: 7650,
    sessionType: 'night0230'
  },
  'RU': {
    symbol: 'RU',
    name: '天然橡胶期货',
    exchange: 'SHFE',
    category: '能源化工',
    multiplier: 10,
    minTick: 5.0,
    marginRate: 0.10,
    commissionRate: 0.00005,
    basePrice: 16500,
    sessionType: 'night23'
  },
  'FU': {
    symbol: 'FU',
    name: '燃料油期货',
    exchange: 'SHFE',
    category: '能源化工',
    multiplier: 10,
    minTick: 1.0,
    marginRate: 0.10,
    commissionRate: 0.00005,
    basePrice: 3100,
    sessionType: 'night0230'
  },

  // === 大商所 DCE ===
  'I': {
    symbol: 'I',
    name: '铁矿石期货',
    exchange: 'DCE',
    category: '黑色金属',
    multiplier: 100,
    minTick: 0.5,
    marginRate: 0.11,
    commissionRate: 0.0001,
    basePrice: 730,
    sessionType: 'night23'
  },
  'M': {
    symbol: 'M',
    name: '豆粕期货',
    exchange: 'DCE',
    category: '农产品',
    multiplier: 10,
    minTick: 1.0,
    marginRate: 0.07,
    commissionRate: 1.5,
    basePrice: 2850,
    sessionType: 'night23'
  },
  'C': {
    symbol: 'C',
    name: '玉米期货',
    exchange: 'DCE',
    category: '农产品',
    multiplier: 10,
    minTick: 1.0,
    marginRate: 0.08,
    commissionRate: 1.2,
    basePrice: 2150,
    sessionType: 'night23'
  },
  'Y': {
    symbol: 'Y',
    name: '豆油期货',
    exchange: 'DCE',
    category: '农产品',
    multiplier: 10,
    minTick: 2.0,
    marginRate: 0.08,
    commissionRate: 2.5,
    basePrice: 8200,
    sessionType: 'night23'
  },
  'P': {
    symbol: 'P',
    name: '棕榈油期货',
    exchange: 'DCE',
    category: '农产品',
    multiplier: 10,
    minTick: 2.0,
    marginRate: 0.09,
    commissionRate: 2.5,
    basePrice: 8900,
    sessionType: 'night23'
  },
  'JM': {
    symbol: 'JM',
    name: '焦煤期货',
    exchange: 'DCE',
    category: '黑色金属',
    multiplier: 60,
    minTick: 0.5,
    marginRate: 0.15,
    commissionRate: 0.0001,
    basePrice: 1250,
    sessionType: 'night23'
  },
  'J': {
    symbol: 'J',
    name: '焦炭期货',
    exchange: 'DCE',
    category: '黑色金属',
    multiplier: 100,
    minTick: 0.5,
    marginRate: 0.15,
    commissionRate: 0.0001,
    basePrice: 1850,
    sessionType: 'night23'
  },

  // === 郑商所 CZCE ===
  'TA': {
    symbol: 'TA',
    name: 'PTA期货',
    exchange: 'CZCE',
    category: '能源化工',
    multiplier: 5,
    minTick: 2.0,
    marginRate: 0.08,
    commissionRate: 3,
    basePrice: 4850,
    sessionType: 'night23'
  },
  'MA': {
    symbol: 'MA',
    name: '甲醇期货',
    exchange: 'CZCE',
    category: '能源化工',
    multiplier: 10,
    minTick: 1.0,
    marginRate: 0.08,
    commissionRate: 2,
    basePrice: 2350,
    sessionType: 'night23'
  },
  'SA': {
    symbol: 'SA',
    name: '纯碱期货',
    exchange: 'CZCE',
    category: '能源化工',
    multiplier: 20,
    minTick: 1.0,
    marginRate: 0.12,
    commissionRate: 0.0002,
    basePrice: 1380,
    sessionType: 'night23'
  },
  'FG': {
    symbol: 'FG',
    name: '玻璃期货',
    exchange: 'CZCE',
    category: '能源化工',
    multiplier: 20,
    minTick: 1.0,
    marginRate: 0.10,
    commissionRate: 3,
    basePrice: 870,
    sessionType: 'night23'
  },
  'CF': {
    symbol: 'CF',
    name: '棉花期货',
    exchange: 'CZCE',
    category: '农产品',
    multiplier: 5,
    minTick: 5.0,
    marginRate: 0.08,
    commissionRate: 4.3,
    basePrice: 14200,
    sessionType: 'night23'
  },
  'SR': {
    symbol: 'SR',
    name: '白糖期货',
    exchange: 'CZCE',
    category: '农产品',
    multiplier: 10,
    minTick: 1.0,
    marginRate: 0.08,
    commissionRate: 3,
    basePrice: 5900,
    sessionType: 'night23'
  },

  // === 广期所 GFEX (09:00-10:15, 10:30-11:30, 13:30-15:00, 无夜盘) ===
  'SI': {
    symbol: 'SI',
    name: '工业硅期货',
    exchange: 'GFEX',
    category: '新能源/硅锂',
    multiplier: 5,
    minTick: 5.0,
    marginRate: 0.09,
    commissionRate: 0.0001,
    basePrice: 9800,
    sessionType: 'dayOnly'
  },
  'LC': {
    symbol: 'LC',
    name: '碳酸锂期货',
    exchange: 'GFEX',
    category: '新能源/硅锂',
    multiplier: 1,
    minTick: 50.0,
    marginRate: 0.12,
    commissionRate: 0.00008,
    basePrice: 73500,
    sessionType: 'dayOnly'
  }
};

/**
 * Extract root product code from contract code (e.g. IF2606 -> IF, RB2605 -> RB)
 */
export function getProductCode(symbol: string): string {
  const match = symbol.toUpperCase().match(/^[A-Z]+/);
  return match ? match[0] : symbol.toUpperCase();
}

/**
 * Get contract spec details
 */
export function getContractSpec(symbol: string): ChinaFuturesContractSpec {
  const code = getProductCode(symbol);
  return CHINA_FUTURES_SPECS[code] || {
    symbol: code,
    name: `${code}商品期货`,
    exchange: 'SHFE',
    category: '黑色金属',
    multiplier: 10,
    minTick: 1.0,
    marginRate: 0.10,
    commissionRate: 0.0001,
    basePrice: 3500,
    sessionType: 'night23'
  };
}

export interface MarketSessionStatus {
  isOpen: boolean;
  isTradingDay: boolean;
  currentSession: 'CLOSED' | 'DAY_SESSION_1' | 'DAY_SESSION_2' | 'AFTERNOON_SESSION' | 'NIGHT_SESSION';
  sessionName: string;
  nextSessionDesc: string;
  chinaTimeStr: string;
}

/**
 * Check whether China Futures Market is currently open
 * @param symbol - Contract symbol or 'GLOBAL' for whole-market overview
 */
export function getChinaFuturesMarketStatus(symbol: string = 'GLOBAL', now: Date = new Date()): MarketSessionStatus {
  // Calculate China (UTC+8) Time
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const chinaTime = new Date(utc + (3600000 * 8));
  
  const dayOfWeek = chinaTime.getDay(); // 0: Sun, 6: Sat
  const hours = chinaTime.getHours();
  const minutes = chinaTime.getMinutes();
  const timeNum = hours * 100 + minutes; // e.g. 930 for 09:30

  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(chinaTime.getSeconds()).padStart(2, '0')} (UTC+8)`;

  // Weekend is strictly closed
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isOpen: false,
      isTradingDay: false,
      currentSession: 'CLOSED',
      sessionName: '周末休市中',
      nextSessionDesc: '周一早盘 09:00 (商品) / 09:15 (国债) / 09:30 (股指) 开盘',
      chinaTimeStr: timeString
    };
  }

  // --- 全局市场综合时段概览 (GLOBAL) ---
  if (!symbol || symbol === 'GLOBAL' || symbol === 'MARKET') {
    // 夜盘后半段 00:00 - 02:30
    if (timeNum >= 0 && timeNum <= 230) {
      const isAuAgSc = timeNum <= 230;
      const isMetals = timeNum <= 100;
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'NIGHT_SESSION',
        sessionName: isMetals 
          ? '商品夜盘交易中 (有色金属至 01:00 / 贵金属原油至 02:30)' 
          : '商品夜盘后半夜交易中 (贵金属 AU/AG、原油 SC 至 02:30)',
        nextSessionDesc: isMetals ? '01:00 有色收市 / 02:30 贵金属原油收市' : '02:30 夜盘收市',
        chinaTimeStr: timeString
      };
    }
    // 02:30 - 09:00 夜盘休市至早盘开市
    if (timeNum > 230 && timeNum < 900) {
      return {
        isOpen: false,
        isTradingDay: true,
        currentSession: 'CLOSED',
        sessionName: '晨间休市整备中 (日盘即将开市)',
        nextSessionDesc: '今日 09:00 商品期货开盘 (股指 09:30 / 国债 09:15)',
        chinaTimeStr: timeString
      };
    }
    // 09:00 - 09:15 商品早盘第一节 (金融尚未开市)
    if (timeNum >= 900 && timeNum < 915) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'DAY_SESSION_1',
        sessionName: '商品期货早盘第一节 (09:00-10:15)',
        nextSessionDesc: '09:15 国债期货 / 09:30 股指期货 开盘',
        chinaTimeStr: timeString
      };
    }
    // 09:15 - 09:30 商品 + 国债开市
    if (timeNum >= 915 && timeNum < 930) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'DAY_SESSION_1',
        sessionName: '商品期货与国债期货交易中',
        nextSessionDesc: '09:30 股指期货开盘 (IF/IC/IH/IM)',
        chinaTimeStr: timeString
      };
    }
    // 09:30 - 10:15 全国期货市场全线开市
    if (timeNum >= 930 && timeNum <= 1015) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'DAY_SESSION_1',
        sessionName: '全国期货市场早盘全线交易中 (商品/股指/国债)',
        nextSessionDesc: '10:15 商品课间小休 15 分钟',
        chinaTimeStr: timeString
      };
    }
    // 10:15 - 10:30 商品小休，中金所金融期货正常交易
    if (timeNum > 1015 && timeNum < 1030) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'DAY_SESSION_1',
        sessionName: '中金所金融期货交易中 (商品小节休市 15 分钟)',
        nextSessionDesc: '10:30 商品期货早盘第二节开盘',
        chinaTimeStr: timeString
      };
    }
    // 10:30 - 11:30 早盘第二节全线开市
    if (timeNum >= 1030 && timeNum <= 1130) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'DAY_SESSION_2',
        sessionName: '全国期货市场早盘第二节交易中',
        nextSessionDesc: '11:30 闭市午休',
        chinaTimeStr: timeString
      };
    }
    // 11:30 - 13:00 午间休市
    if (timeNum > 1130 && timeNum < 1300) {
      return {
        isOpen: false,
        isTradingDay: true,
        currentSession: 'CLOSED',
        sessionName: '午间休市中 (中金所 13:00 / 商品 13:30 开盘)',
        nextSessionDesc: '今日 13:00 中金所金融期货率先开盘',
        chinaTimeStr: timeString
      };
    }
    // 13:00 - 13:30 中金所下午盘率先开市 (商品尚未开市)
    if (timeNum >= 1300 && timeNum < 1330) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'AFTERNOON_SESSION',
        sessionName: '中金所下午盘交易中 (13:00-15:00)',
        nextSessionDesc: '13:30 商品期货下午盘开盘',
        chinaTimeStr: timeString
      };
    }
    // 13:30 - 15:00 全国期货下午盘全线开市
    if (timeNum >= 1330 && timeNum <= 1500) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'AFTERNOON_SESSION',
        sessionName: '全国期货市场下午盘全线交易中',
        nextSessionDesc: '15:00 日盘收盘 (国债至 15:15)',
        chinaTimeStr: timeString
      };
    }
    // 15:00 - 15:15 商品与股指收盘，国债期货至 15:15
    if (timeNum > 1500 && timeNum <= 1515) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'AFTERNOON_SESSION',
        sessionName: '中金所国债期货交易中 (商品/股指已收盘)',
        nextSessionDesc: '15:15 国债期货日盘收市',
        chinaTimeStr: timeString
      };
    }
    // 15:15 - 21:00 日盘收盘结算，等待夜盘开市
    if (timeNum > 1515 && timeNum < 2100) {
      return {
        isOpen: false,
        isTradingDay: true,
        currentSession: 'CLOSED',
        sessionName: '日盘已收盘结算 (金融期货无夜盘)',
        nextSessionDesc: '今晚 21:00 商品期货夜盘开盘',
        chinaTimeStr: timeString
      };
    }
    // 21:00 - 23:59 夜盘前半场
    if (timeNum >= 2100 && timeNum <= 2359) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'NIGHT_SESSION',
        sessionName: '商品期货夜盘主阶段交易中 (21:00-23:00/01:00/02:30)',
        nextSessionDesc: '23:00 能化/黑色/农产收市 (有色至01:00/贵金属至02:30)',
        chinaTimeStr: timeString
      };
    }
  }

  // --- 单一品种具体交易时段判定 ---
  const spec = getContractSpec(symbol);

  // 1. 中金所股指期货 (IF, IC, IH, IM: 上午 09:30-11:30, 下午 13:00-15:00, 无夜盘)
  if (spec.sessionType === 'financial_index') {
    if (timeNum >= 930 && timeNum <= 1130) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'DAY_SESSION_1',
        sessionName: `${spec.name} 早盘交易中 (09:30-11:30)`,
        nextSessionDesc: '11:30 闭市午休',
        chinaTimeStr: timeString
      };
    }
    if (timeNum >= 1300 && timeNum <= 1500) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'AFTERNOON_SESSION',
        sessionName: `${spec.name} 下午盘交易中 (13:00-15:00)`,
        nextSessionDesc: '15:00 收盘结算',
        chinaTimeStr: timeString
      };
    }
    return {
      isOpen: false,
      isTradingDay: true,
      currentSession: 'CLOSED',
      sessionName: `${spec.name} 休市中 (中金所股指无夜盘)`,
      nextSessionDesc: timeNum < 930 ? '今日 09:30 开盘' : (timeNum < 1300 ? '今日 13:00 开盘' : '下一交易日 09:30 开盘'),
      chinaTimeStr: timeString
    };
  }

  // 2. 中金所国债期货 (T, TF, TS, TL: 上午 09:15-11:30, 下午 13:00-15:15, 无夜盘)
  if (spec.sessionType === 'financial_bond') {
    if (timeNum >= 915 && timeNum <= 1130) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'DAY_SESSION_1',
        sessionName: `${spec.name} 早盘交易中 (09:15-11:30)`,
        nextSessionDesc: '11:30 闭市午休',
        chinaTimeStr: timeString
      };
    }
    if (timeNum >= 1300 && timeNum <= 1515) {
      return {
        isOpen: true,
        isTradingDay: true,
        currentSession: 'AFTERNOON_SESSION',
        sessionName: `${spec.name} 下午盘交易中 (13:00-15:15)`,
        nextSessionDesc: '15:15 收盘结算',
        chinaTimeStr: timeString
      };
    }
    return {
      isOpen: false,
      isTradingDay: true,
      currentSession: 'CLOSED',
      sessionName: `${spec.name} 休市中 (中金所国债无夜盘)`,
      nextSessionDesc: timeNum < 915 ? '今日 09:15 开盘' : (timeNum < 1300 ? '今日 13:00 开盘' : '下一交易日 09:15 开盘'),
      chinaTimeStr: timeString
    };
  }

  // 3. 商品期货日盘 (所有商品统一：上午 09:00-10:15, 10:30-11:30；下午 13:30-15:00)
  if (timeNum >= 900 && timeNum <= 1015) {
    return {
      isOpen: true,
      isTradingDay: true,
      currentSession: 'DAY_SESSION_1',
      sessionName: `${spec.name} 早盘第一节 (09:00-10:15)`,
      nextSessionDesc: '10:15 课间小休 15 分钟',
      chinaTimeStr: timeString
    };
  }
  if (timeNum > 1015 && timeNum < 1030) {
    return {
      isOpen: false,
      isTradingDay: true,
      currentSession: 'CLOSED',
      sessionName: `${spec.name} 课间小休 (10:15-10:30)`,
      nextSessionDesc: '10:30 早盘第二节开盘',
      chinaTimeStr: timeString
    };
  }
  if (timeNum >= 1030 && timeNum <= 1130) {
    return {
      isOpen: true,
      isTradingDay: true,
      currentSession: 'DAY_SESSION_2',
      sessionName: `${spec.name} 早盘第二节 (10:30-11:30)`,
      nextSessionDesc: '11:30 闭市午休',
      chinaTimeStr: timeString
    };
  }
  if (timeNum >= 1330 && timeNum <= 1500) {
    return {
      isOpen: true,
      isTradingDay: true,
      currentSession: 'AFTERNOON_SESSION',
      sessionName: `${spec.name} 下午盘 (13:30-15:00)`,
      nextSessionDesc: '15:00 日盘收盘',
      chinaTimeStr: timeString
    };
  }

  // 4. 商品无夜盘品种 (广期所工业硅/碳酸锂等)
  if (spec.sessionType === 'dayOnly') {
    return {
      isOpen: false,
      isTradingDay: true,
      currentSession: 'CLOSED',
      sessionName: `${spec.name} 休市中 (该品种无夜盘)`,
      nextSessionDesc: timeNum < 900 ? '今日 09:00 开盘' : (timeNum < 1330 ? '今日 13:30 开盘' : '下一交易日 09:00 开盘'),
      chinaTimeStr: timeString
    };
  }

  // 5. 商品夜盘 (21:00 开始)
  const nightCloseHourStr = spec.sessionType === 'night0230' ? '02:30' : (spec.sessionType === 'night01' ? '01:00' : '23:00');
  const nightCloseTimeNum = spec.sessionType === 'night0230' ? 230 : (spec.sessionType === 'night01' ? 100 : 2300);

  if (timeNum >= 2100 && timeNum <= 2359) {
    return {
      isOpen: true,
      isTradingDay: true,
      currentSession: 'NIGHT_SESSION',
      sessionName: `${spec.name} 夜盘交易中 (21:00 - ${nightCloseHourStr})`,
      nextSessionDesc: `${nightCloseHourStr} 夜盘收市`,
      chinaTimeStr: timeString
    };
  }
  if (timeNum >= 0 && timeNum <= nightCloseTimeNum && (spec.sessionType === 'night01' || spec.sessionType === 'night0230')) {
    return {
      isOpen: true,
      isTradingDay: true,
      currentSession: 'NIGHT_SESSION',
      sessionName: `${spec.name} 夜盘后半夜交易中 (至 ${nightCloseHourStr})`,
      nextSessionDesc: `${nightCloseHourStr} 夜盘收市`,
      chinaTimeStr: timeString
    };
  }

  return {
    isOpen: false,
    isTradingDay: true,
    currentSession: 'CLOSED',
    sessionName: `${spec.name} 休市盘整中`,
    nextSessionDesc: timeNum < 900 ? '今日 09:00 开盘' : (timeNum < 1330 ? '今日 13:30 下午盘开盘' : (timeNum < 2100 ? '今晚 21:00 夜盘开盘' : '下一交易日 09:00 开盘')),
    chinaTimeStr: timeString
  };
}
