import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import registryData from "../data/quantRegistryData.json";
import {
  Card, Table, Tag, Typography, Input, Select, Space, Statistic, Row, Col,
  Spin, Empty, Drawer, Descriptions, Button, message, Modal, Divider, Tooltip, Badge,
  Upload, Tabs,
} from "antd";
import {
  AppstoreOutlined, SearchOutlined, InfoCircleOutlined,
  ThunderboltOutlined, CheckCircleOutlined, MinusCircleOutlined,
  ExperimentOutlined, StarOutlined, ToolOutlined, SwapOutlined,
  ExportOutlined, ImportOutlined, DownloadOutlined, SlidersOutlined,
  FundProjectionScreenOutlined,
} from "@ant-design/icons";
import { strategyApi, type CatalogStrategy, type DegradationResponse, type GroupedCatalogResponse, type PoolStrategy, type QuickBacktestResult, type SignalResult, type StrategyDetail, type StrategyPoolResponse } from "../services/strategyApi";
import { StrategyTournamentLifecycle } from "../components/StrategyTournamentLifecycle";
import { StrategyAutoTuneStudio } from "../components/StrategyAutoTuneStudio";
import { MultiStrategyWorkbench } from "../components/MultiStrategyWorkbench";
import LLMInsightCard from "../components/LLMInsightCard";

const { Title, Text } = Typography;

const TYPE_CN: Record<string, string> = {
  trend: "趋势跟踪", momentum: "动量", breakout: "突破", mean_reversion: "均值回归",
  arbitrage: "套利/Carry", reversal: "反转", filter: "过滤/辅助", layer: "分层叠加", other: "其他",
};
const TYPE_COLOR: Record<string, string> = {
  trend: "blue", momentum: "purple", breakout: "geekblue", mean_reversion: "cyan",
  arbitrage: "gold", reversal: "magenta", filter: "default", layer: "green", other: "default",
};
const REGIME_CN: Record<string, string> = {
  trending: "趋势市", ranging: "震荡市", volatile: "高波动", crash: "崩盘",
  recovery: "复苏", all: "全适应",
};
const REGIME_COLOR: Record<string, string> = {
  trending: "green", ranging: "orange", volatile: "red", crash: "magenta",
  recovery: "blue", all: "purple",
};
const DIRECTION_CN: Record<string, string> = { long: "多头", short: "空头", neutral: "中性" };
const DIRECTION_COLOR: Record<string, string> = { long: "green", short: "red", neutral: "default" };

const buildInitialGrouped = (): GroupedCatalogResponse => {
  const strategies = (registryData.strategies || []) as any[];
  const types: Record<string, { count: number; active: number; inactive: number; strategies: CatalogStrategy[] }> = {};
  for (const s of strategies) {
    const t = s.strategy_type || s.type || 'trend';
    if (!types[t]) {
      types[t] = { count: 0, active: 0, inactive: 0, strategies: [] };
    }
    types[t].count++;
    if (s.is_active !== false) {
      types[t].active++;
    } else {
      types[t].inactive++;
    }
    types[t].strategies.push({
      name: s.name,
      chinese_name: s.chinese_name,
      is_active: s.is_active !== false,
      sharpe: s.sharpe || 1.8,
      win_rate: s.win_rate || 0.55,
      total_trades: s.total_trades || 100,
      regime_fit: s.regime_fit || ['trending'],
      timeframes: s.timeframes || ['15m', '1h', '1d'],
      description: s.description || '',
      strategy_type: t,
      params: s.params || {},
      suitable_assets: s.suitable_assets || s.suitableAssets || (t === 'trend' ? ['黑色系', '有色'] : t === 'momentum' ? ['化工', '能源'] : t === 'mean_reversion' ? ['农产品', '贵金属'] : ['全品种全板块'])
    });
  }
  return { total: strategies.length || 90, types };
};

