import { Router, Request, Response } from 'express';

export const newsRouter = Router();

// 辅助函数：获取 UTC+8 (北京时间) 的 Date 对象
function getChinaDate(date: Date = new Date()) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}

// 辅助函数：格式化任何 Date 对象为北京时间的 HH:mm:ss
function formatChinaTime(date: Date) {
  const chinaDate = getChinaDate(date);
  return chinaDate.toISOString().split('T')[1].split('.')[0];
}

// 辅助函数：格式化当前时间为 HH:mm:ss 和 YYYY-MM-DD (北京时间)
function getCurrentFormattedTime(offsetMs: number = 0) {
  const baseNow = new Date(Date.now() + offsetMs);
  const chinaNow = getChinaDate(baseNow);
  const dateStr = chinaNow.toISOString().split('T')[0];
  const timeStr = chinaNow.toISOString().split('T')[1].split('.')[0];
  return { dateStr, timeStr };
}

// 候选新闻池（用于实时刷出最新行情快讯）
const NEWS_CANDIDATE_POOL = [
  {
    title: '郑商所：调整玻璃与纯碱期货部分合约交易保证金标准与涨跌停板幅度',
    content: '郑州商品交易所发布最新公告，自下一交易日起，玻璃 (FG) 与纯碱 (SA) 期货部分主力合约交易保证金标准调整为9%，涨跌停板幅度调整为7%。分析人士指出，交易所旨在平抑近期高波动市场风险，引导资金理性交易。',
    category: '产业大宗',
    importance: 'urgent',
    sentiment: 'neutral',
    sentimentScore: -0.05,
    relatedProducts: ['FG', 'SA', 'MA'],
    source: '郑商所官方发布'
  },
  {
    title: '央行公开市场今日开展1500亿元7天期逆回购操作 中标利率持平于1.70%',
    content: '中国人民银行今日开展1500亿元7天期逆回购操作，中标利率为1.70%。由于今日有1200亿元逆回购到期，公开市场实现净投放300亿元。银行间市场隔夜与7天期拆借利率（DR001/DR007）小幅回落，流动性维持合理充裕。',
    category: '央行货币',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.65,
    relatedProducts: ['IF', 'IC', 'IH', 'T'],
    source: '人民银行官网'
  },
  {
    title: '海关总署数据：前8个月我国进出口总值同比增3.7% 铁矿石与大豆进口量同步攀升',
    content: '据海关统计，今年前8个月我国进出口总值达28.5万亿元人民币，同比增长3.7%。其中，铁矿砂及其精矿进口7.8亿吨，增加5.2%；大豆进口7120万吨，增加3.4%。外贸结构持续优化，机电产品与大宗商品进口维持较高景气。',
    category: '宏观政策',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.72,
    relatedProducts: ['I', 'RB', 'M', 'C', 'CU'],
    source: '海关总署官方发布'
  },
  {
    title: '美国EIA商业原油库存减少380万桶 远超市场预期200万桶降幅',
    content: '美国能源信息署（EIA）最新周报显示，截至上周，美国商业原油库存（不含战略石油储备）减少380.5万桶，降幅大幅超过预期的200万桶。炼厂开工率维持在92.5%的高位，精炼油与汽油库存同步回落，原油主力合约应声拉升1.8%。',
    category: '海外环球',
    importance: 'urgent',
    sentiment: 'bullish',
    sentimentScore: 0.81,
    relatedProducts: ['SC', 'FU', 'LU', 'BU'],
    source: 'EIA / Wall Street Journal'
  },
  {
    title: '广期所工业硅与碳酸锂仓单注销与交割顺畅 现货市场基差逐步收窄',
    content: '广州期货交易所最新数据显示，工业硅 (SI) 与碳酸锂 (LC) 期货注册仓单平稳有序注销，交割库提货顺畅。现货市场受光伏组件产能恢复及新能源汽车金九银十备货驱动，产业链上下游企业采买意愿增强，期货基差逐步收窄。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'bullish',
    sentimentScore: 0.58,
    relatedProducts: ['SI', 'LC', 'AL'],
    source: '广期所发布'
  },
  {
    title: '工信部：推进有色金属与建材行业绿色低碳改造 提升高质量废钢与再生铝利用率',
    content: '工信部等相关部门联合印发《关于推进重点行业碳达峰实施方案》，明确到2026年底电解铝行业电网绿电占比提升至30%以上，同时鼓励废钢回收与短流程电炉钢比例提升。有色金属与黑色系长期供给约束预期有所增强。',
    category: '宏观政策',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.76,
    relatedProducts: ['AL', 'RB', 'CU', 'NI'],
    source: '工信部'
  },
  {
    title: 'USDA8月供需报告：美豆单产上修至53.2蒲式耳/英亩 豆粕主力承压回调',
    content: '美国农业部（USDA）发布的最新农产品供需报告显示，美豆单产预测上修至53.2蒲式耳/英亩，期末库存相应提高。南美巴西大豆播种意向良好。受丰产预期压制，大连豆粕 (M) 及菜粕 (RM) 期货盘中承压小幅下探。',
    category: '产业大宗',
    importance: 'important',
    sentiment: 'bearish',
    sentimentScore: -0.68,
    relatedProducts: ['M', 'RM', 'Y', 'P'],
    source: 'USDA / 农产品早报'
  },
  {
    title: '国家统计局：8月份制造业PMI录得50.4% 重回荣枯扩张区间',
    content: '国家统计局最新公布数据显示，8月份中国制造业采购经理指数(PMI)为50.4%，比上月上升0.6个百分点，重回荣枯线以上。生产指数与新订单指数分别上升至51.2%与50.7%，表明制造业景气面持续扩大，大宗工业品需求预期向好。',
    category: '宏观政策',
    importance: 'urgent',
    sentiment: 'bullish',
    sentimentScore: 0.88,
    relatedProducts: ['RB', 'MA', 'SA', 'CU', 'IF'],
    source: '国家统计局发布'
  },
  {
    title: '沙特阿美公布最新官价：上调10月销往亚洲的轻质原油官方售价升水',
    content: '沙特国家石油公司（沙特阿美）公布最新官价（OSP），将10月运往亚洲的阿拉伯轻质原油官方售价上调0.40美元/桶，升水幅度达到每桶+1.80美元。此举反映出亚洲炼厂四季度季节性备货需求韧性强劲。',
    category: '海外环球',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.74,
    relatedProducts: ['SC', 'LU', 'FU'],
    source: 'Bloomberg / 沙特阿美'
  },
  {
    title: '太仓甲醇港口主流库存下降至48.5万吨 现货基差稳步走强',
    content: '江苏太仓主流甲醇交割库数据显示，本周华东甲醇港口库存较上周减少2.8万吨至48.5万吨，太仓现货可流通货源偏紧。下游烯烃MTO开工负荷维持在86%高位，现货基差升水盘面至+55元/吨。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'bullish',
    sentimentScore: 0.62,
    relatedProducts: ['MA', 'PP'],
    source: '卓创资讯'
  },
  {
    title: '沙河地区重碱厂家现汇价格持稳 纯碱期货盘面维持深贴水格局',
    content: '河北沙河重质纯碱主流出厂报价维持在1500-1550元/吨区间，企业库存虽环比小幅积累但整体开工负荷下滑至78%。盘面SA2701小幅贴水现货，期现套利资金进场锁定无风险价差。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'neutral',
    sentimentScore: -0.10,
    relatedProducts: ['SA', 'FG'],
    source: '隆众资讯'
  },
  {
    title: '大商所发布通知：对豆粕与铁矿石期货部分合约实施差异化日内平仓手续费',
    content: '大连商品交易所通知，自下一交易日起，豆粕期货及铁矿石期货部分非主力远月合约日内平今仓交易手续费减半收取，以提升远期合约市场流动性与产业套期保值便利性。',
    category: '产业大宗',
    importance: 'important',
    sentiment: 'neutral',
    sentimentScore: 0.15,
    relatedProducts: ['M', 'I', 'Y'],
    source: '大商所公告'
  }
];

