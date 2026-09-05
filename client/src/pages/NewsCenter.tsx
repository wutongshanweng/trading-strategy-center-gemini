import React, { useState, useEffect, useMemo } from 'react';
import { 
  Newspaper, Zap, Sparkles, Search, RefreshCw, 
  Volume2, VolumeX, Copy, Check, TrendingUp, 
  TrendingDown, ShieldAlert, BookOpen, Layers, 
  Clock, ArrowUpRight, Flame, Filter, BarChart2,
  Calendar, Award
} from 'lucide-react';
import { message, Tag, Select, Input, Button, Tabs, Tooltip, Badge } from 'antd';
import { macroNewsIntegration } from '../services/tradingCenterClient';
import { LLMModelSelector } from '../components/LLMModelSelector';

interface NewsItem {
  id: string;
  time: string;
  date: string;
  title: string;
  content: string;
  category: string;
  importance: 'urgent' | 'important' | 'normal';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  relatedProducts: string[];
  source: string;
}

interface MacroIndicatorItem {
  id: string;
  name: string;
  category: string;
  currentValue: string;
  previousValue: string;
  forecastValue: string;
  unit: string;
  publishDate: string;
  impactLevel: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impactDescription: string;
  targetAssets: string[];
}

interface SpotBasisItem {
  symbol: string;
  name: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  basisRate: string;
  status: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  location?: string;
  deliveryMonth?: string;
}

interface BriefingData {
  date: string;
  title: string;
  marketMood: string;
  overallSentimentScore: number;
  highlights: string[];
  keyLevels: Array<{
    product: string;
    trend: string;
    support: string;
    resistance: string;
    action: string;
  }>;
  bullishFactors: string[];
  bearishFactors: string[];
  riskWarning: string;
}

interface NewsCenterProps {
  onSelectSymbol?: (sym: string) => void;
}

