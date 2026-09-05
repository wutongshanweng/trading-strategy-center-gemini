import { Router, Request, Response } from 'express';
import { CHINA_FUTURES_SPECS } from '../../services/chinaFuturesMaster.js';
import { getAllChinaFuturesContracts } from '../../services/chinaFuturesContractResolver.js';

export const warehouseRouter = Router();

// 股票样本池（主流权重蓝筹与高流动性核心标的）
const STOCK_SYMBOLS = [
  { code: '600519.SH', name: '贵州茅台', exchange: 'SSE', status: '核心蓝筹', category: '食品饮料' },
  { code: '300750.SZ', name: '宁德时代', exchange: 'SZSE', status: '新能源龙头', category: '电力设备' },
  { code: '000858.SZ', name: '五粮液', exchange: 'SZSE', status: '权重蓝筹', category: '食品饮料' },
  { code: '601318.SH', name: '中国平安', exchange: 'SSE', status: '金融权重', category: '非银金融' },
  { code: '000001.SZ', name: '平安银行', exchange: 'SZSE', status: '银行核心', category: '银行' },
  { code: '600036.SH', name: '招商银行', exchange: 'SSE', status: '银行龙头', category: '银行' },
  { code: '002594.SZ', name: '比亚迪', exchange: 'SZSE', status: '汽车龙头', category: '汽车' },
  { code: '600900.SH', name: '长江电力', exchange: 'SSE', status: '高股息红利', category: '公用事业' },
  { code: '601899.SH', name: '紫金矿业', exchange: 'SSE', status: '有色资源', category: '有色金属' },
  { code: '600030.SH', name: '中信证券', exchange: 'SSE', status: '券商龙头', category: '非银金融' },
  { code: '600000.SH', name: '浦发银行', exchange: 'SSE', status: '金融蓝筹', category: '银行' },
  { code: '000333.SZ', name: '美的集团', exchange: 'SZSE', status: '白电龙头', category: '家用电器' },
  { code: '002415.SZ', name: '海康威视', exchange: 'SZSE', status: '安防龙头', category: '计算机' },
  { code: '688981.SH', name: '中芯国际', exchange: 'SSE', status: '芯片半导体', category: '电子' },
  { code: '601012.SH', name: '隆基绿能', exchange: 'SSE', status: '光伏龙头', category: '电力设备' },
  { code: '000651.SZ', name: '格力电器', exchange: 'SZSE', status: '家电龙头', category: '家用电器' },
  { code: '600276.SH', name: '恒瑞医药', exchange: 'SSE', status: '创新药龙头', category: '医药生物' },
  { code: '601166.SH', name: '兴业银行', exchange: 'SSE', status: '股份行标杆', category: '银行' },
  { code: '510050.SH', name: '上证50ETF', exchange: 'SSE', status: '宽基指数ETF', category: '指数基金' },
  { code: '510300.SH', name: '沪深300ETF', exchange: 'SSE', status: '核心指数ETF', category: '指数基金' },
  { code: '159915.SZ', name: '创业板ETF', exchange: 'SZSE', status: '成长指数ETF', category: '指数基金' },
  { code: '588000.SH', name: '科创50ETF', exchange: 'SSE', status: '硬科技指数ETF', category: '指数基金' }
];