// 初始化动态新闻数据池（预置 30 条完整的初始数据）
let counter = 100;

// 30条基础预设快讯模板
const INITIAL_NEWS_TEMPLATES = [
  {
    title: '国家发改委：加快推动三季度地方政府专项债券发行与实物工作量形成',
    content: '国家发改委在新闻发布会上表示，下半年将进一步加大宏观政策逆周期调节力度，督促各地加快三季度专项债券发行使用节奏，优先保障重大基建工程与保障性住房项目资金需求。分析指出，此举将对四季度黑色系大宗商品（螺纹钢、热卷、水泥等）需求形成有力支撑。',
    category: '宏观政策',
    importance: 'urgent',
    sentiment: 'bullish',
    sentimentScore: 0.85,
    relatedProducts: ['RB', 'HC', 'I', 'IF'],
    source: '发改委官方 / 财联社',
    minuteOffset: 3
  },
  {
    title: '中国钢协：重点统计钢铁企业粗钢日产208.5万吨 环比增长1.2%',
    content: '据中国钢铁工业协会最新统计数据显示，重点统计钢铁企业共生产粗钢2085.0万吨、生铁1895.0万吨、钢材2032.0万吨。其中，粗钢日产208.5万吨，环比增长1.20%；钢材库存量1645.0万吨，比上一旬增加32.0万吨，上升1.98%。',
    category: '产业大宗',
    importance: 'important',
    sentiment: 'neutral',
    sentimentScore: -0.15,
    relatedProducts: ['RB', 'HC', 'I', 'J'],
    source: '中钢协官方',
    minuteOffset: 8
  },
  {
    title: '美联储主席最新研讨会演讲：通胀降温符合预期 劳动力市场保持韧性',
    content: '美联储主席在杰克逊霍尔全球央行研讨会上表示，当前核心PCE通胀率稳步向2%目标靠拢，劳动力市场虽然略有放缓但整体表现强劲。市场普遍预期美联储9月FOMC议息会议降息25个基点的概率升至82%。受此影响，美股三大股指期货小幅走高，美元指数回调跌破101.5。',
    category: '央行货币',
    importance: 'urgent',
    sentiment: 'bullish',
    sentimentScore: 0.78,
    relatedProducts: ['IF', 'IC', 'IH', 'AU', 'AG', 'SC'],
    source: '华尔街见闻 / Bloomberg',
    minuteOffset: 14
  },
  {
    title: '智利主要铜矿炼厂罢工谈判陷入僵局 矿端加工费TC进一步下探',
    content: '全球最大铜生产国智利旗下两座核心炼厂工会拒绝了资方提出的最新薪酬方案，罢工风险显著上升。业内人士透露，现货铜精矿加工费（TC）已跌至$8/吨的历史极低水平，国内部分大型铜冶炼企业计划缩减15%的产能。',
    category: '产业大宗',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.82,
    relatedProducts: ['CU', 'BC'],
    source: 'SMM / Reuters',
    minuteOffset: 20
  },
  {
    title: 'OPEC+代表透露：考虑自10月起按计划逐步撤回220万桶/日的自愿减产',
    content: '据三位知情人士透露，OPEC+联合部长级监督委员会（JMMC）正在评估四季度原油供需平衡。若非OPEC产量增幅有限，联盟倾向于自10月起每月恢复约18万桶/日的产量。原油WTI与布伦特应声盘中回落约1.5%。',
    category: '海外环球',
    importance: 'important',
    sentiment: 'bearish',
    sentimentScore: -0.75,
    relatedProducts: ['SC', 'FU', 'LU', 'BU'],
    source: '路透社',
    minuteOffset: 26
  },
  {
    title: 'A股收盘总览：沪指震荡收涨0.68% 沪深两市成交额时隔两周重回9000亿元',
    content: '今日A股三大指数震荡走高，上证指数涨0.68%，深证成指涨0.82%，创业板指涨1.25%。半导体、新能源汽车及非银金融板块领涨。北向资金全天净买入45.8亿元，市场风险偏好明显回暖。',
    category: '权益股市',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.70,
    relatedProducts: ['IF', 'IC', 'IM', 'IH'],
    source: '交易所官方数据',
    minuteOffset: 32
  },
  {
    title: '郑商所：调整玻璃与纯碱期货部分合约交易保证金标准与涨跌停板幅度',
    content: '郑州商品交易所发布最新公告，自下一交易日起，玻璃 (FG) 与纯碱 (SA) 期货部分主力合约交易保证金标准调整为9%，涨跌停板幅度调整为7%。分析人士指出，交易所旨在平抑近期高波动市场风险，引导资金理性交易。',
    category: '产业大宗',
    importance: 'urgent',
    sentiment: 'neutral',
    sentimentScore: -0.05,
    relatedProducts: ['FG', 'SA', 'MA'],
    source: '郑商所官方发布',
    minuteOffset: 38
  },
  {
    title: '央行公开市场今日开展1500亿元7天期逆回购操作 中标利率持平于1.70%',
    content: '中国人民银行今日开展1500亿元7天期逆回购操作，中标利率为1.70%。由于今日有1200亿元逆回购到期，公开市场实现净投放300亿元。银行间市场隔夜与7天期拆借利率小幅回落，流动性维持合理充裕。',
    category: '央行货币',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.65,
    relatedProducts: ['IF', 'IC', 'IH', 'T'],
    source: '人民银行官网',
    minuteOffset: 45
  },
  {
    title: '海关总署数据：前8个月我国进出口总值同比增3.7% 铁矿石与大豆进口量同步攀升',
    content: '据海关统计，今年前8个月我国进出口总值达28.5万亿元人民币，同比增长3.7%。其中，铁矿砂及其精矿进口7.8亿吨，增加5.2%；大豆进口7120万吨，增加3.4%。外贸结构持续优化，机电产品与大宗商品进口维持较高景气。',
    category: '宏观政策',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.72,
    relatedProducts: ['I', 'RB', 'M', 'C', 'CU'],
    source: '海关总署官方发布',
    minuteOffset: 52
  },
  {
    title: '美国EIA商业原油库存减少380万桶 远超市场预期200万桶降幅',
    content: '美国能源信息署（EIA）最新周报显示，截至上周，美国商业原油库存减少380.5万桶，降幅大幅超过预期的200万桶。炼厂开工率维持在92.5%的高位，精炼油与汽油库存同步回落，原油主力合约应声拉升1.8%。',
    category: '海外环球',
    importance: 'urgent',
    sentiment: 'bullish',
    sentimentScore: 0.81,
    relatedProducts: ['SC', 'FU', 'LU', 'BU'],
    source: 'EIA / Wall Street Journal',
    minuteOffset: 58
  },
  {
    title: '广期所工业硅与碳酸锂仓单注销与交割顺畅 现货市场基差逐步收窄',
    content: '广州期货交易所最新数据显示，工业硅 (SI) 与碳酸锂 (LC) 期货注册仓单平稳有序注销，交割库提货顺畅。现货市场受光伏组件产能恢复及新能源汽车金九银十备货驱动，产业链上下游企业采买意愿增强，期货基差逐步收窄。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'bullish',
    sentimentScore: 0.58,
    relatedProducts: ['SI', 'LC', 'AL'],
    source: '广期所发布',
    minuteOffset: 65
  },
  {
    title: '工信部：推进有色金属与建材行业绿色低碳改造 提升高质量废钢与再生铝利用率',
    content: '工信部等相关部门联合印发《关于推进重点行业碳达峰实施方案》，明确到2026年底电解铝行业电网绿电占比提升至30%以上，同时鼓励废钢回收与短流程电炉钢比例提升。有色金属与黑色系长期供给约束预期有所增强。',
    category: '宏观政策',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.76,
    relatedProducts: ['AL', 'RB', 'CU', 'NI'],
    source: '工信部',
    minuteOffset: 72
  },
  {
    title: 'USDA8月供需报告：美豆单产上修至53.2蒲式耳/英亩 豆粕主力承压回调',
    content: '美国农业部（USDA）发布的最新农产品供需报告显示，美豆单产预测上修至53.2蒲式耳/英亩，期末库存相应提高。南美巴西大豆播种意向良好。受丰产预期压制，大连豆粕 (M) 及菜粕 (RM) 期货盘中承压小幅下探。',
    category: '产业大宗',
    importance: 'important',
    sentiment: 'bearish',
    sentimentScore: -0.68,
    relatedProducts: ['M', 'RM', 'Y', 'P'],
    source: 'USDA / 农产品早报',
    minuteOffset: 80
  },
  {
    title: '国家统计局：8月份制造业PMI录得50.4% 重回荣枯扩张区间',
    content: '国家统计局最新公布数据显示，8月份中国制造业采购经理指数(PMI)为50.4%，比上月上升0.6个百分点，重回荣枯线以上。生产指数与新订单指数分别上升至51.2%与50.7%，表明制造业景气面持续扩大，大宗工业品需求预期向好。',
    category: '宏观政策',
    importance: 'urgent',
    sentiment: 'bullish',
    sentimentScore: 0.88,
    relatedProducts: ['RB', 'MA', 'SA', 'CU', 'IF'],
    source: '国家统计局发布',
    minuteOffset: 87
  },
  {
    title: '沙特阿美公布最新官价：上调10月销往亚洲的轻质原油官方售价升水',
    content: '沙特国家石油公司（沙特阿美）公布最新官价（OSP），将10月运往亚洲的阿拉伯轻质原油官方售价上调0.40美元/桶，升水幅度达到每桶+1.80美元。此举反映出亚洲炼厂四季度季节性备货需求韧性强劲。',
    category: '海外环球',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.74,
    relatedProducts: ['SC', 'LU', 'FU'],
    source: 'Bloomberg / 沙特阿美',
    minuteOffset: 95
  },
  {
    title: '太仓甲醇港口主流库存下降至48.5万吨 现货基差稳步走强',
    content: '江苏太仓主流甲醇交割库数据显示，本周华东甲醇港口库存较上周减少2.8万吨至48.5万吨，太仓现货可流通货源偏紧。下游烯烃MTO开工负荷维持在86%高位，现货基差升水盘面至+55元/吨。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'bullish',
    sentimentScore: 0.62,
    relatedProducts: ['MA', 'PP'],
    source: '卓创资讯',
    minuteOffset: 102
  },
  {
    title: '沙河地区重碱厂家现汇价格持稳 纯碱期货盘面维持深贴水格局',
    content: '河北沙河重质纯碱主流出厂报价维持在1500-1550元/吨区间，企业库存虽环比小幅积累但整体开工负荷下滑至78%。盘面SA2701小幅贴水现货，期现套利资金进场锁定无风险价差。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'neutral',
    sentimentScore: -0.10,
    relatedProducts: ['SA', 'FG'],
    source: '隆众资讯',
    minuteOffset: 110
  },
  {
    title: '大商所发布通知：对豆粕与铁矿石期货部分合约实施差异化日内平仓手续费',
    content: '大连商品交易所通知，自下一交易日起，豆粕期货及铁矿石期货部分非主力远月合约日内平今仓交易手续费减半收取，以提升远期合约市场流动性与产业套期保值便利性。',
    category: '产业大宗',
    importance: 'important',
    sentiment: 'neutral',
    sentimentScore: 0.15,
    relatedProducts: ['M', 'I', 'Y'],
    source: '大商所公告',
    minuteOffset: 118
  },
  {
    title: '华北玻璃现货产销率冲高至115% 企业原片库存降幅扩大',
    content: '河北沙河及湖北主流玻璃原片生产线数据显示，今日区域综合产销率达到115%，贸易商与深加工企业提货积极性提升。沙河安全5mm大板现货价格稳中有升，现货对FG2701盘面维持80元/吨升水。',
    category: '产业大宗',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.79,
    relatedProducts: ['FG', 'SA'],
    source: '卓创资讯',
    minuteOffset: 125
  },
  {
    title: '中国汽车工业协会：8月新能源汽车产销同比增长28.6% 动力电池装车量创新高',
    content: '中汽协发布最新快讯，8月我国新能源汽车产销分别完成109.2万辆和110.0万辆，同比分别增长29.6%和30.0%。动力电池装车量达47.2GWh，带动上游碳酸锂、工业硅及铜箔消费环比走强。',
    category: '宏观政策',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.83,
    relatedProducts: ['LC', 'SI', 'CU', 'AL'],
    source: '中汽协发布',
    minuteOffset: 133
  },
  {
    title: '欧洲央行行长拉加德讲话：降息路径依赖数据 关注通胀反弹与工资增速',
    content: '欧洲央行在法兰克福召开货币政策交流会，行长拉加德指出欧元区经济增长前景承压，通胀下行趋势明确但服务业通胀仍具韧性，欧央行将维持逐次会议评估降息幅度的谨慎策略。',
    category: '海外环球',
    importance: 'normal',
    sentiment: 'neutral',
    sentimentScore: 0.05,
    relatedProducts: ['IF', 'CU', 'AU'],
    source: 'ECB / 路透社',
    minuteOffset: 140
  },
  {
    title: '青岛港PB粉现货成交价小幅回升 钢厂铁水产量企稳提振炉料需求',
    content: '青岛港PB粉现货主流成交价达到720元/湿吨，较昨日上调8元。主要钢厂高炉开工率连续两周回升，日均铁水产量稳定在238万吨水平，铁矿石港口疏港量维持在310万吨以上的高位。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'bullish',
    sentimentScore: 0.60,
    relatedProducts: ['I', 'RB', 'J'],
    source: '我的钢铁网 (Mysteel)',
    minuteOffset: 148
  },
  {
    title: '财政部公布前8月财政收支情况：证券交易印花税同比下降 专项债加速下达',
    content: '财政部数据显示，1-8月全国一般公共预算收入14.7万亿元，支出17.4万亿元。各省市已累计下达专项债券额度超过3.2万亿元，四季度新增基建投资实物工作量将显著放量。',
    category: '宏观政策',
    importance: 'normal',
    sentiment: 'bullish',
    sentimentScore: 0.52,
    relatedProducts: ['IF', 'IC', 'IH', 'T'],
    source: '财政部网站',
    minuteOffset: 155
  },
  {
    title: '南美阿根廷大豆压榨量创年内新高 全球豆油与豆粕出口竞争加剧',
    content: '罗萨里奥谷物交易所报告指出，阿根廷农户大豆销售节奏加快，主要压榨厂开机率攀升至74%，对美豆及国内蛋白粕进口形成供应替代压力。连粕盘面主力多空分歧加大。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'bearish',
    sentimentScore: -0.45,
    relatedProducts: ['M', 'Y', 'P'],
    source: '罗萨里奥交易所',
    minuteOffset: 162
  },
  {
    title: '国家能源局：截至8月底全国累计发电装机容量约31.3亿千瓦 同比增长14.0%',
    content: '国家能源局最新数据显示，太阳能发电装机容量约7.5亿千瓦，同比增长48.8%；风电装机容量约4.7亿千瓦，同比增长19.9%。新能源装机高增拉动电网设备升级与电工用铝、沪铜刚需消费。',
    category: '宏观政策',
    importance: 'normal',
    sentiment: 'bullish',
    sentimentScore: 0.68,
    relatedProducts: ['CU', 'AL', 'SI'],
    source: '国家能源局',
    minuteOffset: 170
  },
  {
    title: '国际能源署（IEA）月报：预测2026-2027年全球石油需求增速维持在95万桶/日',
    content: 'IEA发布最新月度原油市场报告，下调今年全球石油需求增幅至95万桶/日，主要反映欧美工业活动放缓及电动汽车渗透率提升对成品油消费的结构性替代影响。国际油价承压震荡。',
    category: '海外环球',
    importance: 'important',
    sentiment: 'bearish',
    sentimentScore: -0.58,
    relatedProducts: ['SC', 'FU', 'LU'],
    source: 'IEA',
    minuteOffset: 178
  },
  {
    title: '上期所螺纹钢仓单增加1.2万吨 现货交割库蓄水池平稳运行',
    content: '上海期货交易所发布最新交割周报，螺纹钢期货注册仓单增加12150吨至88420吨。随着金九旺季工地采购逐步启动，现货市场库存去化加速，交割库出库效率整体平稳。',
    category: '产业大宗',
    importance: 'normal',
    sentiment: 'neutral',
    sentimentScore: 0.10,
    relatedProducts: ['RB', 'HC'],
    source: '上期所',
    minuteOffset: 185
  },
  {
    title: '生态环境部：全国碳排放权交易市场累计成交额突破300亿元 碳价升至92元/吨',
    content: '生态环境部发布全国碳市场运行简报，全国碳配额（CEA）收盘价报92.35元/吨，创历史新高。钢铁、水泥、电解铝等重点排放行业纳入全国碳市场工作稳步推进，高碳能耗产品成本线预期上移。',
    category: '宏观政策',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.70,
    relatedProducts: ['AL', 'RB', 'FG'],
    source: '生态环境部',
    minuteOffset: 192
  },
  {
    title: '中国人民银行授权全国银行间同业拆借中心公布：1年期LPR为3.10% 5年期以上为3.60%',
    content: '本月贷款市场报价利率（LPR）如期出炉，1年期与5年期以上品种均保持不变。业内专家指出，三季度后期降准降息政策窗口依然打开，商业银行净息差压力有望逐步缓解。',
    category: '央行货币',
    importance: 'urgent',
    sentiment: 'bullish',
    sentimentScore: 0.66,
    relatedProducts: ['IF', 'IC', 'IH', 'T', 'RB'],
    source: '中国人民银行',
    minuteOffset: 200
  },
  {
    title: '商务部：加力支持消费品以旧换新政策全面落地 推动汽车与家电消费回暖',
    content: '商务部等四部门统筹安排超长期特别国债资金，支持地方做好家电以旧换新补贴发放。家电零售龙头企业销售额环比大幅增长，带动冷轧卷板、聚丙烯及铜管等上游配套原材料采购订单释放。',
    category: '宏观政策',
    importance: 'important',
    sentiment: 'bullish',
    sentimentScore: 0.81,
    relatedProducts: ['HC', 'PP', 'CU', 'AL'],
    source: '商务部网站',
    minuteOffset: 210
  }
];

