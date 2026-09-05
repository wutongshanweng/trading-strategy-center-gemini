import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  BrainCircuit, 
  RefreshCw, 
  AlertTriangle, 
  Database, 
  Play, 
  Pause, 
  TrendingUp, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Server,
  BarChart3,
  Trophy,
  Sliders,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Percent,
  Compass,
  Zap,
  ChevronRight, ChevronLeft, Menu,
  Search,
  SlidersHorizontal,
  FileText,
  Sparkles,
  ArrowRightLeft,
  Flame,
  Check,
  Info,
  Calendar,
  Layers3,
  FlaskConical,
  Library,
  Newspaper,
  Copy,
  Target,
  ShieldAlert,
  PieChart,
  TrendingDown,
  Gauge
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { DataCenterTab } from './components/DataCenterTab';
import FactorResearch from './pages/FactorResearch';
import StrategyLibrary from './pages/StrategyLibrary';
import { TradingSignals } from './pages/TradingSignals';
import { NewsCenter } from './pages/NewsCenter';
import { LLMConfig } from './pages/LLMConfig';
import { LLMModelSelector } from './components/LLMModelSelector';
import { KlineDecisionCenter } from './components/KlineDecisionCenter';
import { llmIntegration } from './services/tradingCenterClient';

export function App() {
  const [activeTab, setActiveTab] = useState<'datacenter' | 'news' | 'factor' | 'strategy_and_backtest' | 'trading_signals' | 'llm'>('trading_signals');
  const [strategySubTab, setStrategySubTab] = useState<'library' | 'backtest'>('library');
  const [signalsSubTab, setSignalsSubTab] = useState<'signals' | 'decision'>('signals');
  const [llmSubTab, setLlmSubTab] = useState<'agent' | 'config'>('agent');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Multi-Timeframe & Decision State ---
  const [selectedSymbol, setSelectedSymbol] = useState('FG2701');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1d');
  const [klinesData, setKlinesData] = useState<any[]>([]);
  const [decisionData, setDecisionData] = useState<any>(null);
  const [loadingKlines, setLoadingKlines] = useState(false);

  // --- Data Pipeline State ---
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [contractsList, setContractsList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [ingestPeriod, setIngestPeriod] = useState<'1d' | '30m'>('1d');
  const [ingestCount, setIngestCount] = useState(60);
  const [syncMessage, setSyncMessage] = useState('');

  // --- Backtest State ---
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState('DualMA');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>({ fastPeriod: 5, slowPeriod: 20 });
  const [loadingBacktest, setLoadingBacktest] = useState(false);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [tournamentResults, setTournamentResults] = useState<any[]>([]);
  const [loadingTournament, setLoadingTournament] = useState(false);

  // --- Agent State & LLM Configuration Coupling ---
  const [contextData, setContextData] = useState('IF2609 沪深300股指期货主力合约早盘高开震荡，多头主力资金净流入明显，技术形态上突破 30日均线压力位，持仓量增加 1.2万手。');
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorAgent, setErrorAgent] = useState('');
  
  // LLM Config Integration State for AI 深度投研
  const [llmProviders, setLlmProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('prov-agnes-04');
  const [selectedModel, setSelectedModel] = useState<string>('agnes-2.5-flash');
  const [usedProviderInfo, setUsedProviderInfo] = useState<any>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  useEffect(() => {
    llmIntegration.providers()
      .then((res: any) => {
        const list = res?.data?.providers || res?.providers || [];
        if (list && list.length > 0) {
          const activeList = list.filter((p: any) => p.is_active);
          const validList = activeList.length > 0 ? activeList : list;
          setLlmProviders(validList);
          const activeProv = validList[0];
          if (activeProv) {
            setSelectedProviderId(activeProv.id);
            setSelectedModel(activeProv.model || activeProv.available_models?.[0] || 'gemini-3.7-flash');
          }
        }
      })
      .catch((err: any) => {
        console.warn('加载 LLM 提供商配置失败:', err);
      });
  }, []);

  const handleProviderChange = (provId: string) => {
    setSelectedProviderId(provId);
    const prov = llmProviders.find(p => p.id === provId);
    if (prov) {
      const defaultMod = prov.model || (prov.available_models && prov.available_models[0]) || 'gemini-3.7-flash';
      setSelectedModel(defaultMod);
    }
  };

  // Supported Dimensions
  const periods = [
    { key: '30m', label: '30分钟 M30', source: 'L1 物理落库' },
    { key: '1h', label: '1小时 H1', source: 'M30 动态聚合' },
    { key: '4h', label: '4小时 H4', source: 'M30 动态聚合' },
    { key: '1d', label: '日线 D1', source: 'M30 动态聚合' },
    { key: '1w', label: '周线 W1', source: 'M30 动态聚合' }
  ];

  // Quick China Futures Dominant Selector (Active 2026/2027 Contracts)
  const popularFutures = [
    { symbol: 'RB2701', name: '螺纹钢', exchange: '上期所', category: '黑色金属' },
    { symbol: 'MA2701', name: '甲醇', exchange: '郑商所', category: '能源化工' },
    { symbol: 'SA2701', name: '纯碱', exchange: '郑商所', category: '能源化工' },
    { symbol: 'FG2701', name: '玻璃', exchange: '郑商所', category: '建材化工' },
    { symbol: 'M2701', name: '豆粕', exchange: '大商所', category: '农产品' }
  ];

  // Fetch status & telemetry
  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/v1/data/status');
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.status === 'ok') {
        setDiagnostics(json.data);
      }
    } catch (e) {
      // Dev server initialization or temporary network retry
      console.warn('Diagnostics background sync:', e);
    }
  };

  // Fetch contracts list
  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/v1/data/contracts');
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setContractsList(Array.isArray(json.data) ? json.data : (json.data.contracts || []));
      }
    } catch (e: any) {
      console.warn('Failed to fetch contracts:', e?.message || e);
    }
  };

  // Fetch K-line & Decision
  const fetchKlinesAndDecision = async (sym = selectedSymbol, per = selectedPeriod) => {
    setLoadingKlines(true);
    try {
      const res = await fetch(`/api/v1/data/klines?symbol=${encodeURIComponent(sym)}&period=${encodeURIComponent(per)}&limit=100`);
      const json = await res.json();
      if (json.status === 'ok') {
        setKlinesData(json.data || []);
        setDecisionData(json.decision || null);
      }
    } catch (e) {
      console.warn('Failed to fetch klines & decision:', e);
    } finally {
      setLoadingKlines(false);
    }
  };

  // Fetch strategies for backtesting
  const fetchStrategies = async () => {
    try {
      const res = await fetch('/api/v1/backtest/strategies');
      const json = await res.json();
      if (json.status === 'ok' && json.data?.length > 0) {
        setStrategies(json.data);
        const defaultStrat = json.data[0];
        if (defaultStrat && defaultStrat.params) {
          const initialP = defaultStrat.params.reduce((acc: any, p: any) => {
            acc[p.name] = p.defaultValue;
            return acc;
          }, {});
          setStrategyParams(initialP);
        }
      }
    } catch (e: any) {
      console.warn('Failed to fetch strategies:', e?.message || e);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchContracts();
    fetchStrategies();
    fetchKlinesAndDecision(selectedSymbol, selectedPeriod);
    runBacktestExecution('DualMA', selectedSymbol, { fastPeriod: 5, slowPeriod: 20 });
    runTournamentBench(selectedSymbol);

    // Auto-refresh diagnostics and telemetry every 10s
    const interval = setInterval(fetchDiagnostics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSymbolChange = (sym: string) => {
    setSelectedSymbol(sym);
    fetchKlinesAndDecision(sym, selectedPeriod);
  };

  const handlePeriodChange = (per: string) => {
    setSelectedPeriod(per);
    fetchKlinesAndDecision(selectedSymbol, per);
  };

  // Toggle market scheduler
  const toggleScheduler = async () => {
    try {
      const currentRunning = diagnostics?.state?.schedulerRunning;
      const res = await fetch('/api/v1/data/scheduler/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentRunning })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        await fetchDiagnostics();
      }
    } catch (e) {
      console.warn('Failed to toggle scheduler:', e);
    }
  };

  // Ingest data into PostgreSQL
  const triggerIngest = async (sym: string, per: '1d' | '30m', count: number) => {
    setLoadingData(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/v1/data/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym, period: per, count })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setSyncMessage(`已成功回补 ${sym} ${per === '30m' ? '30分钟(M30)' : '日线(D1)'} 数据 ${json.data.rowsInserted} 条入库`);
        await fetchDiagnostics();
        await fetchKlinesAndDecision(sym, selectedPeriod);
      }
    } catch (e: any) {
      setSyncMessage(`数据回补失败: ${e.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  // Batch Ingest All Major Instruments
  const triggerBatchIngest = async (per: '1d' | '30m') => {
    setLoadingData(true);
    setSyncMessage('');
    const majorBatch = ['RB2701', 'MA2701', 'SA2701', 'FG2701', 'M2701'];
    try {
      const res = await fetch('/api/v1/data/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSymbols: majorBatch, period: per, count: 40 })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setSyncMessage(`批量同步完成，已成功回补 ${majorBatch.length} 只主力期货 ${per} 数据`);
        await fetchDiagnostics();
        await fetchKlinesAndDecision(selectedSymbol, selectedPeriod);
      }
    } catch (e: any) {
      setSyncMessage(`批量同步失败: ${e.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  // Backtest simulation
  const runBacktestExecution = async (stratId = selectedStrategyId, sym = selectedSymbol, params = strategyParams) => {
    setLoadingBacktest(true);
    try {
      const res = await fetch('/api/v1/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: stratId,
          symbol: sym,
          initialCapital,
          params
        })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Not JSON response');
      }
      const json = await res.json();
      if (json.status === 'ok') {
        setBacktestResult(json.data);
      }
    } catch (e: any) {
      console.warn('Backtest run failed:', e?.message || e);
    } finally {
      setLoadingBacktest(false);
    }
  };

  // Tournament
  const runTournamentBench = async (sym = selectedSymbol) => {
    setLoadingTournament(true);
    try {
      const res = await fetch('/api/v1/backtest/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym })
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Not JSON response');
      }
      const json = await res.json();
      if (json.status === 'ok' && Array.isArray(json.data)) {
        setTournamentResults(json.data);
      }
    } catch (e) {
      console.warn('Tournament run failed:', e);
    } finally {
      setLoadingTournament(false);
    }
  };

  // AI Briefing
  const generateBriefing = async () => {
    setLoadingAgent(true);
    setErrorAgent('');
    setResult(null);
    setUsedProviderInfo(null);
    try {
      const currentProvider = llmProviders.find(p => p.id === selectedProviderId);
      const res = await fetch('/api/v1/intelligence/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: selectedSymbol, 
          contextData,
          providerId: selectedProviderId,
          model: selectedModel,
          providerName: currentProvider?.name || 'Google Gemini Pro 2.5'
        })
      });
      
      if (!res.ok) {
        // Only try parsing json if it is actually json
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          throw new Error(data.error || data.details || '研报生成失败');
        } else {
          throw new Error(`HTTP ${res.status}: 请求受限或服务不可用`);
        }
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Not JSON response');
      }

      const data = await res.json();
      setResult(data.data.briefing);
      setUsedProviderInfo(data.data.providerInfo || {
        name: currentProvider?.name || 'Agnes AI (Agnes 2.5 Flash)',
        model: selectedModel
      });
    } catch (err: any) {
      setErrorAgent(err.message);
    } finally {
      setLoadingAgent(false);
    }
  };

  const handleCopyReport = () => {
    if (!result) return;
    const textContent = `# ${result.report_title || `${selectedSymbol} 深度量化投研报告`}
【多空研判】: ${result.sentiment_label || result.sentiment} (置信度: ${result.confidence_score || 88}%)
【推理引擎】: ${usedProviderInfo?.name || 'Agnes AI'} (${usedProviderInfo?.model || selectedModel})
【盈亏比预期】: ${result.tactical_plan?.risk_reward_ratio || '1 : 3.2'}

## 一、核心执行摘要 (Executive Summary)
${result.summary}

## 二、宏观与供需基本面深入剖析 (Macro & Fundamentals)
${result.macro_and_fundamental || '暂无补充'}

## 三、主力席位与资金博弈矩阵 (Capital & Positioning)
${result.capital_and_positioning || '暂无补充'}

## 四、多周期技术形态与量化指标 (Multi-Timeframe Technical)
${result.multi_timeframe_technical || '暂无补充'}

## 五、关键技术点位 (Key Price Levels)
${result.technicalLevels?.join('\n') || ''}

## 六、战术交易执行计划 (Tactical Plan)
- 建议建仓区间: ${result.tactical_plan?.entry_zone || '现价附近分批'}
- 目标止盈 T1: ${result.tactical_plan?.take_profit_t1 || '第一阻力'}
- 进攻止盈 T2: ${result.tactical_plan?.take_profit_t2 || '强阻力'}
- 止损保护位: ${result.tactical_plan?.stop_loss || '跌破关键均线'}
- 仓位与策略: ${result.tactical_plan?.position_size_pct || '15%-25%'} | ${result.tactical_plan?.strategy_type || '顺势回踩低吸'}

## 七、尾部风险预警 (Risk Warnings)
${result.risk_warnings?.join('\n') || '请严格遵守交易纪律与仓位管理'}
`;
    navigator.clipboard.writeText(textContent);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const marketStatus = diagnostics?.state?.marketSession;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 antialiased font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-56' : 'w-16'} shrink-0 bg-slate-950/90 border-r border-slate-800 transition-all duration-300 flex flex-col z-50`}>
        {/* Sidebar Header / Logo */}
        <div className="h-16 shrink-0 flex items-center justify-between px-3 border-b border-slate-800">
          <div className={`flex items-center gap-2.5 overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-extrabold text-white whitespace-nowrap tracking-wide leading-8 select-none flex items-center">
              数往知来
            </h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1.5 overflow-x-hidden scrollbar-hide">
          <button
            onClick={() => setActiveTab('trading_signals')}
            className={`w-full flex items-center gap-3 px-2.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'trading_signals' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="交易信号与决策"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>交易信号</span>
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`w-full flex items-center gap-3 px-2.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'news' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="新闻中心"
          >
            <Newspaper className="w-4 h-4 shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>新闻中心</span>
          </button>

          <button
            onClick={() => setActiveTab('factor')}
            className={`w-full flex items-center gap-3 px-2.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'factor' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="因子库"
          >
            <FlaskConical className="w-4 h-4 shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>因子库</span>
          </button>

          <button
            onClick={() => setActiveTab('strategy_and_backtest')}
            className={`w-full flex items-center gap-3 px-2.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'strategy_and_backtest' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="策略库与回测赛马"
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>策略库</span>
          </button>

          <button
            onClick={() => setActiveTab('datacenter')}
            className={`w-full flex items-center gap-3 px-2.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'datacenter' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="数据中心"
          >
            <Database className="w-4 h-4 shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>数据中心</span>
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            className={`w-full flex items-center gap-3 px-2.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'llm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="LLM智能投研与配置"
          >
            <BrainCircuit className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>LLM 投研</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header for Market Status & App Title */}
        <header className="shrink-0 h-16 bg-slate-950/50 backdrop-blur-md border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center">
            <p className="text-xs text-slate-300 font-medium hidden sm:block tracking-wide">
              <span className="text-slate-400">中金所 · 上期所 · 大商所 · 郑商所 · 广期所</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="text-indigo-300 font-semibold">多维聚合 & 决策系统</span>
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs ml-auto">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              marketStatus?.isOpen 
                ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <Clock className={`w-4 h-4 ${marketStatus?.isOpen ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <div className="hidden md:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{marketStatus?.sessionName || '时段检测中...'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({marketStatus?.chinaTimeStr || '北京时间'})</span>
                </div>
                <p className="text-[10px] text-slate-400">{marketStatus?.nextSessionDesc || '暂无提醒'}</p>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="whitespace-nowrap">
                PostgreSQL: <span className="text-indigo-300 font-bold font-mono">{(diagnostics?.dbMetrics?.totalKlinesInDb ?? 0).toLocaleString()}</span> 条 K线
                <span className="text-slate-600 mx-1 font-mono">|</span>
                容量已用 <span className="text-cyan-300 font-bold font-mono">{diagnostics?.dbMetrics?.storageUsageEstimatedMb ?? 0}</span> MB
              </span>
            </div>
          </div>
        </header>

        {/* Main Canvas Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">

        {/* 1. 数据中心 (采集数据) */}
        {activeTab === 'datacenter' && (
          <DataCenterTab
            diagnostics={diagnostics}
            onSelectSymbol={(sym) => {
              setSelectedSymbol(sym);
            }}
            onNavigateToDecision={(sym) => {
              setSelectedSymbol(sym);
              fetchKlinesAndDecision(sym, selectedPeriod);
              setActiveTab('trading_signals');
              setSignalsSubTab('decision');
            }}
            onRefreshDiagnostics={fetchDiagnostics}
          />
        )}

        {/* 2. 新闻中心 (采集新闻) */}
        {activeTab === 'news' && (
          <NewsCenter 
            onSelectSymbol={(sym) => {
              setSelectedSymbol(sym);
              setActiveTab('trading_signals');
              setSignalsSubTab('decision');
            }}
          />
        )}

        {/* 3. 因子库 (因子迭代) */}
        {activeTab === 'factor' && <FactorResearch />}

        {/* 4. 策略库及策略回测赛马 */}
        {activeTab === 'strategy_and_backtest' && (
          <div className="space-y-6">
            {/* Sub-tab navigation bar */}
            <div className="flex border border-slate-800/80 p-1 bg-slate-950/80 rounded-xl max-w-md shadow-inner">
              <button
                onClick={() => setStrategySubTab('library')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  strategySubTab === 'library'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. 策略库与策略迭代
              </button>
              <button
                onClick={() => setStrategySubTab('backtest')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  strategySubTab === 'backtest'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. 策略仿真与回测赛马
              </button>
            </div>

            {strategySubTab === 'library' ? (
              <StrategyLibrary />
            ) : (
              <div className="space-y-6">
                {/* Strategy Control */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div>
                      <h2 className="text-base font-bold text-white">中国期货策略回测与赛马锦标赛</h2>
                      <p className="text-xs text-slate-400 mt-0.5">多模型竞争评级，内置期货保证金比率与滑点模拟</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => runTournamentBench(selectedSymbol)}
                        disabled={loadingTournament}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Trophy className={`w-3.5 h-3.5 text-amber-400 ${loadingTournament ? 'animate-spin' : ''}`} />
                        <span>{loadingTournament ? '赛马评比中...' : '全策略赛马'}</span>
                      </button>
                      <button
                        onClick={() => runBacktestExecution(selectedStrategyId, selectedSymbol)}
                        disabled={loadingBacktest}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                      >
                        <Play className={`w-3.5 h-3.5 fill-current ${loadingBacktest ? 'animate-spin' : ''}`} />
                        <span>{loadingBacktest ? '仿真中...' : '运行策略回测'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">选择策略模型</label>
                      <select
                        value={selectedStrategyId}
                        onChange={(e) => setSelectedStrategyId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 focus:outline-none"
                      >
                        {strategies.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">回测标的</label>
                      <select
                        value={selectedSymbol}
                        onChange={(e) => setSelectedSymbol(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-bold text-indigo-300 focus:outline-none"
                      >
                        {popularFutures.map(f => (
                          <option key={f.symbol} value={f.symbol}>{f.symbol} - {f.name} ({f.exchange})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">初始资金 (¥)</label>
                      <input
                        type="number"
                        value={initialCapital}
                        onChange={(e) => setInitialCapital(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-mono font-medium text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Performance Tiles */}
                {backtestResult && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 shadow-md">
                      <span className="text-xs font-medium text-slate-400">总收益率</span>
                      <p className={`text-2xl font-black font-mono mt-1 ${backtestResult.metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {backtestResult.metrics.totalReturn > 0 ? `+${backtestResult.metrics.totalReturn}%` : `${backtestResult.metrics.totalReturn}%`}
                      </p>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 shadow-md">
                      <span className="text-xs font-medium text-slate-400">夏普比率</span>
                      <p className="text-2xl font-black font-mono text-slate-100 mt-1">{backtestResult.metrics.sharpeRatio}</p>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 shadow-md">
                      <span className="text-xs font-medium text-slate-400">最大回撤</span>
                      <p className="text-2xl font-black font-mono text-rose-400 mt-1">{backtestResult.metrics.maxDrawdown}%</p>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 shadow-md">
                      <span className="text-xs font-medium text-slate-400">胜率</span>
                      <p className="text-2xl font-black font-mono text-blue-400 mt-1">{backtestResult.metrics.winRate}%</p>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 shadow-md">
                      <span className="text-xs font-medium text-slate-400">盈亏比 / 成交</span>
                      <p className="text-2xl font-black font-mono text-slate-100 mt-1">{backtestResult.metrics.profitFactor}</p>
                    </div>
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 shadow-md flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-slate-400">量化评级</span>
                        <p className="text-xl font-black text-slate-100 mt-0.5">{backtestResult.metrics.score} 分</p>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl text-base font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {backtestResult.metrics.grade}
                      </span>
                    </div>
                  </div>
                )}

                {/* Backtest & Tournament Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                    <h3 className="text-sm font-bold text-white mb-3">策略净值曲线对比 (Strategy Equity vs Benchmark)</h3>
                    {backtestResult?.equityCurve?.length > 0 ? (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={backtestResult.equityCurve}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#475569" />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#475569" />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                            <Line type="monotone" name="策略净值" dataKey="equity" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" name="标的基准" dataKey="benchmark" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-500 text-xs">点击“运行策略回测”生成净值曲线</div>
                    )}
                  </div>

                  {/* Tournament Leaderboard */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-3.5">
                      <h3 className="text-sm font-bold text-white">赛马榜单与配资</h3>
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md font-semibold">动态加权</span>
                    </div>
                    <div className="space-y-2.5 max-h-64 overflow-y-auto">
                      {tournamentResults.map((t) => (
                        <div 
                          key={t.strategyId} 
                          onClick={() => { setSelectedStrategyId(t.strategyId); runBacktestExecution(t.strategyId, selectedSymbol); }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                            selectedStrategyId === t.strategyId ? 'bg-indigo-600/20 border-indigo-500/60' : 'bg-slate-900/80 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                              {t.rank}
                            </span>
                            <div>
                              <p className="font-bold text-slate-200">{t.strategyId}</p>
                              <p className="text-[10px] text-slate-400">夏普 {t.sharpeRatio} | 回撤 {t.maxDrawdown}%</p>
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <span className={t.totalReturn >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {t.totalReturn > 0 ? `+${t.totalReturn}%` : `${t.totalReturn}%`}
                            </span>
                            <span className="text-[10px] text-indigo-400 block">配资 {t.capitalAllocation}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. 交易信号与多维决策 */}
        {activeTab === 'trading_signals' && (
          <div className="space-y-6">
            {/* Sub-tab navigation bar */}
            <div className="flex border border-slate-800/80 p-1 bg-slate-950/80 rounded-xl max-w-md shadow-inner">
              <button
                onClick={() => setSignalsSubTab('signals')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  signalsSubTab === 'signals'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. 交易共振评估与信号
              </button>
              <button
                onClick={() => setSignalsSubTab('decision')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  signalsSubTab === 'decision'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. 多维K线与交易决策
              </button>
            </div>

            {signalsSubTab === 'signals' ? (
              <TradingSignals 
                onSelectSymbol={(sym) => {
                  setSelectedSymbol(sym);
                  setSignalsSubTab('decision');
                }}
                onNavigateToDecision={(sym) => {
                  setSelectedSymbol(sym);
                  setSignalsSubTab('decision');
                }}
              />
            ) : (
              <KlineDecisionCenter
                selectedSymbol={selectedSymbol}
                onSymbolChange={handleSymbolChange}
                selectedPeriod={selectedPeriod}
                onPeriodChange={handlePeriodChange}
                klinesData={klinesData}
                decisionData={decisionData}
                loadingKlines={loadingKlines}
                onRefreshKlines={(sym, per) => fetchKlinesAndDecision(sym, per)}
              />
            )}
          </div>
        )}

        {/* 6. LLM 投研与端点配置 */}
        {activeTab === 'llm' && (
          <div className="space-y-6">
            {/* Sub-tab navigation bar */}
            <div className="flex border border-slate-800/80 p-1 bg-slate-950/80 rounded-xl max-w-md shadow-inner">
              <button
                onClick={() => setLlmSubTab('agent')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  llmSubTab === 'agent'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. AI 深度智能投研
              </button>
              <button
                onClick={() => setLlmSubTab('config')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  llmSubTab === 'config'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. LLM 模型端点配置
              </button>
            </div>

            {llmSubTab === 'config' ? (
              <LLMConfig />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-indigo-400" />
                      <h2 className="text-base font-bold text-white">AI 深度投研与智能研报引擎</h2>
                    </div>
                    <button
                      onClick={() => setLlmSubTab('config')}
                      className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-xl border border-indigo-500/20 transition-all cursor-pointer"
                      title="管理与测试 LLM 配置"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>管理 LLM 配置</span>
                    </button>
                  </div>

                  {/* LLM Model Selection Section */}
                  <LLMModelSelector
                    selectedProviderId={selectedProviderId}
                    selectedModel={selectedModel}
                    onProviderChange={(provId, prov) => {
                      setSelectedProviderId(provId);
                      const mod = prov.model || prov.available_models?.[0] || 'gemini-2.5-flash';
                      setSelectedModel(mod);
                    }}
                    onModelChange={(mod) => setSelectedModel(mod)}
                    mode="full"
                    label="对接 LLM 模型服务商与推理节点"
                  />

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">分析标的</label>
                    <select
                      value={selectedSymbol}
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                    >
                      {popularFutures.map(f => (
                        <option key={f.symbol} value={f.symbol}>{f.symbol} - {f.name} ({f.exchange})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">市场行情与持仓分析上下文</label>
                    <textarea 
                      value={contextData}
                      onChange={e => setContextData(e.target.value)}
                      rows={4}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button 
                    onClick={generateBriefing}
                    disabled={loadingAgent}
                    className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {loadingAgent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                    <span>
                      {loadingAgent 
                        ? `[${selectedModel}] LLM 智能推理中...` 
                        : `使用 ${selectedModel} 生成研报`
                      }
                    </span>
                  </button>
                </div>

                {/* Research Brief Output */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <h2 className="text-base font-bold text-white">AI 深度量化投研报告</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {usedProviderInfo && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5 font-mono">
                          <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                          <span><strong>{usedProviderInfo.name}</strong> ({usedProviderInfo.model})</span>
                        </span>
                      )}

                      {result && (
                        <button
                          type="button"
                          onClick={handleCopyReport}
                          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                          title="复制完整 Markdown 研报文本"
                        >
                          {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{copiedReport ? '已复制研报' : '复制研报全文'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {!result && !errorAgent && !loadingAgent && (
                    <div className="h-96 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
                      <div className="p-4 bg-indigo-950/20 rounded-2xl border border-indigo-800/20">
                        <BrainCircuit className="w-12 h-12 opacity-40 text-indigo-400" />
                      </div>
                      <p className="font-medium text-slate-400">选择推理模型与分析标的，点击左侧按钮生成多维深度量化研报</p>
                      <span className="text-[11px] text-slate-600">包含宏观供需、主力席位博弈、多周期形态、量化因子雷达与战术交易点位</span>
                    </div>
                  )}

                  {loadingAgent && (
                    <div className="animate-pulse space-y-4 py-8">
                      <div className="flex items-center justify-between">
                        <div className="h-6 bg-slate-800 rounded w-2/5"></div>
                        <div className="h-6 bg-slate-800 rounded w-1/5"></div>
                      </div>
                      <div className="h-28 bg-slate-800/60 rounded-xl w-full"></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-24 bg-slate-800/50 rounded-xl"></div>
                        <div className="h-24 bg-slate-800/50 rounded-xl"></div>
                      </div>
                      <div className="h-32 bg-slate-800/60 rounded-xl w-full"></div>
                    </div>
                  )}

                  {errorAgent && (
                    <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{errorAgent}</span>
                    </div>
                  )}

                  {result && (
                    <div className="space-y-5 max-h-[750px] overflow-y-auto pr-1">
                      {/* 研报主标题与核心指标概览 */}
                      <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950/40 rounded-xl border border-indigo-900/40 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>{result.report_title || `【${selectedSymbol}】深度量化投研报告`}</span>
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                              result.sentiment === 'Strong_Bullish' || result.sentiment === 'Bullish'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : result.sentiment === 'Strong_Bearish' || result.sentiment === 'Bearish'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {result.sentiment_label || (result.sentiment === 'Bullish' ? '看多 (Bullish)' : result.sentiment === 'Bearish' ? '看空 (Bearish)' : '震荡中性')}
                            </span>
                          </div>
                        </div>

                        {/* 置信度与核心指标栅格 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[11px] text-slate-400 block mb-0.5 flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-cyan-400" /> 量化置信度
                            </span>
                            <span className="text-sm font-mono font-bold text-cyan-300">
                              {result.confidence_score || 88}%
                            </span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[11px] text-slate-400 block mb-0.5 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-400" /> 预期盈亏比
                            </span>
                            <span className="text-sm font-mono font-bold text-emerald-300">
                              {result.tactical_plan?.risk_reward_ratio || '1 : 3.2'}
                            </span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[11px] text-slate-400 block mb-0.5 flex items-center gap-1">
                              <Target className="w-3 h-3 text-indigo-400" /> 建议仓位
                            </span>
                            <span className="text-xs font-mono font-bold text-indigo-200">
                              {result.tactical_plan?.position_size_pct || '15% - 25%'}
                            </span>
                          </div>

                          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-[11px] text-slate-400 block mb-0.5 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-amber-400" /> 策略类型
                            </span>
                            <span className="text-xs font-medium text-amber-200 truncate block">
                              {result.tactical_plan?.strategy_type || '顺势回踩低吸'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 模块一：核心执行摘要 */}
                      <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                          <Activity className="w-3.5 h-3.5 text-indigo-400" />
                          <span>一、核心执行摘要与逻辑综述 (Executive Summary)</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans">
                          {result.summary}
                        </p>
                      </div>

                      {/* 模块二：量化多因子雷达评分条 */}
                      {result.factor_radar && (
                        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              二、多因子量化雷达打分矩阵 (1-10分)
                            </span>
                            <span className="text-[11px] text-slate-500">综合模型赋权运算</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {[
                              { key: 'momentum', label: '动量因子 (Momentum)', val: result.factor_radar.momentum || 8, color: 'bg-emerald-500' },
                              { key: 'capital_flow', label: '主力资金流向 (Capital Flow)', val: result.factor_radar.capital_flow || 9, color: 'bg-cyan-500' },
                              { key: 'trend_pattern', label: '多周期形态 (Pattern Break)', val: result.factor_radar.trend_pattern || 8, color: 'bg-indigo-500' },
                              { key: 'valuation_margin', label: '估值安全边际 (Valuation)', val: result.factor_radar.valuation_margin || 7, color: 'bg-purple-500' },
                              { key: 'volatility_risk', label: '波动率风险度 (Volatility Risk)', val: result.factor_radar.volatility_risk || 4, color: 'bg-rose-500' },
                            ].map(item => (
                              <div key={item.key} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">{item.label}</span>
                                  <span className="font-mono font-bold text-white">{item.val} / 10</span>
                                </div>
                                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                  <div 
                                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(100, item.val * 10)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 模块三：宏观基本面与供需传导 */}
                      {result.macro_and_fundamental && (
                        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            <span>三、宏观流动性与产业供需基本面深入剖析</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {result.macro_and_fundamental}
                          </p>
                        </div>
                      )}

                      {/* 模块四：主力席位与资金博弈矩阵 */}
                      {result.capital_and_positioning && (
                        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                            <span>四、主力席位异动与资金博弈微观结构</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {result.capital_and_positioning}
                          </p>
                        </div>
                      )}

                      {/* 模块五：多周期形态与量化指标 */}
                      {result.multi_timeframe_technical && (
                        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <Compass className="w-3.5 h-3.5 text-amber-400" />
                            <span>五、多周期K线形态与量化动量共振</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-sans">
                            {result.multi_timeframe_technical}
                          </p>
                        </div>
                      )}

                      {/* 模块六：关键技术点位矩阵 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-rose-400" />
                            六、黄金分割与多空关键技术点位矩阵
                          </span>
                          <span className="text-[11px] text-slate-500">动态斐波那契测算</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {result.technicalLevels?.map((level: string, i: number) => {
                            const isR = level.includes('阻力') || level.includes('R');
                            const isS = level.includes('支撑') || level.includes('S');
                            const isPivot = level.includes('枢纽') || level.includes('分水岭') || level.includes('Pivot');

                            return (
                              <div 
                                key={i} 
                                className={`text-xs p-3 rounded-xl font-mono border flex flex-col justify-between ${
                                  isR ? 'bg-rose-950/30 border-rose-900/50 text-rose-200' :
                                  isS ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200' :
                                  isPivot ? 'bg-indigo-950/40 border-indigo-700/50 text-indigo-200' :
                                  'bg-slate-900/90 border-slate-800 text-slate-200'
                                }`}
                              >
                                <span className="text-[10px] text-slate-400 mb-1">
                                  {isR ? '🔴 压力位' : isS ? '🟢 支撑位' : '🟡 强弱枢纽'}
                                </span>
                                <span className="font-bold text-xs">{level}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 模块七：机构级战术交易执行计划 */}
                      {result.tactical_plan && (
                        <div className="p-4 bg-slate-900/90 rounded-xl border border-indigo-800/40 space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-indigo-400" />
                              七、机构级战术交易执行方案 (Tactical Plan)
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              严格纪律
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[11px] block mb-1">建议建仓区间 (Entry Zone)</span>
                              <span className="font-mono font-bold text-white">{result.tactical_plan.entry_zone}</span>
                            </div>

                            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[11px] block mb-1">第一止盈目标 (Take-Profit T1)</span>
                              <span className="font-mono font-bold text-emerald-400">{result.tactical_plan.take_profit_t1}</span>
                            </div>

                            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[11px] block mb-1">波段进攻目标 (Take-Profit T2)</span>
                              <span className="font-mono font-bold text-cyan-400">{result.tactical_plan.take_profit_t2}</span>
                            </div>

                            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                              <span className="text-slate-400 text-[11px] block mb-1">硬性风控止损 (Stop-Loss)</span>
                              <span className="font-mono font-bold text-rose-400">{result.tactical_plan.stop_loss}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 模块八：风险预警与尾部对冲防线 */}
                      {result.risk_warnings && result.risk_warnings.length > 0 && (
                        <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                            <ShieldAlert className="w-4 h-4 text-amber-400" />
                            <span>八、黑天鹅尾部风险与对冲策略提示</span>
                          </div>
                          <ul className="space-y-1 text-xs text-amber-200/90 list-disc list-inside">
                            {result.risk_warnings.map((w: string, idx: number) => (
                              <li key={idx} className="leading-relaxed">{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

export default App;