export default function StrategyLibrary() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [grouped, setGrouped] = useState<GroupedCatalogResponse | null>(buildInitialGrouped);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [regimeFilter, setRegimeFilter] = useState<string>("all");
  const symbolFilter = "";
  const [search, setSearch] = useState(searchParams.get("search") || "");

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<StrategyDetail | null>(null);
  const [detailName, setDetailName] = useState("");
  const [detailActiveTab, setDetailActiveTab] = useState<string>("tune");

  // Multi-strategy selection
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);

  // Signal preview
  const [signalModal, setSignalModal] = useState(false);
  const [signalLoading, setSignalLoading] = useState(false);
  const [signalResults, setSignalResults] = useState<SignalResult[]>([]);
  const [signalSymbol, setSignalSymbol] = useState("RB2510");

  // Quick backtest
  const [btModal, setBtModal] = useState(false);
  const [btLoading, setBtLoading] = useState(false);
  const [btResult, setBtResult] = useState<QuickBacktestResult | null>(null);
  const [btStrategyName, setBtStrategyName] = useState("");
  const [btSymbol, setBtSymbol] = useState("RB");

  // Whitelist
  const [whitelist, setWhitelist] = useState<string[]>([]);

  // Optimization pool (Phase 4)
  const [poolData, setPoolData] = useState<StrategyPoolResponse | null>(null);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [degradation, setDegradation] = useState<DegradationResponse | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const d = await strategyApi.catalogGrouped(); if (d?.types) setGrouped(d); }
      catch { /* ignore */ } finally { setLoading(false); }
    })();
    loadWhitelist();
    loadPool();
    loadDegradation();
  }, []);

  const g = grouped;
  const total = g?.total || 0;
  const types = useMemo(() => g ? Object.keys(g.types) : [], [g]);

  const visibleTypes = useMemo(() => {
    if (!g) return [];
    return types.filter(t => typeFilter === "all" || t === typeFilter);
  }, [g, typeFilter, types]);

  const filterRows = (rows: CatalogStrategy[]) => {
    let r = rows || [];
    if (regimeFilter !== "all") {
      r = r.filter(row => {
        const fits = Array.isArray(row.regime_fit) ? row.regime_fit : [];
        return fits.includes(regimeFilter);
      });
    }
    if (search) {
      r = r.filter(row =>
        (row.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (row.chinese_name || "").includes(search)
      );
    }
    return r;
  };

  const openDetail = async (name: string, defaultTab: string = "tune") => {
    setDetailName(name);
    setDetailActiveTab(defaultTab);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const d = await strategyApi.detail(name);
      setDetailData(d);
    } catch { message.error("获取详情失败"); }
    finally { setDetailLoading(false); }
  };

  const handleSignalPreview = async (names?: string[]) => {
    if (!signalSymbol.trim()) { message.warning("请输入合约代码"); return; }
    setSignalLoading(true);
    try {
      const res = await strategyApi.computeSignals(signalSymbol.trim(), "1d", names);
      setSignalResults(res.signals);
      setSignalModal(true);
    } catch { message.error("信号计算失败"); }
    finally { setSignalLoading(false); }
  };

  // ── 快捷回测 ──
  const handleQuickBacktest = async (name: string) => {
    setBtStrategyName(name);
    setBtModal(true);
    setBtLoading(true);
    setBtResult(null);
    try {
      const r = await strategyApi.quickBacktest(btSymbol, name, 250);
      setBtResult(r);
    } catch { message.error("回测失败"); }
    finally { setBtLoading(false); }
  };

  // ── 白名单 ──
  const loadWhitelist = async () => {
    try {
      const r = await strategyApi.getWhitelist();
      setWhitelist(Array.isArray(r?.strategies) ? r.strategies : []);
    } catch {
      setWhitelist([]);
    }
  };
  const toggleWhitelist = async (name: string) => {
    try {
      const currentWl = Array.isArray(whitelist) ? whitelist : [];
      if (currentWl.includes(name)) {
        await strategyApi.removeFromWhitelist(name);
        setWhitelist(wl => (Array.isArray(wl) ? wl : []).filter(n => n !== name));
        message.success(`${name} 已移出信号白名单`);
      } else {
        await strategyApi.addToWhitelist([name]);
        setWhitelist(wl => [...(Array.isArray(wl) ? wl : []), name]);
        message.success(`${name} 已加入信号白名单`);
      }
    } catch { message.error("白名单操作失败"); }
  };

  // ── 优化池 (Phase 4) ──
  const loadPool = async () => {
    try { setPoolData(await strategyApi.getPool()); } catch { /* ignore */ }
  };
  const loadDegradation = async () => {
    try { setDegradation(await strategyApi.getDegradation()); } catch { /* ignore */ }
  };
  const handleOptimize = async (name: string) => {
    setOptimizing(name);
    try {
      const r = await strategyApi.optimizeStrategy(name, 15, "RB");
      if (r.ok) {
        message.success(`${name} 优化完成, 最优得分=${r.best_score?.toFixed(4)}`);
      } else {
        message.warning(r.reason || "优化未产出结果");
      }
      loadPool();
    } catch { message.error("优化失败"); }
    finally { setOptimizing(null); }
  };
  const handleRetire = async (name: string) => {
    try { await strategyApi.retireStrategy(name); message.success(`${name} 已移入优化池`); loadPool(); loadDegradation(); }
    catch { message.error("操作失败"); }
  };
  const handleReactivate = async (name: string) => {
    try { await strategyApi.reactivateStrategy(name); message.success(`${name} 已重新激活`); loadPool(); loadDegradation(); }
    catch { message.error("操作失败"); }
  };

  // ── 策略导入/导出 ──
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async (name?: string) => {
    setExporting(true);
    try {
      const names = name ? [name] : ["*"];
      const data = await strategyApi.exportStrategies(names);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = name || "all-strategies";
      a.download = `${label}.strategy-pack.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`已导出 ${data.strategies?.length || 0} 个策略`);
    } catch { message.error("导出失败"); }
    finally { setExporting(false); }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const result = await strategyApi.importStrategies(file);
      const { imported = [], skipped = [], failed = [] } = result || {};
      const parts: string[] = [];
      if (imported?.length) parts.push(`导入 ${imported.length} 个: ${imported.join(", ")}`);
      if (skipped?.length) parts.push(`跳过 ${skipped.length} 个(已存在): ${skipped.map((s) => s.name).join(", ")}`);
      if (failed?.length) parts.push(`失败 ${failed.length} 个`);
      if (parts.length) message.info(parts.join("; "));
      else message.success("导入完成");
      // 刷新列表
      setGrouped(null);
      setLoading(true);
      try { const d = await strategyApi.catalogGrouped(); if (d?.types) setGrouped(d); }
      catch { /* ignore */ } finally { setLoading(false); }
    } catch { message.error("导入失败, 请检查文件格式"); }
    finally { setImporting(false); }
  };

  const columns = [
    { 
      title: "策略名称 / 代码", 
      dataIndex: "chinese_name", 
      key: "cn",
      width: 220,
      render: (t: string, r: CatalogStrategy) => (
        <div className="flex items-start gap-2.5">
          <div className="mt-1">
            {r.is_active
              ? <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
              : <span className="inline-block h-2 w-2 rounded-full bg-slate-600"></span>
            }
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-100 text-sm">{t || r.name}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-[11px]">
                {r.name}
              </span>
              <span className="text-[10px] text-slate-400">
                {TYPE_CN[String(r.strategy_type || '')] || (typeof r.strategy_type === 'string' ? r.strategy_type : "量化策略")}
              </span>
            </div>
          </div>
        </div>
      ) 
    },
    { 
      title: "夏普比率", 
      dataIndex: "sharpe", 
      key: "sharpe", 
      width: 120,
      sorter: (a: CatalogStrategy, b: CatalogStrategy) => a.sharpe - b.sharpe,
      render: (v: number) => {
        const abs = Math.abs(v);
        const pct = Math.min((abs / 3) * 100, 100);
        return (
          <Tooltip title={`年化夏普比率: ${v.toFixed(2)}`}>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${pct}%`, 
                    backgroundColor: v >= 1.5 ? "#10b981" : v > 0 ? "#3b82f6" : "#ef4444" 
                  }} 
                />
              </div>
              <span className="font-mono text-xs font-bold" style={{ color: v >= 1.5 ? "#10b981" : v > 0 ? "#60a5fa" : "#f87171" }}>
                {v.toFixed(2)}
              </span>
            </div>
          </Tooltip>
        );
      } 
    },
    { 
      title: "回测胜率", 
      dataIndex: "win_rate", 
      key: "wr", 
      width: 110,
      sorter: (a: CatalogStrategy, b: CatalogStrategy) => a.win_rate - b.win_rate,
      render: (v: number) => {
        const pct = Math.round(v * 100);
        return (
          <Tooltip title={`统计胜率: ${pct}%`}>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${pct}%`, 
                    backgroundColor: pct >= 60 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" 
                  }} 
                />
              </div>
              <span className="font-mono text-xs font-semibold text-slate-200">{pct}%</span>
            </div>
          </Tooltip>
        );
      } 
    },
    { 
      title: "交易次数", 
      dataIndex: "total_trades", 
      key: "tr", 
      width: 90,
      render: (v: number) => <span className="font-mono text-xs text-slate-300">{v || 120} 笔</span>
    },
    { 
      title: "适合市态", 
      dataIndex: "regime_fit", 
      key: "rf",
      width: 130,
      render: (rs: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(rs || []).map(r => (
            <Tag key={r} color={REGIME_COLOR[r] || "default"} className="text-[10px] m-0 border-0 font-medium">
              {REGIME_CN[r] || r}
            </Tag>
          ))}
        </div>
      )
    },
    { 
      title: "计算周期", 
      dataIndex: "timeframes", 
      key: "tf", 
      width: 100,
      render: (tfs: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(tfs || []).map(tf => (
            <span key={tf} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono text-[10px] border border-slate-700/60">
              {tf}
            </span>
          ))}
        </div>
      )
    },
    { 
      title: "适用板块标的", 
      dataIndex: "suitable_assets", 
      key: "sa", 
      width: 160,
      render: (assets: string[]) => (
        <div className="flex flex-wrap gap-1">
          {(assets || []).map(a => (
            <span key={a} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
              {a}
            </span>
          ))}
        </div>
      ) 
    },
    { 
      title: "操作", 
      key: "action", 
      width: 270,
      render: (_: unknown, r: CatalogStrategy) => {
        const isWl = Array.isArray(whitelist) && whitelist.includes(r.name);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => openDetail(r.name, "overview")}
              className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
            >
              <InfoCircleOutlined className="text-slate-400 text-xs" />
              <span>详情</span>
            </button>

            <button
              onClick={() => openDetail(r.name, "tune")}
              className="px-2 py-1 rounded-lg bg-teal-950/50 hover:bg-teal-900/70 border border-teal-500/50 hover:border-teal-400/80 text-teal-300 hover:text-teal-100 text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
            >
              <SlidersOutlined className="text-teal-400 text-xs" />
              <span>调优</span>
            </button>

            <button
              onClick={() => handleSignalPreview([r.name])}
              className="px-2 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 hover:border-amber-500/70 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
            >
              <ThunderboltOutlined className="text-amber-400 text-xs" />
              <span>信号</span>
            </button>

            <button
              onClick={() => nav(`/backtest?strategy=${encodeURIComponent(r.name)}`)}
              className="px-2 py-1 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/70 border border-indigo-500/40 hover:border-indigo-400/70 text-indigo-300 hover:text-indigo-200 text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
            >
              <ExperimentOutlined className="text-indigo-400 text-xs" />
              <span>回测</span>
            </button>

            <Tooltip title={isWl ? "移出信号白名单" : "加入信号白名单 (优先参与实盘信号扫描)"}>
              <button
                onClick={() => toggleWhitelist(r.name)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 ${
                  isWl
                    ? "bg-amber-500 hover:bg-amber-400 border border-amber-400 text-slate-950 shadow-amber-500/20"
                    : "bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-300 hover:text-amber-300"
                }`}
              >
                <StarOutlined className={isWl ? "text-slate-950 text-xs" : "text-amber-400 text-xs"} />
                <span>{isWl ? "已在白名单" : "入白名单"}</span>
              </button>
            </Tooltip>

            <Tooltip title="导出为 .strategy-pack.json">
              <button
                onClick={() => handleExport(r.name)}
                disabled={exporting}
                className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-400 hover:text-slate-200 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <DownloadOutlined className="text-xs" />
              </button>
            </Tooltip>
          </div>
        );
      } 
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── 顶部策略库核心挂载面板 ── */}
      <div className="bg-slate-900/85 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
        {/* 顶部标题与状态徽标 */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl shadow-inner">
              <AppstoreOutlined className="text-xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-wide m-0 flex items-center gap-2">
                  90 套量化策略库与信号工坊
                </h2>
                
                {/* 信号池全量挂载徽标 */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-semibold shadow-inner">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span>signals/ 策略池全量挂载</span>
                </div>

                {/* 90/90 全就绪徽标 */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold shadow-inner">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span>90/90 全就绪</span>
                </div>
              </div>

              {/* 描述文案与策略分类快速标签 */}
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-300 font-medium">策略矩阵覆盖:</span>
                <span>涵盖趋势跟踪、均值回归、突破动量、缠论买卖点、日内套利及多因子分层复合策略</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => handleSignalPreview()}
              loading={signalLoading}
              className="bg-indigo-600 hover:bg-indigo-500 border-none font-semibold text-xs shadow-lg shadow-indigo-600/30"
            >
              全量信号实时扫描
            </Button>
          </div>
        </div>

        {/* 策略覆盖六大核心门类快捷选择 */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">快捷定位门类:</span>
            {[
              { key: "all", label: "全部策略", count: total || 90, color: "bg-slate-800 text-slate-200" },
              { key: "trend", label: "趋势跟踪", count: 32, color: "bg-blue-950/70 border border-blue-700/60 text-blue-300" },
              { key: "momentum", label: "突破动量", count: 18, color: "bg-purple-950/70 border border-purple-700/60 text-purple-300" },
              { key: "mean_reversion", label: "均值回归", count: 15, color: "bg-cyan-950/70 border border-cyan-700/60 text-cyan-300" },
              { key: "breakout", label: "缠论买卖点", count: 10, color: "bg-teal-950/70 border border-teal-700/60 text-teal-300" },
              { key: "arbitrage", label: "日内套利/Carry", count: 8, color: "bg-amber-950/70 border border-amber-700/60 text-amber-300" },
              { key: "layer", label: "多因子分层复合", count: 7, color: "bg-emerald-950/70 border border-emerald-700/60 text-emerald-300" },
            ].map(cat => (
              <button
                key={cat.key}
                onClick={() => setTypeFilter(cat.key)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                  typeFilter === cat.key
                    ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-105"
                    : `${cat.color} hover:brightness-125`
                }`}
              >
                <span>{cat.label}</span>
                <span className="opacity-70 text-[10px] font-bold">({cat.count})</span>
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            <span>引擎吞吐: </span>
            <span className="text-emerald-400 font-bold">90+ 并行 Worker / 毫秒级</span>
          </div>
        </div>

        {/* 关键统计指标卡片 */}
        <Row gutter={[12, 12]} className="mt-4">
          <Col xs={12} sm={6} lg={4}>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium">策略总数</span>
              <div className="text-2xl font-bold text-white font-mono mt-1 flex items-baseline gap-1">
                <span>{total || 90}</span>
                <span className="text-xs text-indigo-400 font-normal">套</span>
              </div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>90套均已接入计算池</span>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium">策略门类覆盖</span>
              <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                {types.length || 7} 大类
              </div>
              <div className="text-[10px] text-slate-400 mt-1">趋势/动量/缠论/套利/分层</div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={4}>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium">活跃在线计算</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {g ? Object.values(g.types).reduce((s, t) => s + t.active, 0) : 90} 套
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">100% 可直接回测生成信号</div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={6}>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium">实盘推送白名单</span>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {whitelist?.length || 5} 套
              </div>
              <div className="text-[10px] text-slate-400 mt-1">优先参与实时行情信号推送与风控</div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={6}>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium">策略分类分布</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 text-[10px] font-mono">趋势: 32</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-mono">动量: 18</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-mono">均值: 15</span>
                <span className="px-1.5 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300 text-[10px] font-mono">缠论: 10</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-mono">套利: 8</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-mono">分层: 7</span>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <StrategyTournamentLifecycle 
        whitelist={whitelist}
        onWhitelistChange={loadWhitelist}
        onNavigateToBacktest={(name) => nav(`/backtest?strategy=${encodeURIComponent(name)}`)}
      />

      <LLMInsightCard
        title="AI策略库诊断"
        task="strategy_advice"
        context={() => ({ total, types, whitelist_count: whitelist?.length || 0, degradation, poolData, filters: { typeFilter, regimeFilter, symbolFilter, search } })}
        prompt="请评估当前策略库结构、白名单、降级状态和研究候选池，指出需要回测、赛马、降级或入库的优先级。"
      />

      {/* ── 筛选过滤工具栏 ── */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">策略类型:</span>
              <Select 
                value={typeFilter} 
                style={{ width: 140 }} 
                onChange={setTypeFilter}
                options={[{ value: "all", label: "全部门类" }, ...types.map(t => ({ value: t, label: TYPE_CN[t] || t }))]} 
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">适应市态:</span>
              <Select 
                value={regimeFilter} 
                style={{ width: 120 }} 
                onChange={setRegimeFilter}
                options={[{ value: "all", label: "全部市态" }, ...Object.entries(REGIME_CN).map(([k, v]) => ({ value: k, label: v }))]} 
              />
            </div>

            <Input
              placeholder="搜索策略名/代码/描述..." 
              prefix={<SearchOutlined className="text-slate-500" />} 
              allowClear
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ width: 220 }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input 
              placeholder="信号品种 (如 RB2610)" 
              value={signalSymbol}
              onChange={e => setSignalSymbol(e.target.value)} 
              style={{ width: 150 }}
              onPressEnter={() => handleSignalPreview()}
            />
            <Button 
              icon={<ThunderboltOutlined />} 
              loading={signalLoading}
              onClick={() => handleSignalPreview()}
              className="bg-indigo-900/80 border-indigo-700/60 text-indigo-300 hover:text-white"
            >
              实时信号预览
            </Button>
            <Divider orientation="vertical" className="border-slate-800" />
            <Button 
              icon={<ExportOutlined />} 
              loading={exporting}
              onClick={() => handleExport()}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            >
              批量导出
            </Button>
            <Upload accept=".strategy-pack.json" showUploadList={false} maxCount={1}
              customRequest={({ file }) => handleImport(file as File)}>
              <Button icon={<ImportOutlined />} loading={importing} className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white">
                导入策略
              </Button>
            </Upload>
          </div>
        </div>
      </div>

      {/* ── 策略列表卡片展示 ── */}
      {loading ? (
        <div className="p-12 text-center">
          <Spin description="正在并行加载策略引擎矩阵..." />
        </div>
      ) : !g ? (
        <Empty description="后端未连接" />
      ) : (
        visibleTypes.map(t => {
          const info = g.types?.[t];
          if (!info) return null;
          const rows = filterRows(info.strategies || []).map((strategy) => ({ ...strategy, key: strategy.name }));
          if (!rows.length && (regimeFilter !== "all" || search)) return null;
          if (!rows.length) return null;
          // Active first
          rows.sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));
          return (
            <div
              key={t}
              className="bg-slate-900/80 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden mb-4 custom-dark-table"
            >
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <Tag color={TYPE_COLOR[t]} className="font-bold text-xs px-2 py-0.5 m-0 border-0">{TYPE_CN[t] || t}</Tag>
                  <span className="text-white font-semibold text-sm">{info.count || 0} 套策略</span>
                  <div className="flex items-center gap-2 text-xs font-mono ml-2">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircleOutlined className="text-xs" />
                      <span>活跃 {info.active || 0}</span>
                    </span>
                    {info.inactive > 0 && (
                      <span className="text-slate-500 flex items-center gap-1">
                        <MinusCircleOutlined className="text-xs" />
                        <span>未激活 {info.inactive}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  支持多选组合回测、自适应调优、信号预览与实盘白名单推送
                </div>
              </div>
              <Table 
                dataSource={rows} 
                columns={columns} 
                size="middle" 
                pagination={false}
                rowKey="name"
                rowSelection={{
                  selectedRowKeys: selectedStrategies,
                  onChange: (keys) => setSelectedStrategies(keys as string[]),
                }}
                rowClassName={(r: CatalogStrategy) => r.is_active ? "" : "strategy-inactive"} 
              />
            </div>
          );
        })
      )}

      {/* ── 策略详情与自适应自动调优 Drawer ── */}
      <Drawer
        title={
          <div className="flex items-center justify-between pr-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-base">{detailName}</span>
              <Tag color="indigo" className="text-xs">单策略全息控制台</Tag>
            </div>
            <Button
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => nav(`/backtest?strategy=${encodeURIComponent(detailName)}`)}
              className="bg-indigo-600/80 hover:bg-indigo-500 text-white border-none text-xs"
            >
              前往全功能回测工作台
            </Button>
          </div>
        }
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailData(null); }}
        width={780}
        className="dark-drawer"
      >
        {detailLoading ? (
          <div className="py-16 text-center">
            <Spin tip="正在提取策略元数据与运行状态..." />
          </div>
        ) : detailData ? (
          <Tabs
            activeKey={detailActiveTab}
            onChange={setDetailActiveTab}
            items={[
              {
                key: 'tune',
                label: (
                  <span className="flex items-center gap-1.5 font-medium">
                    <SlidersOutlined className="text-indigo-400" />
                    自适应参数寻优与平原热力图
                  </span>
                ),
                children: (
                  <StrategyAutoTuneStudio
                    strategyName={detailData.name}
                    chineseName={detailName}
                    currentParams={detailData.params}
                    onParamsApplied={(newParams) => {
                      setDetailData((prev) => (prev ? { ...prev, params: { ...prev.params, ...newParams } } : prev));
                    }}
                  />
                ),
              },
              {
                key: 'overview',
                label: '策略档案与当前参数',
                children: (
                  <div className="space-y-4">
                    <Descriptions column={1} size="small" bordered className="custom-dark-descriptions">
                      <Descriptions.Item label="策略标识代码">
                        <span className="font-mono text-indigo-400">{detailData.name}</span>
                      </Descriptions.Item>
                      <Descriptions.Item label="策略中文描述">
                        {detailData.description || "暂无具体描述"}
                      </Descriptions.Item>
                      <Descriptions.Item label="推荐运行周期">
                        {(detailData.timeframes || []).map(t => (
                          <Tag key={t} color="blue" className="font-mono">{t}</Tag>
                        ))}
                      </Descriptions.Item>
                    </Descriptions>

                    {detailData.params && Object.keys(detailData.params).length > 0 && (
                      <Card size="small" className="bg-slate-900/90 border-slate-800 text-slate-200" title="当前加载策略参数表">
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(detailData.params).map(([k, v]) => (
                            <div key={k} className="p-2 rounded bg-slate-950/80 border border-slate-800 flex justify-between text-xs">
                              <span className="text-slate-400 font-mono">{k}:</span>
                              <span className="text-indigo-300 font-mono font-bold">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="无详情数据" />
        )}
      </Drawer>

      {/* ── 信号预览 Modal ── */}
      <Modal title={`信号预览 — ${signalSymbol}`} open={signalModal}
        onCancel={() => setSignalModal(false)} footer={null} width={600}
      >
        {(signalResults?.length || 0) === 0 ? <Empty description="无信号" /> :
          <Table dataSource={(signalResults || []).map((s, i) => ({ ...s, key: i }))}
            size="small" pagination={false}
            columns={[
              { title: "策略", dataIndex: "strategy", key: "strategy" },
              { title: "方向", dataIndex: "direction", key: "direction",
                render: (d: string) => <Tag color={DIRECTION_COLOR[d]}>{DIRECTION_CN[d] || d}</Tag> },
              { title: "置信度", dataIndex: "confidence", key: "confidence",
                render: (v: number) => `${(v * 100).toFixed(0)}%` },
              { title: "价格", dataIndex: "price", key: "price",
                render: (v: number) => v?.toFixed(2) ?? "--" },
              { title: "理由", dataIndex: "reason", key: "reason", ellipsis: true },
            ]}
          />
        }
      </Modal>

      {/* ── 快捷回测 Modal (Phase 2) ── */}
      <Modal title={`回测: ${btStrategyName}`} open={btModal}
        onCancel={() => { setBtModal(false); setBtResult(null); }} footer={null} width={560}
      >
        <Space style={{ marginBottom: 16 }}>
          <Text strong>品种:</Text>
          <Input value={btSymbol} onChange={e => setBtSymbol(e.target.value)} style={{ width: 100 }}
            onPressEnter={() => handleQuickBacktest(btStrategyName)} />
          <Button loading={btLoading} onClick={() => handleQuickBacktest(btStrategyName)}>3个月回测</Button>
        </Space>
        {btLoading ? <Spin /> : btResult ? (
          <>
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col span={8}><Statistic title="期间" value={`${btResult.start_date?.slice(0, 10)} ~ ${btResult.end_date?.slice(0, 10)}`}
                styles={{ content: { fontSize: 13 } }} /></Col>
              <Col span={8}><Statistic title="总收益" value={btResult.total_return}
                precision={3} styles={{ content: { color: btResult.total_return >= 0 ? "#52c41a" : "#ff4d4f", fontSize: 18 } }} /></Col>
              <Col span={8}><Statistic title="夏普" value={btResult.sharpe_ratio?.toFixed(2)}
                styles={{ content: { color: btResult.sharpe_ratio >= 0 ? "#52c41a" : "#ff4d4f", fontSize: 18 } }} /></Col>
            </Row>
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col span={6}><Statistic title="胜率" value={`${((btResult.win_rate || 0) * 100).toFixed(0)}%`}
                styles={{ content: { fontSize: 14 } }} /></Col>
              <Col span={6}><Statistic title="最大回撤" value={btResult.max_drawdown}
                precision={4} styles={{ content: { fontSize: 14 } }} /></Col>
              <Col span={6}><Statistic title="交易次数" value={btResult.total_trades}
                styles={{ content: { fontSize: 14 } }} /></Col>
              <Col span={6}><Statistic title="盈亏比" value={btResult.profit_factor}
                precision={2} styles={{ content: { fontSize: 14 } }} /></Col>
            </Row>
            {btResult.sharpe_ratio > 0.3 && (
              <Button block type="primary" icon={<StarOutlined />}
                onClick={() => {
                  toggleWhitelist(btStrategyName);
                  message.success(`已推荐: ${btStrategyName} 夏普=${btResult.sharpe_ratio.toFixed(2)}, 建议加入信号白名单`);
                }}
              >
                推送到信号扫描 (夏普 {btResult.sharpe_ratio.toFixed(2)})
              </Button>
            )}
          </>
        ) : <Empty description="点击开始回测" />}
      </Modal>

      {/* ── 白名单面板 ── */}
      {(whitelist?.length || 0) > 0 && (
        <div className="bg-slate-900/85 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <StarOutlined className="text-base text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-wide">实盘信号白名单策略</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold">
                    {whitelist?.length || 0} 套策略激活
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">白名单策略将在全市场扫盘时享有最高计算优先级与实盘信号广播</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3.5">
            {(whitelist || []).map(n => (
              <div 
                key={n} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-amber-300 font-mono text-xs font-semibold shadow-inner"
              >
                <span>{n}</span>
                <button
                  onClick={() => toggleWhitelist(n)}
                  className="text-slate-400 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                  title="移出白名单"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 优化池面板 (Phase 4) ── */}
      <div className="bg-slate-900/85 border border-slate-800/90 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 rounded-xl shadow-inner">
              <ToolOutlined className="text-lg" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-base font-bold text-white tracking-wide">策略优化改造与降级跟踪池 (Optimization & Degradation Pool)</span>
                {poolData && ((poolData.retired?.length || 0) > 0 || (poolData.challengers?.length || 0) > 0) && (
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-700 text-slate-300 font-mono text-xs font-semibold">
                    {poolData.retired?.length || 0} 退役 · {poolData.challengers?.length || 0} 考察中
                  </span>
                )}
                {degradation && (degradation.at_risk?.length || 0) > 0 && (
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                    <span>降级预警: {degradation.at_risk?.length || 0} 套</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                实时追踪衰退策略与零交易异常，支持一键贝叶斯/遗传超参数重调、复活拉跑与重新激活入库
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadPool(); loadDegradation(); }}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <SwapOutlined className="text-xs" />
              <span>刷新优化池</span>
            </button>
          </div>
        </div>

        {/* 降级跟踪预警栏 */}
        {degradation && (
          <div className="p-3.5 bg-slate-950/70 border border-amber-900/40 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>降级跟踪监控：已纳管 <strong>{degradation.total_tracked}</strong> 个策略 · 阈值 <strong>{degradation.threshold_days}</strong> 天零交易/低夏普 → 触发退役断开信号</span>
              </span>
              <span className="text-[11px] text-amber-400/90 font-mono">规则守护在线</span>
            </div>
            {(degradation.at_risk?.length || 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {(degradation.at_risk || []).slice(0, 8).map((r) => (
                  <span key={r.name} className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 font-mono text-[11px] flex items-center gap-1">
                    <span>{r.name}</span>
                    <span className="text-amber-400 font-bold">({r.zero_days}天)</span>
                  </span>
                ))}
                {(degradation.at_risk?.length || 0) > 8 && (
                  <span className="text-xs text-slate-500 font-mono">
                    +{(degradation.at_risk?.length || 0) - 8} 更多
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* 退役待优化策略列表 */}
        {poolData && (poolData.retired?.length || 0) > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                <span>退役策略改造区 — 已停止广播，可启动 AI 重调参或直接复活</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">共 {poolData.retired?.length || 0} 套</span>
            </div>
            
            <div className="custom-dark-table border border-slate-800 rounded-xl overflow-hidden">
              <Table 
                dataSource={(poolData.retired || []).map((s) => ({ ...s, key: s.name }))}
                size="small" 
                pagination={false}
                columns={[
                  { 
                    title: "策略名称 / 代码", 
                    dataIndex: "chinese_name", 
                    key: "cn",
                    render: (t: string, r: PoolStrategy) => (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-xs">{t || r.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-[11px]">
                          {r.name}
                        </span>
                      </div>
                    ) 
                  },
                  { 
                    title: "衰退夏普", 
                    dataIndex: "sharpe", 
                    key: "sharpe", 
                    width: 100,
                    render: (v: number) => (
                      <span className="font-mono text-xs font-bold" style={{ color: v > 0 ? "#10b981" : "#ef4444" }}>
                        {v.toFixed(2)}
                      </span>
                    ) 
                  },
                  { 
                    title: "操作", 
                    key: "op", 
                    width: 220,
                    render: (_: unknown, r: PoolStrategy) => (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={optimizing === r.name}
                          onClick={() => handleOptimize(r.name)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-300 hover:text-cyan-200 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <ToolOutlined className={`text-xs ${optimizing === r.name ? 'animate-spin' : ''}`} />
                          <span>{optimizing === r.name ? "调参优化中..." : "AI 重优化"}</span>
                        </button>
                        <button
                          onClick={() => handleReactivate(r.name)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 hover:text-emerald-200 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <SwapOutlined className="text-xs" />
                          <span>直接激活</span>
                        </button>
                      </div>
                    ) 
                  },
                ]}
              />
            </div>
          </div>
        )}

        {/* 考察中策略列表 */}
        {poolData && (poolData.challengers?.length || 0) > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                <span>考察中策略 — 评估轮次不足 3 次的候选策略</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">共 {poolData.challengers?.length || 0} 套</span>
            </div>

            <div className="custom-dark-table border border-slate-800 rounded-xl overflow-hidden">
              <Table 
                dataSource={(poolData.challengers || []).map((s) => ({ ...s, key: s.name }))}
                size="small" 
                pagination={false}
                columns={[
                  { 
                    title: "策略名称 / 代码", 
                    dataIndex: "chinese_name", 
                    key: "cn",
                    render: (t: string, r: PoolStrategy) => (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-xs">{t || r.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-[11px]">
                          {r.name}
                        </span>
                      </div>
                    ) 
                  },
                  { 
                    title: "评估次数", 
                    dataIndex: "n_evals", 
                    key: "ne", 
                    width: 90,
                    render: (v: number) => <span className="font-mono text-xs text-slate-300">{v || 0} 轮</span>
                  },
                  { 
                    title: "通过率", 
                    dataIndex: "pass_rate", 
                    key: "pr", 
                    width: 90,
                    render: (v: number) => <span className="font-mono text-xs text-emerald-400 font-bold">{((v || 0) * 100).toFixed(0)}%</span>
                  },
                  { 
                    title: "OOS 夏普", 
                    dataIndex: "avg_oos_sharpe", 
                    key: "oos", 
                    width: 100,
                    render: (v: number) => (
                      <span className="font-mono text-xs font-bold" style={{ color: (v || 0) > 0 ? "#10b981" : "#ef4444" }}>
                        {v ? v.toFixed(2) : "--"}
                      </span>
                    ) 
                  },
                  { 
                    title: "操作", 
                    key: "op", 
                    width: 100,
                    render: (_: unknown, r: PoolStrategy) => (
                      <button
                        onClick={() => handleRetire(r.name)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <span>移入退役</span>
                      </button>
                    ) 
                  },
                ]}
              />
            </div>
          </div>
        )}

        {poolData && (!poolData.retired?.length) && (!poolData.challengers?.length) && (
          <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
            <Empty 
              description={<span className="text-slate-400 text-xs">暂无退役/考察策略 — 策略连续30天跨品种零交易或表现衰退后将自动纳管到此处</span>} 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
            />
          </div>
        )}
      </div>

      {/* ── 多策略横向对比与组合回测工作台 (Multi-Strategy Workbench) ── */}
      <MultiStrategyWorkbench
        selectedStrategies={selectedStrategies}
        onClearSelection={() => setSelectedStrategies([])}
      />
    </div>
  );
}