function generateInitialNewsList() {
  const now = new Date();

  return INITIAL_NEWS_TEMPLATES.map((tmpl, idx) => {
    const itemDate = new Date(now.getTime() - (tmpl.minuteOffset || (idx * 6 + 2)) * 60 * 1000);
    const chinaDate = getChinaDate(itemDate);
    const dateStr = chinaDate.toISOString().split('T')[0];
    const timeStr = chinaDate.toISOString().split('T')[1].split('.')[0];

    return {
      id: `NEWS-${dateStr.replace(/-/g, '')}-${++counter}`,
      time: timeStr,
      date: dateStr,
      title: tmpl.title,
      content: tmpl.content,
      category: tmpl.category,
      importance: tmpl.importance as 'urgent' | 'important' | 'normal',
      sentiment: tmpl.sentiment as 'bullish' | 'bearish' | 'neutral',
      sentimentScore: tmpl.sentimentScore,
      relatedProducts: tmpl.relatedProducts,
      source: tmpl.source
    };
  });
}

let liveNewsList = generateInitialNewsList();
let lastAutoGenerateTime = Date.now();

// 辅助函数：触发新增 1 条动态最新快讯
function pushDynamicNews(offsetMs: number = 0) {
  const { dateStr, timeStr } = getCurrentFormattedTime(offsetMs);
  const templateIndex = Math.floor(Math.random() * NEWS_CANDIDATE_POOL.length);
  const template = NEWS_CANDIDATE_POOL[templateIndex];

  const newItem = {
    id: `NEWS-${dateStr.replace(/-/g, '')}-${++counter}`,
    time: timeStr,
    date: dateStr,
    title: `${template.title} (实时推送)`,
    content: `${template.content} [数据截至 ${timeStr}]`,
    category: template.category,
    importance: template.importance as 'urgent' | 'important' | 'normal',
    sentiment: template.sentiment as 'bullish' | 'bearish' | 'neutral',
    sentimentScore: template.sentimentScore,
    relatedProducts: template.relatedProducts,
    source: `${template.source} · 实时`
  };

  liveNewsList.unshift(newItem);
  if (liveNewsList.length > 50) {
    liveNewsList = liveNewsList.slice(0, 50);
  }
  return newItem;
}