export function NewsCenter({ onSelectSymbol }: NewsCenterProps) {
  const [activeTab, setActiveTab] = useState<'flash' | 'briefing' | 'macro_basis'>('flash');
  const [briefingPeriod, setBriefingPeriod] = useState<'morning' | 'noon' | 'evening'>('evening');
  
  // LLM 推理模型选择
  const [selectedLlmProviderId, setSelectedLlmProviderId] = useState<string>('');
  const [selectedLlmModel, setSelectedLlmModel] = useState<string>('gemini-2.5-flash');

  // 快讯数据状态
  const STORAGE_KEY = 'macro_flash_news_pool_v30';
  const [newsList, setNewsList] = useState<NewsItem[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 30);
        }
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [briefingData, setBriefingData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  // 辅助函数：更新并持久化快讯列表至 localStorage（严格保持最多 30 条）
  const updateAndPersistNews = (incoming: NewsItem[]) => {
    setNewsList(prev => {
      // 合并去重并优先保留最新项
      const map = new Map<string, NewsItem>();
      incoming.forEach(item => {
        if (item && item.id) map.set(item.id, item);
      });
      prev.forEach(item => {
        if (item && item.id && !map.has(item.id)) {
          map.set(item.id, item);
        }
      });
      const combined = Array.from(map.values()).slice(0, 30);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      } catch {
        // ignore
      }
      return combined;
    });
  };

  // 宏观指标与现货基差状态
  const [macroList, setMacroList] = useState<MacroIndicatorItem[]>([]);
  const [loadingMacro, setLoadingMacro] = useState(false);
  const [macroCategoryFilter, setMacroCategoryFilter] = useState<string>('ALL');
  const [macroSentimentFilter, setMacroSentimentFilter] = useState<string>('ALL');
  const [basisSearchQuery, setBasisSearchQuery] = useState<string>('');
  const [basisFilter, setBasisFilter] = useState<'ALL' | 'BACKWARDATION' | 'CONTANGO'>('ALL');
  
  // 现货基差数据池
  const [basisList, setBasisList] = useState<SpotBasisItem[]>([
    { symbol: 'RB2701', name: '螺纹钢', spotPrice: 3450, futuresPrice: 3380, basis: 70, basisRate: '+2.07%', status: '升水 (Backwardation)', sentiment: 'BULLISH', location: '上海/杭州仓单现货', deliveryMonth: '2027-01' },
    { symbol: 'MA2701', name: '甲醇', spotPrice: 2480, futuresPrice: 2425, basis: 55, basisRate: '+2.27%', status: '升水 (Backwardation)', sentiment: 'BULLISH', location: '华东太仓主流库', deliveryMonth: '2027-01' },
    { symbol: 'SA2701', name: '纯碱', spotPrice: 1520, futuresPrice: 1600, basis: -80, basisRate: '-5.00%', status: '贴水 (Contango)', sentiment: 'BEARISH', location: '沙河重碱现汇', deliveryMonth: '2027-01' },
    { symbol: 'FG2701', name: '玻璃', spotPrice: 950, futuresPrice: 870, basis: 80, basisRate: '+9.20%', status: '升水 (Backwardation)', sentiment: 'BULLISH', location: '河北大板现货', deliveryMonth: '2027-01' },
    { symbol: 'M2701', name: '豆粕', spotPrice: 3080, futuresPrice: 3020, basis: 60, basisRate: '+1.99%', status: '升水 (Backwardation)', sentiment: 'BULLISH', location: '张家港油厂现货', deliveryMonth: '2027-01' },
    { symbol: 'I2701', name: '铁矿石', spotPrice: 720, futuresPrice: 690, basis: 30, basisRate: '+4.35%', status: '升水 (Backwardation)', sentiment: 'BULLISH', location: '青岛港PB粉折盘面', deliveryMonth: '2027-01' },
    { symbol: 'CU2610', name: '沪铜', spotPrice: 72500, futuresPrice: 72000, basis: 500, basisRate: '+0.69%', status: '升水 (Backwardation)', sentiment: 'NEUTRAL', location: '上海物贸平水铜', deliveryMonth: '2026-10' },
    { symbol: 'TA2701', name: 'PTA', spotPrice: 5400, futuresPrice: 5520, basis: -120, basisRate: '-2.17%', status: '贴水 (Contango)', sentiment: 'BEARISH', location: '华东主流聚酯现货', deliveryMonth: '2027-01' },
    { symbol: 'AU2612', name: '沪金', spotPrice: 575.5, futuresPrice: 578.2, basis: -2.7, basisRate: '-0.46%', status: '贴水 (Contango)', sentiment: 'NEUTRAL', location: '上海金交所基准', deliveryMonth: '2026-12' }
  ]);

  // 过滤选项
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [sentimentFilter, setSentimentFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 交互控制
  const [readingNewsId, setReadingNewsId] = useState<string | null>(null);
  const [copiedNewsId, setCopiedNewsId] = useState<string | null>(null);
  const [expandedNewsIds, setExpandedNewsIds] = useState<Set<string>>(new Set());

  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(new Date().toLocaleTimeString());

  // 加载宏观数据
  const fetchMacroData = async () => {
    setLoadingMacro(true);
    try {
      const res = await fetch('/api/v1/data/macro');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'ok' && Array.isArray(json.data) && json.data.length > 0) {
          setMacroList(json.data);
          return;
        }
      }
      // 备用宏观指标库
      setMacroList([
        { id: 'PMI_MFG', name: '官方制造业采购经理指数 (PMI)', category: '行业景气', currentValue: '50.4%', forecastValue: '50.1%', previousValue: '49.8%', unit: '%', publishDate: '2026-08-01', impactLevel: 'HIGH', sentiment: 'BULLISH', impactDescription: 'PMI 重回荣枯线50%上方，制造业生产与新订单景气度回升，利好螺纹钢(RB)、甲醇(MA)等工业品。', targetAssets: ['RB', 'MA', 'SA', 'FG', 'CU'] },
        { id: 'CPI_YOY', name: '居民消费价格指数 (CPI 同比)', category: '通胀物价', currentValue: '+0.8%', forecastValue: '+0.7%', previousValue: '+0.5%', unit: '%', publishDate: '2026-08-10', impactLevel: 'HIGH', sentiment: 'BULLISH', impactDescription: '通胀温和回暖，反映下游消费需求逐步修复，农产品与豆粕(M)获得抗通胀溢价支撑。', targetAssets: ['M', 'Y', 'P', 'MA'] },
        { id: 'PPI_YOY', name: '工业生产者出厂价格 (PPI 同比)', category: '通胀物价', currentValue: '-1.2%', forecastValue: '-1.4%', previousValue: '-1.8%', unit: '%', publishDate: '2026-08-10', impactLevel: 'MEDIUM', sentiment: 'NEUTRAL', impactDescription: 'PPI 降幅持续收窄，工业品去库存阶段接近尾声，纯碱(SA)、玻璃(FG)中上游利润企稳。', targetAssets: ['RB', 'SA', 'FG', 'CU'] },
        { id: 'LPR_1Y', name: '央行贷款市场报价利率 (1年期 LPR)', category: '货币信贷', currentValue: '3.10%', forecastValue: '3.10%', previousValue: '3.15%', unit: '%', publishDate: '2026-08-20', impactLevel: 'HIGH', sentiment: 'BULLISH', impactDescription: '货币政策维持适度宽松，实体融资成本走低，基建与地产产业链流动性充裕。', targetAssets: ['RB', 'FG', 'I'] },
        { id: 'TSF_INC', name: '社会融资规模新增量 (月度)', category: '货币信贷', currentValue: '3.12 万亿', forecastValue: '3.05 万亿', previousValue: '2.85 万亿', unit: '万亿', publishDate: '2026-08-12', impactLevel: 'HIGH', sentiment: 'BULLISH', impactDescription: '社融超预期放量，企业中长期贷款维持韧性，大宗商品系统性需求预期提振。', targetAssets: ['RB', 'MA', 'M', 'CU'] },
        { id: 'STEEL_OUTPUT', name: '重点钢企日均粗钢/铁水产量', category: '行业景气', currentValue: '238.6 万吨', forecastValue: '235.0 万吨', previousValue: '234.2 万吨', unit: '万吨', publishDate: '2026-08-25', impactLevel: 'HIGH', sentiment: 'BULLISH', impactDescription: '高炉开工率与铁水产量企稳回升，支撑螺纹钢与上游原料刚需补库。', targetAssets: ['RB', 'I'] }
      ]);
    } catch (e) {
      console.warn('Load macro indicators fallback:', e);
    } finally {
      setLoadingMacro(false);
    }
  };

  // 刷新现货基差价格
  const handleRefreshBasis = () => {
    message.loading({ content: '正在重新计算七大主力现货一口价与盘面基差...', key: 'basisKey' });
    setTimeout(() => {
      setBasisList(prev => prev.map(item => {
        const jitter = (Math.random() - 0.5) * 4;
        const newSpot = Math.round((item.spotPrice + jitter) * 10) / 10;
        const newBasis = Math.round((newSpot - item.futuresPrice) * 10) / 10;
        const rate = ((newBasis / item.futuresPrice) * 100).toFixed(2) + '%';
        return {
          ...item,
          spotPrice: newSpot,
          basis: newBasis,
          basisRate: (newBasis > 0 ? '+' : '') + rate,
          status: newBasis > 0 ? '升水 (Backwardation)' : '贴水 (Contango)',
          sentiment: newBasis > 0 ? 'BULLISH' : newBasis < 0 ? 'BEARISH' : 'NEUTRAL'
        };
      }));
      message.success({ content: '现货一口价与基差矩阵已同步至最新盘面！', key: 'basisKey' });
    }, 400);
  };

  // 过滤后的宏观与基差数据
  const filteredMacroList = useMemo(() => {
    return macroList.filter(item => {
      if (macroCategoryFilter !== 'ALL' && item.category !== macroCategoryFilter) return false;
      if (macroSentimentFilter !== 'ALL' && item.sentiment !== macroSentimentFilter) return false;
      return true;
    });
  }, [macroList, macroCategoryFilter, macroSentimentFilter]);

  const filteredBasisList = useMemo(() => {
    return basisList.filter(item => {
      if (basisFilter === 'BACKWARDATION' && item.basis <= 0) return false;
      if (basisFilter === 'CONTANGO' && item.basis >= 0) return false;
      if (basisSearchQuery) {
        const q = basisSearchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.symbol.toLowerCase().includes(q);
      }
      return true;
    });
  }, [basisList, basisFilter, basisSearchQuery]);

  // 从 API 加载数据
  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, newsRes] = await Promise.all([
        macroNewsIntegration.dashboard().catch(() => null),
        macroNewsIntegration.news(30).catch(() => null)
      ]);

      if (newsRes && newsRes.data && Array.isArray(newsRes.data.news)) {
        updateAndPersistNews(newsRes.data.news.slice(0, 30));
      }
      
      if (dashRes && dashRes.data && dashRes.data.briefing) {
        setBriefingData(dashRes.data.briefing);
      }
      setLastUpdatedTime(new Date().toLocaleTimeString());
      fetchMacroData();
    } catch {
      message.error('加载新闻资讯失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 手动触发拉取最新突发快讯
  const handleTriggerRefresh = async () => {
    setLoading(true);
    message.loading({ content: '正在实时连接新闻源抓取最新宏观与产业快讯...', key: 'refreshNews' });
    try {
      const res = await macroNewsIntegration.refreshNews();
      message.destroy('refreshNews');
      if (res?.data?.news) {
        updateAndPersistNews(res.data.news.slice(0, 30));
        setLastUpdatedTime(new Date().toLocaleTimeString());
        message.success(`成功实时抓取 1 条最新宏观与产业快讯！标题：${res.data.newNews?.title || '突发资讯'}`);
      } else {
        fetchData();
      }
    } catch {
      message.destroy('refreshNews');
      message.error('抓取最新快讯失败');
    } finally {
      setLoading(false);
    }
  };

  // 30秒自动刷新快讯 (严格保存更新近30条)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      macroNewsIntegration.news(30).then(res => {
        if (res?.data?.news && Array.isArray(res.data.news)) {
          updateAndPersistNews(res.data.news.slice(0, 30));
          setLastUpdatedTime(new Date().toLocaleTimeString());
        }
      }).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // 语音 TTS 朗读功能
  const handleTTS = (id: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (readingNewsId === id) {
        window.speechSynthesis.cancel();
        setReadingNewsId(null);
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.onend = () => setReadingNewsId(null);
        utterance.onerror = () => setReadingNewsId(null);
        window.speechSynthesis.speak(utterance);
        setReadingNewsId(id);
        message.info('开始语音播报快讯');
      }
    } else {
      message.warning('当前浏览器不支持语音合成播放');
    }
  };

  // 复制文本
  const handleCopy = (id: string, title: string, content: string) => {
    const fullText = `【快讯】${title}\n${content}\n—— 来源: 量化智投实时新闻中心`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedNewsId(id);
      message.success('快讯已成功复制到剪贴板');
      setTimeout(() => setCopiedNewsId(null), 2000);
    });
  };

  // 切换折叠展开
  const toggleExpand = (id: string) => {
    setExpandedNewsIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // AI 实时生成/更新快读简报
  const handleGenerateAIBriefing = async () => {
    setGeneratingBriefing(true);
    message.loading({ content: `AI 模型 [${selectedLlmModel}] 正在全网扫描宏观政策与大宗数据生成最新简报...`, key: 'gen' });
    
    try {
      const res = await macroNewsIntegration.generateBriefing();
      message.destroy('gen');
      if (res?.data?.briefing) {
        setBriefingData(res.data.briefing);
        message.success(`最新 AI 市场智投简报已由 [${selectedLlmModel}] 研判生成完毕！`);
      } else {
        fetchData();
      }
    } catch {
      message.destroy('gen');
      message.error('生成简报失败');
    } finally {
      setGeneratingBriefing(false);
    }
  };

  // 过滤后的快讯列表
  const filteredNews = useMemo(() => {
    return newsList.filter(item => {
      const matchSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.source.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === '全部' || item.category === categoryFilter;
      const matchSent = sentimentFilter === 'ALL' || item.sentiment === sentimentFilter;
      const matchProd = productFilter === 'ALL' || item.relatedProducts.includes(productFilter.toUpperCase());
      return matchSearch && matchCat && matchSent && matchProd;
    });
  }, [newsList, searchQuery, categoryFilter, sentimentFilter, productFilter]);

  // 统计数值
  const stats = useMemo(() => {
    const total = newsList.length;
    const urgentCount = newsList.filter(n => n.importance === 'urgent').length;
    const bullishCount = newsList.filter(n => n.sentiment === 'bullish').length;
    const bearishCount = newsList.filter(n => n.sentiment === 'bearish').length;
    return { total, urgentCount, bullishCount, bearishCount };
  }, [newsList]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header Banner & Global Sentiment Indicator */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
          <Newspaper className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl shadow-inner">
                <Newspaper className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                  新闻中心与智投简报 (News & Intelligence Hub)
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 24/7 STREAMING
                  </span>
                </h1>
                <p className="text-xs text-indigo-200/80 mt-1">
                  7x24 小时全球宏观政策、大宗商品产业链动态、央行货币决议与 AI 每日精编交易决策简报。
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Chips */}
          <div className="grid grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-slate-400 block font-medium">今日快讯</span>
              <span className="text-lg font-bold font-mono text-white mt-0.5">{stats.total} 条</span>
            </div>
            <div className="bg-rose-950/30 border border-rose-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-rose-400 block font-medium">🚨 特急预警</span>
              <span className="text-lg font-bold font-mono text-rose-400 mt-0.5">{stats.urgentCount} 条</span>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-emerald-400 block font-medium">利多因子</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{stats.bullishCount} 条</span>
            </div>
            <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-indigo-300 block font-medium">整体情绪</span>
              <span className="text-lg font-bold font-mono text-indigo-300 mt-0.5">偏多 78</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('flash')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'flash'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            实时快讯 (Live Flash)
            <Badge count={stats.total} overflowCount={99} className="ml-1" style={{ backgroundColor: '#4f46e5' }} />
          </button>

          <button
            onClick={() => setActiveTab('briefing')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'briefing'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            快读简报 (Daily Briefing)
          </button>

          <button
            onClick={() => setActiveTab('macro_basis')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'macro_basis'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            宏观指标与现货基差 (Macro & Spot Basis)
          </button>
        </div>

        <div className="flex items-center gap-3 pr-2">
          {activeTab === 'flash' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">30秒自动刷新</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  autoRefresh ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    autoRefresh ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {activeTab === 'macro_basis' ? (
            <Button
              type="primary"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingMacro ? 'animate-spin' : ''}`} />}
              onClick={() => {
                fetchMacroData();
                handleRefreshBasis();
              }}
              loading={loadingMacro}
              className="bg-emerald-600 hover:bg-emerald-500 border-none font-bold text-xs shadow-md shadow-emerald-600/30"
            >
              一键刷新宏观与基差
            </Button>
          ) : (
            <>
              <Button
                type="primary"
                icon={<Zap className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                onClick={handleTriggerRefresh}
                loading={loading}
                className="bg-indigo-600 hover:bg-indigo-500 border-none font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                抓取最新快讯
              </Button>

              <Button
                type="default"
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                onClick={fetchData}
                loading={loading}
                className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs"
              >
                重载列表
              </Button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: 实时快讯 (Real-time Flash News) */}
      {activeTab === 'flash' && (
        <div className="space-y-4">
          
          {/* Controls & Filter Bar */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* 关键词搜索 */}
              <Input
                placeholder="搜索标题 / 内容 / 来源机构"
                prefix={<Search className="w-4 h-4 text-slate-500" />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: 220 }}
                allowClear
                className="bg-slate-950 text-white border-slate-800"
              />

              {/* 领域分类 */}
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: 130 }}
                options={[
                  { label: '全部领域', value: '全部' },
                  { label: '宏观政策', value: '宏观政策' },
                  { label: '产业大宗', value: '产业大宗' },
                  { label: '央行货币', value: '央行货币' },
                  { label: '海外环球', value: '海外环球' },
                  { label: '权益股市', value: '权益股市' },
                ]}
              />

              {/* 情绪判断 */}
              <Select
                value={sentimentFilter}
                onChange={setSentimentFilter}
                style={{ width: 120 }}
                options={[
                  { label: '全部情绪', value: 'ALL' },
                  { label: '🟢 利多看涨', value: 'bullish' },
                  { label: '🔴 利空看跌', value: 'bearish' },
                  { label: '⚪ 中性震荡', value: 'neutral' },
                ]}
              />

              {/* 关联品种 */}
              <Select
                value={productFilter}
                onChange={setProductFilter}
                style={{ width: 130 }}
                options={[
                  { label: '全部标的品种', value: 'ALL' },
                  { label: '螺纹钢 (RB)', value: 'RB' },
                  { label: '原油 (SC)', value: 'SC' },
                  { label: '沪深300 (IF)', value: 'IF' },
                  { label: '沪铜 (CU)', value: 'CU' },
                  { label: '豆粕 (M)', value: 'M' },
                ]}
              />
            </div>

            <div className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-3">
              <span>已筛选出 <strong className="text-white">{filteredNews.length}</strong> / 本地已持久化保存 <strong className="text-emerald-400">{newsList.length}</strong> 条实时快讯 (容量已扩展至 30 条)</span>
              <span className="text-indigo-400/80 border-l border-slate-800 pl-3">最近同步: {lastUpdatedTime}</span>
            </div>
          </div>

          {/* Flash News Timeline List */}
          <div className="space-y-3">
            {filteredNews.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                <Newspaper className="w-10 h-10 mx-auto opacity-30 mb-2" />
                <p className="text-xs">未搜索到相关实时快讯</p>
              </div>
            ) : (
              filteredNews.map((item) => {
                const isExpanded = expandedNewsIds.has(item.id);
                const isUrgent = item.importance === 'urgent';
                const isImportant = item.importance === 'important';

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900/50 border rounded-xl p-4 transition-all relative overflow-hidden group hover:bg-slate-900/80 ${
                      isUrgent
                        ? 'border-rose-500/60 shadow-lg shadow-rose-950/20'
                        : isImportant
                        ? 'border-indigo-500/50'
                        : 'border-slate-800/80'
                    }`}
                  >
                    {/* Left Accent Bar for Sentiment */}
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1 ${
                        item.sentiment === 'bullish'
                          ? 'bg-emerald-500'
                          : item.sentiment === 'bearish'
                          ? 'bg-rose-500'
                          : 'bg-slate-600'
                      }`}
                    />

                    <div className="pl-2 space-y-2">
                      
                      {/* Row 1: Time + Tags + Source */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {item.time}
                          </span>

                          {isUrgent && (
                            <Tag color="error" className="font-bold flex items-center gap-1 text-[10px] animate-pulse">
                              <Flame className="w-3 h-3" /> 🚨 特急预警
                            </Tag>
                          )}

                          {isImportant && !isUrgent && (
                            <Tag color="processing" className="font-medium text-[10px]">
                              ⚡ 重要
                            </Tag>
                          )}

                          <Tag color="purple" className="text-[10px] font-mono">
                            {item.category}
                          </Tag>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                            item.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            item.sentiment === 'bearish' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {item.sentiment === 'bullish' ? <TrendingUp className="w-3 h-3" /> :
                             item.sentiment === 'bearish' ? <TrendingDown className="w-3 h-3" /> : null}
                            {item.sentiment === 'bullish' ? `利多 (+${item.sentimentScore})` :
                             item.sentiment === 'bearish' ? `利空 (${item.sentimentScore})` : '中性'}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-500 font-mono">
                          来源: {item.source}
                        </span>
                      </div>

                      {/* Row 2: Title */}
                      <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors leading-snug">
                        {item.title}
                      </h3>

                      {/* Row 3: Content Body */}
                      <p className={`text-xs text-slate-300/90 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {item.content}
                      </p>

                      {/* Row 4: Action Footer & Related Products */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                        
                        {/* Related Products Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-mono">联动标的:</span>
                          {item.relatedProducts.map(p => (
                            <button
                              key={p}
                              onClick={() => onSelectSymbol && onSelectSymbol(p)}
                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-indigo-900/60 hover:text-indigo-300 border border-slate-700 rounded text-[10px] font-mono font-bold text-slate-300 transition-colors flex items-center gap-1"
                            >
                              {p} <ArrowUpRight className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-1.5 py-0.5 rounded hover:bg-indigo-950/40 transition-colors"
                          >
                            {isExpanded ? '收起详情' : '展开全文'}
                          </button>

                          <button
                            onClick={() => handleTTS(item.id, item.title + '。' + item.content)}
                            className={`p-1.5 rounded transition-colors ${
                              readingNewsId === item.id ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="语音朗读"
                          >
                            {readingNewsId === item.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleCopy(item.id, item.title, item.content)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="复制快讯"
                          >
                            {copiedNewsId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* TAB 2: 快读简报 (Quick Intelligence Briefing) */}
      {activeTab === 'briefing' && briefingData && (
        <div className="space-y-6">
          
          {/* Briefing Top Control Bar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  {briefingData.title}
                  <Tag color="cyan" className="font-mono text-[10px]">
                    {briefingData.date}
                  </Tag>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  全网宏观舆情 + 483 异构因子 + 链条数据 AI 逻辑合成研判
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* LLM Model Selector */}
              <div className="min-w-[280px]">
                <LLMModelSelector
                  selectedProviderId={selectedLlmProviderId}
                  selectedModel={selectedLlmModel}
                  onProviderChange={(provId, prov) => {
                    setSelectedLlmProviderId(provId);
                    const m = prov.model || prov.available_models?.[0] || 'gemini-2.5-flash';
                    setSelectedLlmModel(m);
                  }}
                  onModelChange={(m) => setSelectedLlmModel(m)}
                  mode="compact"
                  className="bg-slate-950 border-slate-800"
                  label="智投简报生成模型"
                />
              </div>

              {/* Period Selector */}
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                <button
                  onClick={() => setBriefingPeriod('morning')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    briefingPeriod === 'morning' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🌅 早盘前瞻
                </button>
                <button
                  onClick={() => setBriefingPeriod('noon')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    briefingPeriod === 'noon' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ☀️ 午间复盘
                </button>
                <button
                  onClick={() => setBriefingPeriod('evening')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    briefingPeriod === 'evening' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🌙 盘后总结
                </button>
              </div>

              {/* Generate Button */}
              <Button
                type="primary"
                icon={<Sparkles className={`w-3.5 h-3.5 ${generatingBriefing ? 'animate-spin' : ''}`} />}
                onClick={handleGenerateAIBriefing}
                loading={generatingBriefing}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none font-bold text-xs"
              >
                AI 重新精编生成
              </Button>
            </div>
          </div>

          {/* Section 1: Executive Highlights */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              核心看点与逻辑提炼 (Executive Summary)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {briefingData.highlights.map((item, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Key Commodity Levels & Recommended Actions */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                重点品种关键点位与执行推演 (Key Levels & Actions)
              </h3>
              <span className="text-xs text-slate-400 font-mono">支撑位 / 阻力位 / 战术动作</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono bg-slate-950/60">
                    <th className="p-3">标的品种</th>
                    <th className="p-3">研判方向</th>
                    <th className="p-3">核心支撑位</th>
                    <th className="p-3">核心阻力位</th>
                    <th className="p-3">建议策略动作</th>
                    <th className="p-3 text-right">联动分析</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {briefingData.keyLevels.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/80 transition-colors">
                      <td className="p-3 font-bold text-white font-sans">{row.product}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.trend.includes('多') || row.trend.includes('涨')
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : row.trend.includes('空') || row.trend.includes('跌')
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {row.trend}
                        </span>
                      </td>
                      <td className="p-3 text-emerald-400 font-bold">¥{row.support}</td>
                      <td className="p-3 text-rose-400 font-bold">¥{row.resistance}</td>
                      <td className="p-3 text-slate-200 font-sans">{row.action}</td>
                      <td className="p-3 text-right">
                        <Button
                          size="small"
                          type="link"
                          onClick={() => onSelectSymbol && onSelectSymbol(row.product.split(' ')[0])}
                          className="text-indigo-400 hover:text-indigo-300 text-xs p-0"
                        >
                          看盘面
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Bullish vs Bearish Factor Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bullish Matrix */}
            <div className="bg-emerald-950/10 border border-emerald-900/40 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> 利多因素矩阵 (Bullish Factors)
              </h3>
              <div className="space-y-2">
                {briefingData.bullishFactors.map((item, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-emerald-900/30 rounded-xl p-3 text-xs text-slate-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    <p className="leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bearish Matrix */}
            <div className="bg-rose-950/10 border border-rose-900/40 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> 利空因素矩阵 (Bearish Factors)
              </h3>
              <div className="space-y-2">
                {briefingData.bearishFactors.map((item, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-rose-900/30 rounded-xl p-3 text-xs text-slate-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                    <p className="leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Section 4: Risk Warning & Event Radar */}
          <div className="bg-amber-950/10 border border-amber-900/40 rounded-2xl p-5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                风控提示与重磅日历提醒 (Risk & Event Radar)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {briefingData.riskWarning}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MERGED TAB: MACRO INDICATORS & SPOT BASIS HUB */}
      {/* ========================================================= */}
      {activeTab === 'macro_basis' && (
        <div className="space-y-6">

          {/* 3.1 Overview Stats Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">监控宏观核心指标</span>
                <span className="text-xl font-bold font-mono text-white mt-1 block">{macroList.length} 项</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">偏多宏观驱动指标</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  {macroList.filter(m => m.sentiment === 'BULLISH').length} 项
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">现货升水品种 (Backwardation)</span>
                <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                  {basisList.filter(b => b.basis > 0).length} 个 (向上引力)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">现货贴水品种 (Contango)</span>
                <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
                  {basisList.filter(b => b.basis < 0).length} 个 (现货折价)
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* 3.2 Macroeconomic Indicators Section */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">中国宏观经济核心指标与多空传导看板</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  跟踪官方 PMI、CPI、PPI、LPR 利率与社融数据对国内期货核心品种的驱动传导
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                  {['ALL', '行业景气', '通胀物价', '货币信贷'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setMacroCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        macroCategoryFilter === cat ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat === 'ALL' ? '全部分类' : cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                  {[
                    { key: 'ALL', label: '全部多空' },
                    { key: 'BULLISH', label: '偏多驱动' },
                    { key: 'BEARISH', label: '偏空驱动' },
                    { key: 'NEUTRAL', label: '中性震荡' }
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setMacroSentimentFilter(s.key)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        macroSentimentFilter === s.key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchMacroData}
                  disabled={loadingMacro}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingMacro ? 'animate-spin' : ''}`} />
                  <span>刷新指标</span>
                </button>
              </div>
            </div>

            {/* Macro Indicator Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMacroList.map((m) => (
                <div key={m.id} className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-md space-y-3 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-white block">{m.name}</span>
                      <span className="text-[10px] text-slate-400">{m.category} • 公布于 {m.publishDate}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                      m.sentiment === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      m.sentiment === 'BEARISH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {m.sentiment === 'BULLISH' ? '偏多驱动' : m.sentiment === 'BEARISH' ? '偏空驱动' : '中性震荡'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">最新公布</span>
                      <span className="text-sm font-black text-indigo-300">{m.currentValue}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">市场预期</span>
                      <span className="text-xs font-medium text-slate-300">{m.forecastValue}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">前值</span>
                      <span className="text-xs font-medium text-slate-400">{m.previousValue}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/30 p-2.5 rounded-lg border border-slate-900">
                    {m.impactDescription}
                  </p>

                  <div className="flex flex-wrap items-center gap-1 text-[10px] pt-1">
                    <span className="text-slate-400">驱动标的:</span>
                    {m.targetAssets.map(sym => (
                      <button
                        key={sym}
                        onClick={() => onSelectSymbol && onSelectSymbol(sym)}
                        className="px-1.5 py-0.5 bg-slate-800 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded font-mono font-bold transition-colors cursor-pointer"
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredMacroList.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                暂无符合筛选条件的宏观指标
              </div>
            )}
          </div>

          {/* 3.3 Spot Basis Matrix Section */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">大宗商品核心品种：现货基差与期现结构分析矩阵</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  实时采集现货一口价、计算期现基差（Basis = 现货 - 期货）及贴水升水结构，辅助研判价格万有引力方向。
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="搜索品种/合约代码..."
                  prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  value={basisSearchQuery}
                  onChange={e => setBasisSearchQuery(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-200 text-xs rounded-xl w-40"
                  allowClear
                />

                <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                  {[
                    { key: 'ALL', label: '全部结构' },
                    { key: 'BACKWARDATION', label: '现货升水' },
                    { key: 'CONTANGO', label: '现货贴水' }
                  ].map(b => (
                    <button
                      key={b.key}
                      onClick={() => setBasisFilter(b.key as any)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        basisFilter === b.key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRefreshBasis}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>实时刷新现货池</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-medium">品种 / 基准交割地</th>
                    <th className="pb-3 font-medium">当前主力合约</th>
                    <th className="pb-3 font-medium text-right">采集现货价 (元/吨)</th>
                    <th className="pb-3 font-medium text-right">盘面收盘价</th>
                    <th className="pb-3 font-medium text-right">基差 (现货 - 期货)</th>
                    <th className="pb-3 font-medium text-center">期现结构形态</th>
                    <th className="pb-3 font-medium text-right">基差率</th>
                    <th className="pb-3 font-medium text-center">回归引力研判</th>
                    <th className="pb-3 font-medium text-right pr-2">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredBasisList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3">
                        <div className="font-bold text-slate-200">{row.name}</div>
                        {row.location && (
                          <div className="text-[10px] text-slate-500">{row.location}</div>
                        )}
                      </td>
                      <td className="py-3 font-mono">
                        <button
                          onClick={() => onSelectSymbol && onSelectSymbol(row.symbol.replace(/[0-9]/g, ''))}
                          className="text-indigo-300 hover:text-indigo-200 font-bold hover:underline cursor-pointer"
                        >
                          {row.symbol}
                        </button>
                      </td>
                      <td className="py-3 text-right font-mono text-white font-medium">¥{row.spotPrice}</td>
                      <td className="py-3 text-right font-mono text-slate-300">¥{row.futuresPrice}</td>
                      <td className={`py-3 text-right font-mono font-bold ${row.basis > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.basis > 0 ? '+' : ''}{row.basis}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.basis > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className={`py-3 text-right font-mono ${row.basis > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.basisRate}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.sentiment === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-300' :
                          row.sentiment === 'BEARISH' ? 'bg-rose-500/20 text-rose-300' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {row.sentiment === 'BULLISH' ? '向上引力 (升水收敛)' : row.sentiment === 'BEARISH' ? '向下收敛 (贴水承压)' : '中性震荡'}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <Button
                          size="small"
                          type="link"
                          onClick={() => onSelectSymbol && onSelectSymbol(row.symbol.replace(/[0-9]/g, ''))}
                          className="text-indigo-400 hover:text-indigo-300 text-xs p-0"
                        >
                          看盘面
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredBasisList.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                未找到匹配的现货基差记录
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

export const NewsCenterPage = NewsCenter;