// 期权标的与合约样本
const OPTION_SYMBOLS = [
  { code: '10011799', name: '50ETF购10月3000', exchange: 'SSE', status: '活跃期权', category: 'ETF期权' },
  { code: '10011800', name: '50ETF沽10月3000', exchange: 'SSE', status: '活跃期权', category: 'ETF期权' },
  { code: '510050.SH', name: '华夏上证50ETF标的', exchange: 'SSE', status: '期权标的', category: 'ETF期权' },
  { code: '510300.SH', name: '华泰柏瑞300ETF标的', exchange: 'SSE', status: '期权标的', category: 'ETF期权' },
  { code: '159919.SZ', name: '嘉实300ETF标的', exchange: 'SZSE', status: '期权标的', category: 'ETF期权' },
  { code: '588000.SH', name: '华夏科创50ETF标的', exchange: 'SSE', status: '期权标的', category: 'ETF期权' },
  { code: 'IO2609', name: '沪深300指数期权主力', exchange: 'CFFEX', status: '股指期权', category: '金融期权' },
  { code: 'MO2609', name: '中证1000指数期权主力', exchange: 'CFFEX', status: '股指期权', category: '金融期权' },
  { code: 'HO2609', name: '上证50指数期权主力', exchange: 'CFFEX', status: '股指期权', category: '金融期权' },
  { code: 'RB2610-C-3400', name: '螺纹钢2610购3400', exchange: 'SHFE', status: '商品期权', category: '商品期权' },
  { code: 'RB2610-P-3300', name: '螺纹钢2610沽3300', exchange: 'SHFE', status: '商品期权', category: '商品期权' },
  { code: 'M2609-C-3200', name: '豆粕2609购3200', exchange: 'DCE', status: '商品期权', category: '商品期权' },
  { code: 'SC2609-C-550', name: '原油2609购550', exchange: 'INE', status: '商品期权', category: '商品期权' }
];

/**
 * GET /api/v1/warehouse/symbols
 * 获取标的数据仓库全量标的池列表（支持期货、股票、期权）
 */
warehouseRouter.get('/symbols', (req: Request, res: Response) => {
  try {
    const assetType = String(req.query.asset_type || 'futures').toLowerCase();
    const limit = parseInt(String(req.query.limit || '300'), 10);
    const search = String(req.query.search || '').trim().toLowerCase();

    let symbolsList: Array<{
      code: string;
      name: string;
      product?: string;
      product_name?: string;
      exchange?: string;
      status?: string;
      category?: string;
      asset_type: string;
      is_dominant?: boolean;
    }> = [];

    if (assetType === 'futures') {
      // 1. 获取期货主力合约与 2026-2027 各月份活跃合约池
      const { dominantContracts, allContracts } = getAllChinaFuturesContracts({ year: 2026 });
      
      // 主力合约放在前列
      const seen = new Set<string>();
      
      for (const d of dominantContracts) {
        if (!seen.has(d.symbol)) {
          seen.add(d.symbol);
          symbolsList.push({
            code: d.symbol,
            name: d.name,
            product: d.productCode,
            product_name: CHINA_FUTURES_SPECS[d.productCode]?.name || d.productCode,
            exchange: d.exchange,
            status: d.statusLabel || '主力',
            category: d.category,
            asset_type: 'futures',
            is_dominant: true
          });
        }
      }

      // 补充其他活跃与近月合约
      for (const c of allContracts) {
        if (!seen.has(c.symbol)) {
          seen.add(c.symbol);
          symbolsList.push({
            code: c.symbol,
            name: c.name,
            product: c.productCode,
            product_name: CHINA_FUTURES_SPECS[c.productCode]?.name || c.productCode,
            exchange: c.exchange,
            status: c.statusLabel || (c.isDominant ? '主力' : '活跃'),
            category: c.category,
            asset_type: 'futures',
            is_dominant: c.isDominant
          });
        }
      }
    } else if (assetType === 'stock') {
      symbolsList = STOCK_SYMBOLS.map(s => ({
        ...s,
        asset_type: 'stock',
        is_dominant: false
      }));
    } else if (assetType === 'option') {
      symbolsList = OPTION_SYMBOLS.map(o => ({
        ...o,
        asset_type: 'option',
        is_dominant: false
      }));
    }

    // 搜索过滤
    if (search) {
      symbolsList = symbolsList.filter(s => 
        s.code.toLowerCase().includes(search) || 
        s.name.toLowerCase().includes(search) ||
        (s.product_name && s.product_name.toLowerCase().includes(search)) ||
        (s.category && s.category.toLowerCase().includes(search))
      );
    }

    // 截断到 limit
    const pagedSymbols = symbolsList.slice(0, limit);

    res.json({
      status: 'ok',
      asset_type: assetType,
      total: symbolsList.length,
      symbols: pagedSymbols
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