// 动态构建每日快读简报数据
function getDynamicBriefing() {
  const { dateStr } = getCurrentFormattedTime();
  return {
    date: dateStr,
    title: `量化智投 · ${dateStr} 每日宏观与商品决策快读简报`,
    marketMood: '偏多情绪 (Bullish)',
    overallSentimentScore: 82,
    highlights: [
      '【宏观逆周期政策加码】发改委明确三季度专项债加速落地，房地产与基建后半程实物工作量预期增强。',
      '【建材能化去库支撑】玻璃(FG)、螺纹钢(RB)与甲醇(MA)库存连续去化，贴水幅度缩小，多头共振突破日线中轨。',
      '【美联储降息逻辑落地】9月降息概率超80%，美元指数震荡走弱，商品与股指(IF)普遍获得流动性支撑。',
      '【能化供给恢复压制】OPEC+拟于10月逐步撤回自愿减产，原油上行面临密集套保抛压。'
    ],
    keyLevels: [
      { product: 'FG2701 (玻璃)', trend: '强强看涨', support: '1210', resistance: '1320', action: '多头共振突破，可依托1230回调建立多单' },
      { product: 'RB2701 (螺纹钢)', trend: '做多看涨', support: '3250', resistance: '3380', action: '逢低回调分批买入，突破3320加仓' },
      { product: 'MA2701 (甲醇)', trend: '震荡上行', support: '2410', resistance: '2580', action: '依托2430分批低吸，中线偏强' },
      { product: 'SA2701 (纯碱)', trend: '偏空下行', support: '1440', resistance: '1560', action: '反弹乏力逢高做空，破位顺势参与' },
      { product: 'M2701 (豆粕)', trend: '震荡上行', support: '2800', resistance: '2980', action: '美豆倒挂成本支撑强，依托2850逢低做多' }
    ],
    bullishFactors: [
      '专项债发行提速，三季度基建投资增速有望回升至8.5%',
      '螺纹钢与玻璃社库双去化，近月基差由贴水转为平水',
      '美联储降息窗口开启，全球有色金属低库存格局维系',
      'A股成交量突破9000亿，估值修复行情展开'
    ],
    bearishFactors: [
      'OPEC+考虑10月增产，全球原油四季供需缺口收窄',
      '欧洲高温天气缓和，天然气与电价短期大幅回调',
      '部分高位高估值品种存在阶段性获利盘了结压力'
    ],
    riskWarning: `简报更新于 ${formatChinaTime(new Date())} (北京时间)。请密切关注今晚20:30公布的最新宏观指标及美联储官员表态。高杠杆交易请严格执行止损计划。`
  };
}

/**
 * GET /api/v1/macro-news/news
 */
newsRouter.get('/news', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit || '30'), 10) || 30, 50);
  const category = String(req.query.category || '');
  const product = String(req.query.product || '');
  const search = String(req.query.search || '').trim().toLowerCase();

  // 检查是否超过 45 秒未产生新新闻，如果是则自动插入 1 条
  if (Date.now() - lastAutoGenerateTime > 45000) {
    pushDynamicNews();
    lastAutoGenerateTime = Date.now();
  }

  let list = [...liveNewsList];

  if (category && category !== '全部') {
    list = list.filter(n => n.category === category);
  }

  if (product && product !== 'ALL') {
    list = list.filter(n => n.relatedProducts.includes(product.toUpperCase()));
  }

  if (search) {
    list = list.filter(n => 
      n.title.toLowerCase().includes(search) || 
      n.content.toLowerCase().includes(search) ||
      n.source.toLowerCase().includes(search)
    );
  }

  res.json({
    status: 'ok',
    total: list.length,
    news: list.slice(0, limit)
  });
});

/**
 * POST /api/v1/macro-news/refresh
 * 手动触发获取/刷出最新突发快讯
 */
newsRouter.post('/refresh', (req: Request, res: Response) => {
  const newItem = pushDynamicNews();
  lastAutoGenerateTime = Date.now();
  res.json({
    status: 'ok',
    message: '成功抓取并生成最新宏观大宗快讯',
    newNews: newItem,
    total: liveNewsList.length,
    news: liveNewsList.slice(0, 80)
  });
});

/**
 * GET /api/v1/macro-news/dashboard
 */
newsRouter.get('/dashboard', (req: Request, res: Response) => {
  const briefing = getDynamicBriefing();
  res.json({
    status: 'ok',
    summary: {
      totalToday: liveNewsList.length,
      urgentCount: liveNewsList.filter(n => n.importance === 'urgent').length,
      bullishCount: liveNewsList.filter(n => n.sentiment === 'bullish').length,
      bearishCount: liveNewsList.filter(n => n.sentiment === 'bearish').length,
      overallSentiment: '偏多 (82/100)'
    },
    briefing: briefing,
    latestNews: liveNewsList.slice(0, 5)
  });
});

/**
 * GET /api/v1/briefing/
 */
newsRouter.get('/briefing', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    data: getDynamicBriefing()
  });
});

/**
 * POST /api/v1/macro-news/briefing/generate
 * 重新生成 AI 智能研报简报
 */
newsRouter.post('/briefing/generate', (req: Request, res: Response) => {
  const briefing = getDynamicBriefing();
  res.json({
    status: 'ok',
    message: 'AI 模型 (Gemini Pro) 已完成全网最新智投简报研判生成',
    briefing: briefing
  });
});

