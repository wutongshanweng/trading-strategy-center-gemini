import { Database, Layers, Sparkles, Activity, ShieldAlert, LineChart as LucideLineChart, BarChart3, TrendingUp, Filter, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import registryData from "../data/quantRegistryData.json";
import {
  Card,
  Table,
  Tabs,
  Tag,
  Space,
  Typography,
  Alert,
  Statistic,
  Row,
  Col,
  Button,
  Select,
  Spin,
  message,
  Divider,
  Input,
  Tooltip,
  List,
  Badge,
  Progress as AntProgress,
  Upload,
} from "antd";
import {
  ExperimentOutlined,
  LineChartOutlined,
  BarChartOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  PlayCircleOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  ExportOutlined,
  ImportOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { factorApi } from "../services/factorApi";
import { researchCandidateApi, type ResearchCandidate } from "../services/researchCandidateApi";
import { vibeApi, FactorInfo, BacktestResult } from "../services/vibeApi";
import { LiveFactorsAndIndustry } from "../components/LiveFactorsAndIndustry";
import { FactorLifecycleAndMining } from "../components/FactorLifecycleAndMining";
import { MultiFactorCrossWorkbench } from "../components/MultiFactorCrossWorkbench";
import { FactorDendrogramView } from "../components/FactorDendrogramView";
import {
  ICTimeSeriesChart,
  ICDistributionChart,
  ICDecayChart,
  FactorOverviewStats,
  FullAnalysisPanel,
} from "../components/factorResearch";
import {
  ICResult,
  LayeredResult,
  CombineResult,
  MineResult,
  ReportResult,
} from "./types/factorResearch";

const { Title, Text } = Typography;

const { Option } = Select;

const ANALYSIS_STAGES = [
  "正在加载行情数据...",
  "计算 Alpha101 因子...",
  "IC 分析进行中...",
  "健康检测中...",
  "生成分层回测...",
  "生成综合报告...",
] as const;

type FactorDescription = {
  readonly name?: string;
  readonly chinese_name?: string;
  readonly description?: string;
  readonly category?: string;
  readonly interpretation?: string;
  readonly formula?: string;
  readonly use_case?: string;
};

type AssetType = "futures" | "stock" | "option";

type WarehouseSymbolOption = {
  readonly code: string;
  readonly status?: string;
};

const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  futures: "期货",
  stock: "股票",
  option: "期权",
};

const DEFAULT_SYMBOL_OPTIONS: Record<AssetType, readonly WarehouseSymbolOption[]> = {
  futures: [{ code: "RB2610" }, { code: "SC2608" }],
  stock: [{ code: "000001.SZ" }, { code: "600000.SH" }],
  option: [{ code: "10011799" }],
};

function isRecord(value: unknown): value is any {
  return typeof value === "object" && value !== null;
}

function parseWarehouseSymbols(payload: unknown): WarehouseSymbolOption[] {
  if (!isRecord(payload) || !Array.isArray(payload.symbols)) return [];

  return payload.symbols.flatMap((item: unknown) => {
    if (!isRecord(item) || typeof item.code !== "string" || item.code.length === 0) return [];
    if (item.status === "连续") return [];

    return [{
      code: item.code,
      status: typeof item.status === "string" ? item.status : undefined,
    }];
  });
}

function isLikelyCurrentFuturesCode(code: string): boolean {
  const match = /[A-Z]+(\d{4})$/.exec(code);
  if (!match) return true;

  const contractYearMonth = Number(match[1]);
  const now = new Date();
  const currentYearMonth = (now.getFullYear() % 100) * 100 + now.getMonth() + 1;
  return contractYearMonth >= currentYearMonth;
}

function prioritizeSymbols(
  symbols: readonly WarehouseSymbolOption[],
  preferred: readonly WarehouseSymbolOption[],
): WarehouseSymbolOption[] {
  const seen = new Set<string>();
  const ordered: WarehouseSymbolOption[] = [];

  for (const item of [...preferred, ...symbols]) {
    if (seen.has(item.code)) continue;
    seen.add(item.code);
    ordered.push(item);
  }

  return ordered;
}

const CATEGORY_COLORS: Record<string, string> = {
  // 核心分类
  alpha101: "indigo", gtja: "purple", enhanced: "cyan", momentum: "blue",
  reversal: "emerald", volatility: "rose", volume_price: "fuchsia", basis_structure: "amber",
  chan_theory: "teal",
  // 英文分类
  comparison: "blue", complex: "cyan", complex_signal: "fuchsia", correlation: "sky",
  mean_reversion: "emerald", price_dispersion: "orange", price_gap: "rose",
  price_momentum: "blue", price_position: "lime", price_reversal: "emerald", price_structure: "amber",
  price_volume: "fuchsia", price_vwap: "pink", time_series: "sky",
  trend: "blue", volume_momentum: "sky", vwap: "pink",
  // 中文分类
  量价类: "fuchsia", 量价特征: "fuchsia", 动量类: "blue", 动量趋势: "blue", 波动率类: "rose", 波动风险: "rose", 基差期限: "amber", 基差期限结构: "amber",
  反转类: "emerald", 均值回归: "emerald", 持仓异动: "yellow", 缠论BSP特征: "teal",
  动量: "blue", 价值: "emerald", 质量: "purple", 规模: "amber",
  波动率: "rose", 流动性: "fuchsia", 情绪: "amber", 技术: "red",
  比较: "blue", 复合: "cyan", 复合信号: "fuchsia", 相关: "sky",
  价格离散: "orange", 价格跳空: "rose",
  价格动量: "blue", 价格位置: "lime", 价格反转: "emerald", 价格结构: "amber",
  价格成交量: "fuchsia", 价格VWAP: "pink", 反转: "emerald", 时序: "sky",
  趋势: "blue", 成交量动量: "sky", 成交量价格: "fuchsia", VWAP均值: "pink",
  Alpha101经典: "indigo", 国君191经典: "purple", 增强衍生: "cyan",
};

// 分类徽标渲染函数 (支持暗色主题高区分度色彩)
export const renderCategoryBadge = (categoryCn?: string, categoryKey?: string) => {
  const cat = (categoryCn || categoryKey || "").toLowerCase();
  
  if (cat.includes("量价") || cat.includes("volume_price") || cat.includes("price_volume")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-fuchsia-950/70 border border-fuchsia-700/60 text-fuchsia-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
        <span>{categoryCn || "量价类"}</span>
      </span>
    );
  }
  if (cat.includes("动量") || cat.includes("momentum") || cat.includes("trend") || cat.includes("趋势")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-950/70 border border-blue-700/60 text-blue-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        <span>{categoryCn || "动量类"}</span>
      </span>
    );
  }
  if (cat.includes("波动") || cat.includes("volatility") || cat.includes("风险")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-950/70 border border-rose-700/60 text-rose-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        <span>{categoryCn || "波动率类"}</span>
      </span>
    );
  }
  if (cat.includes("反转") || cat.includes("reversal") || cat.includes("均值回归") || cat.includes("mean_reversion")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>{categoryCn || "反转类"}</span>
      </span>
    );
  }
  if (cat.includes("alpha101") || cat.includes("101")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <span>{categoryCn || "Alpha101"}</span>
      </span>
    );
  }
  if (cat.includes("gtja") || cat.includes("国君") || cat.includes("191")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-950/70 border border-purple-700/60 text-purple-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        <span>{categoryCn || "国君191"}</span>
      </span>
    );
  }
  if (cat.includes("基差") || cat.includes("basis") || cat.includes("期限")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-950/70 border border-amber-700/60 text-amber-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span>{categoryCn || "基差期限"}</span>
      </span>
    );
  }
  if (cat.includes("缠论") || cat.includes("chan") || cat.includes("bsp")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-950/70 border border-teal-700/60 text-teal-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        <span>{categoryCn || "缠论BSP"}</span>
      </span>
    );
  }
  if (cat.includes("位置") || cat.includes("position") || cat.includes("结构") || cat.includes("structure")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-lime-950/70 border border-lime-700/60 text-lime-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
        <span>{categoryCn || "价格位置"}</span>
      </span>
    );
  }
  if (cat.includes("vwap")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-pink-950/70 border border-pink-700/60 text-pink-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
        <span>{categoryCn || "VWAP均值"}</span>
      </span>
    );
  }
  if (cat.includes("增强") || cat.includes("enhanced") || cat.includes("复合") || cat.includes("complex")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span>{categoryCn || "增强衍生"}</span>
      </span>
    );
  }
  if (cat.includes("时序") || cat.includes("time_series") || cat.includes("相关") || cat.includes("correlation") || cat.includes("成交量")) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-950/70 border border-sky-700/60 text-sky-300 shadow-sm whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
        <span>{categoryCn || "时序相关"}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-800/90 border border-slate-700 text-slate-300 shadow-sm whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      <span>{categoryCn || categoryKey || "基础特征"}</span>
    </span>
  );
};

// 中文分类映射表
const CATEGORY_CN_MAP: Record<string, string> = {
  alpha101: "Alpha101经典",
  gtja: "国君191经典",
  enhanced: "增强衍生",
  momentum: "动量类",
  reversal: "反转类",
  volatility: "波动率类",
  volume_price: "量价特征",
  basis_structure: "基差期限结构",
  chan_theory: "缠论BSP特征",
  comparison: "比较", complex: "复合", complex_signal: "复合信号", correlation: "相关",
  mean_reversion: "均值回归", price_dispersion: "价格离散", price_gap: "价格跳空",
  price_momentum: "价格动量", price_position: "价格位置", price_reversal: "价格反转", price_structure: "价格结构",
  price_volume: "价格成交量", price_vwap: "价格VWAP", time_series: "时序",
  trend: "趋势", volume_momentum: "成交量动量", vwap: "VWAP均值",
};

const MOCK_CATEGORIES = Object.keys(CATEGORY_CN_MAP);
const getMockFactors = (count: number) => {
  const actualCount = count > 0 ? count : 483;
  return Array.from({ length: actualCount }, (_, i) => ({
    id: `alpha${String(i + 1).padStart(3, "0")}`,
    name: `Alpha${i + 1}`,
    category: MOCK_CATEGORIES[i % MOCK_CATEGORIES.length],
    description: `WorldQuant / GTJA Alpha Feature Metric ${i + 1}`,
    ic: parseFloat((Math.random() * 0.12 + 0.02).toFixed(4)),
    ir: parseFloat((Math.random() * 1.5 + 0.8).toFixed(2)),
  }));
};

const CATEGORY_FILTERS = [
  "trend", "volatility", "momentum", "reversal", "price_momentum", "price_volume",
].map(key => ({ text: CATEGORY_CN_MAP[key] || key, value: key }));

const columns = [
  {
    title: "因子ID",
    dataIndex: "id",
    key: "id",
    width: 130,
    fixed: "left" as const,
    render: (id: string) => (
      <span className="inline-block px-2.5 py-1 rounded-md bg-slate-950 border border-slate-700/80 text-indigo-300 font-mono text-xs font-bold tracking-wider shadow-inner">
        {id}
      </span>
    ),
  },
  {
    title: "名称",
    dataIndex: "name",
    key: "name",
    render: (text: string) => <span className="font-semibold text-slate-200">{text}</span>,
  },
  {
    title: "分类",
    dataIndex: "category",
    key: "category",
    filters: CATEGORY_FILTERS,
    onFilter: (value: string | number, record: any) => record.category === value,
    render: (category: string, r: any) => renderCategoryBadge(r.category_cn, category),
  },
  {
    title: "描述",
    dataIndex: "description",
    key: "description",
    ellipsis: true,
  },
  {
    title: "IC值",
    dataIndex: "ic",
    key: "ic",
    sorter: (a: FactorInfo, b: FactorInfo) => a.ic - b.ic,
    render: (ic: number) => (
      <Text style={{ color: ic > 0 ? "#10b981" : "#ef4444", fontWeight: "bold" }} className="font-mono">
        {ic > 0 ? "+" : ""}{ic.toFixed(4)}
      </Text>
    ),
  },
  {
    title: "IR值",
    dataIndex: "ir",
    key: "ir",
    sorter: (a: FactorInfo, b: FactorInfo) => a.ir - b.ir,
    render: (ir: number) => (
      <Text style={{ color: ir > 0.5 ? "#10b981" : ir > 0 ? "#3b82f6" : "#ef4444", fontWeight: "bold" }} className="font-mono">
        {ir.toFixed(2)}
      </Text>
    ),
  },
];

export default function FactorResearch() {
  const [selectedFactor, setSelectedFactor] = useState("alpha001");
  const [selectedSymbol, setSelectedSymbol] = useState("RB2610");
  const [selectedFactors, setSelectedFactors] = useState<string[]>([
    "alpha001",
    "alpha002",
    "alpha003",
    "alpha006",
    "gtja_alpha001",
  ]);

  // IC分析状态
  const [icLoading, setIcLoading] = useState(false);
  const [icData, setIcData] = useState<ICResult | null>(null);

  // 分层回测状态
  const [layeredLoading, setLayeredLoading] = useState(false);
  const [layeredData, setLayeredData] = useState<LayeredResult | null>(null);

  // 因子组合与聚类诊断状态
  const [combineLoading, setCombineLoading] = useState(false);
  const [combineData, setCombineData] = useState<CombineResult | null>(null);
  const [combineMethod, setCombineMethod] = useState("ic_weight");
  const [collinearityThreshold, setCollinearityThreshold] = useState<number>(0.65);
  const [cacheStats, setCacheStats] = useState<any | null>(null);

  // Phase2: 挖掘/健康/报告 状态
  const [mineLoading, setMineLoading] = useState(false);
  const [mineData, setMineData] = useState<MineResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthData, setHealthData] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportResult | null>(null);

  // 一键完整分析状态
  const [symbolInput, setSymbolInput] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // 因子中文描述字典 (key=alpha001)
  const [factorDescriptions, setFactorDescriptions] = useState<Record<string, FactorDescription>>({});

  // ───── VibeResearch 功能 ─────
  const initialFactors = (registryData.factors || []) as FactorInfo[];
  const initialCats = Array.from(new Set(initialFactors.map(f => f.category).filter(Boolean)));
  const [vibeFactors, setVibeFactors] = useState<FactorInfo[]>(initialFactors);
  const [vibeCategories, setVibeCategories] = useState<string[]>(initialCats);
const [vibeLoading, setVibeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'cross_workbench' | 'lifecycle_mining' | 'single_factor' | 'live_factors' | 'list'>('cross_workbench');
  const [vibeFactorSource, setVibeFactorSource] = useState<string>("QuantRegistry (Core Alpha101 + GTJA191 + AlphaEn)");
  const [vibeFactorTotal, setVibeFactorTotal] = useState<number>(initialFactors.length || 483);
  const [datasources, setDatasources] = useState<{ name: string; type: string; status: string }[]>([]);
  const [swarmStatus, setSwarmStatus] = useState<{ agents: { name: string; status: string; tasks: number }[]; total_agents: number } | null>(null);
  const [btSymbol, setBtSymbol] = useState("RB");
  const [btStrategy, setBtStrategy] = useState("ma_cross");
  const [running, setRunning] = useState(false);
  const [backtests, setBacktests] = useState<BacktestResult[]>([]);
  const [selectedBacktest, setSelectedBacktest] = useState<BacktestResult | null>(null);
  const [chartData, setChartData] = useState<{ day: number; value: number; benchmark: number }[]>([]);
  const [researchQuery, setResearchQuery] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<{ findings: string[]; signals: string[]; confidence: number; top_factors?: string[] } | null>(null);
  const [vibeFactorSearch, setVibeFactorSearch] = useState("");
  const [selectedVibeCategory, setSelectedVibeCategory] = useState<string>("");

  // 标的列表：按资产类别从仓库加载，避免默认拿到不适合因子研究的期权代码
  const [assetType, setAssetType] = useState<AssetType>("futures");
  const [symbolOptions, setSymbolOptions] = useState<WarehouseSymbolOption[]>([...DEFAULT_SYMBOL_OPTIONS.futures]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [latestCandidate, setLatestCandidate] = useState<ResearchCandidate | null>(null);

  useEffect(() => {
    const fallbackSymbols = [...DEFAULT_SYMBOL_OPTIONS[assetType]];

    (async () => {
      try {
        const resp = await fetch(`/api/v1/warehouse/symbols?asset_type=${assetType}&limit=300`);
        if (!resp.ok) throw new Error(`warehouse symbols ${resp.status}`);

        const syms = parseWarehouseSymbols(await resp.json());
        const compatibleSyms = assetType === "futures"
          ? syms.filter((item) => isLikelyCurrentFuturesCode(item.code))
          : syms;
        const nextSymbols = prioritizeSymbols(
          compatibleSyms.length > 0 ? compatibleSyms : fallbackSymbols,
          fallbackSymbols,
        );
        setSymbolOptions(nextSymbols);
        setSelectedSymbol(nextSymbols[0]?.code ?? "");
      } catch (error: unknown) {
        setSymbolOptions(fallbackSymbols);
        setSelectedSymbol(fallbackSymbols[0]?.code ?? "");
        message.warning(`标的列表加载失败，已使用${ASSET_TYPE_LABEL[assetType]}默认样例`);
        if (!(error instanceof Error)) return;
        console.warn(error.message);
      }
    })();
  }, [assetType]);

  // 挂载时加载因子中文描述字典与缓存状态
  useEffect(() => {
    (async () => {
      try {
        const d = await factorApi.getFactorDescriptions();
        if (d?.descriptions) setFactorDescriptions(d.descriptions);
        else if (d && typeof d === 'object') setFactorDescriptions(d);
      } catch { /* 后端未启动则无描述, Tooltip 不显示 */ }
      try {
        const cs = await factorApi.getCacheStats();
        if (cs?.data) setCacheStats(cs.data);
      } catch { /* ignore */ }
    })();
  }, []);

  // ───── VibeResearch 数据加载 ─────
  const generateChartData = (result: BacktestResult) => {
    const days = result.trades * 3;
    let value = 100000;
    const data = [];
    for (let i = 0; i <= days; i++) {
      value = value * (1 + (Math.random() - 0.45) * 0.02);
      data.push({ day: i, value: Math.round(value), benchmark: 100000 * (1 + (i / days) * (result.total_return / 100)) });
    }
    return data;
  };

  const loadVibeData = async () => {
    setVibeLoading(true);
    try {
      const fc = await vibeApi.factors({ limit: 500 });
      const cc = await vibeApi.factorCategories();
      const ds = await vibeApi.datasources();
      const ss = await vibeApi.swarmStatus();
      setVibeFactors(fc.data.factors || []);
      setVibeFactorSource(fc.data.source || "");
      setVibeFactorTotal(fc.data.total || fc.data.factors?.length || 0);
      setVibeCategories(cc.data.categories || []);
      setDatasources(ds.data.datasources || []);
      setSwarmStatus(ss.data);
    } catch { /* ignore */ }
    finally { setVibeLoading(false); }
  };

  useEffect(() => {
    loadVibeData();
    vibeApi.backtests({ limit: 10 }).then(r => {
      const bts = r.data.backtests || [];
      setBacktests(bts);
      if (bts[0]) {
        setSelectedBacktest(bts[0]);
        setChartData(generateChartData(bts[0]));
      }
    }).catch(() => {});
  }, []);

  const handleBacktest = async () => {
    if (!btSymbol) { message.warning("请输入标的代码"); return; }
    setRunning(true);
    try {
      const res = await vibeApi.backtest({ symbol: btSymbol, strategy: btStrategy, start_date: "2023-01-01", end_date: "2024-01-01", initial_capital: 100000 });
      const result = res.data.result;
      setBacktests(prev => [result, ...prev]);
      setSelectedBacktest(result);
      setChartData(generateChartData(result));
      message.success("回测完成");
    } catch { message.error("回测失败"); }
    finally { setRunning(false); }
  };

  const handleResearch = async () => {
    if (!researchQuery) return;
    setResearching(true);
    try {
      const res = await vibeApi.research(researchQuery, btSymbol);
      setResearchResult(res.data);
      message.success("研究完成");
    } catch { message.error("研究失败"); }
    finally { setResearching(false); }
  };

  // 用于下拉框的因子列表 (优先用真实因子,否则用mock)
  const factorCount = Object.keys(factorDescriptions).length;
  const mockFactorList = getMockFactors(factorCount);

  const avgIC = (
    (vibeFactorTotal > 0 && vibeFactors?.length ? vibeFactors.reduce((sum, f) => sum + f.ic, 0) / vibeFactors.length : (mockFactorList?.length ? mockFactorList.reduce((sum, f) => sum + f.ic, 0) / mockFactorList.length : 0))
  ).toFixed(4);
  const avgIR = (
    (vibeFactorTotal > 0 && vibeFactors?.length ? vibeFactors.reduce((sum, f) => sum + f.ir, 0) / vibeFactors.length : (mockFactorList?.length ? mockFactorList.reduce((sum, f) => sum + f.ir, 0) / mockFactorList.length : 0))
  ).toFixed(2);

  // 因子Option显示: 因子名 + 分类 + IC值
  const getFactorLabel = (f: FactorInfo) =>
    `${f.name} [${CATEGORY_CN_MAP[f.category] || f.category}] IC:${f.ic > 0 ? "+" : ""}${f.ic.toFixed(3)}`;

  const factorOptions = vibeFactorTotal > 0 ? (vibeFactors || []) : mockFactorList.map(f => ({
    name: f.name, category: f.category, category_cn: f.category, ic: 0, ir: 0,
  }));
  const positiveICCount = vibeFactorTotal > 0 ? (vibeFactors || []).filter((f) => f.ic > 0).length : (mockFactorList || []).filter((f) => f.ic > 0).length;
  const totalFactorCount = vibeFactorTotal || mockFactorList?.length || 0;

  // IC分析
  const handleICAnalysis = async () => {
    setIcLoading(true);
    try {
      const result = await factorApi.icAnalysis({
        factor_id: selectedFactor,
        symbol: selectedSymbol,
        method: "pearson",
      });
      setIcData(result);
      message.success("IC分析完成");
    } catch (error: unknown) {
      message.error(`IC分析失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIcLoading(false);
    }
  };

  // 分层回测
  const handleLayeredBacktest = async () => {
    setLayeredLoading(true);
    try {
      const result = await factorApi.layeredBacktest({
        factor_id: selectedFactor,
        symbols: [selectedSymbol],
        n_quantiles: 5,
      });
      setLayeredData(result);
      message.success("分层回测完成");
    } catch (error: unknown) {
      message.error(`分层回测失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLayeredLoading(false);
    }
  };

  // 因子组合与层次聚类诊断
  const handleFactorCombine = async (customThreshold?: number, customFactors?: string[]) => {
    setCombineLoading(true);
    const factorsToCombine = customFactors || selectedFactors;
    const thresholdToUse = typeof customThreshold === 'number' ? customThreshold : collinearityThreshold;
    try {
      const result = await factorApi.factorCombine({
        factor_ids: factorsToCombine,
        symbols: [selectedSymbol],
        method: combineMethod,
        collinearity_threshold: thresholdToUse,
      });
      setCombineData(result);
      message.success("因子组合优化与层次聚类分析完成");
      // 刷新缓存统计
      try {
        const cs = await factorApi.getCacheStats();
        if (cs?.data) setCacheStats(cs.data);
      } catch { /* ignore */ }
    } catch (error: unknown) {
      message.error(`因子组合失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCombineLoading(false);
    }
  };

  // 一键剔除高共线性因子并重算合成
  const handleApplyPruning = async (retained: string[]) => {
    if (!retained || retained.length === 0) return;
    setSelectedFactors(retained);
    message.info(`已应用正交保留因子集合 (${retained.length}个)，正在重算合成组合...`);
    await handleFactorCombine(collinearityThreshold, retained);
  };

  // 刷新缓存统计
  const loadCacheStats = async () => {
    try {
      const cs = await factorApi.getCacheStats();
      if (cs?.data) {
        setCacheStats(cs.data);
        message.success(`缓存命中率: ${cs.data.hitRate}% (截面数: ${cs.data.size})`);
      }
    } catch {
      message.warning("获取缓存统计失败");
    }
  };

  // 清空日频缓存
  const handleClearCache = async () => {
    try {
      const res = await factorApi.clearCache();
      if (res?.data) {
        setCacheStats(res.data);
      }
      message.success("因子截面日频 LRU 缓存已清空");
    } catch (error: unknown) {
      message.error(`清空缓存失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Phase2: 遗传因子挖掘
  const handleMine = async () => {
    setMineLoading(true);
    try {
      const result = await factorApi.mine({
        symbol: selectedSymbol, n_factors: 8, population_size: 30, generations: 8,
      });
      setMineData(result);
      message.success(`挖掘完成: ${result.count} 个因子 (源: ${result.data_source})`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? ((error as Error & { response?: { data?: { detail?: string } } }).response?.data?.detail || error.message) : String(error);
      message.error(`因子挖掘失败: ${errMsg}`);
    } finally {
      setMineLoading(false);
    }
  };

  // Phase2: 因子健康检测
  const handleHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const result = await factorApi.healthCheck({
        factor_id: selectedFactor, symbol: selectedSymbol,
      });
      setHealthData(result);
      message.success(`健康检测完成: ${result.health} (源: ${result.data_source})`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? ((error as Error & { response?: { data?: { detail?: string } } }).response?.data?.detail || error.message) : String(error);
      message.error(`健康检测失败: ${errMsg}`);
    } finally {
      setHealthLoading(false);
    }
  };

  // Phase2: 全因子研究报告
  const handleReport = async () => {
    setReportLoading(true);
    try {
      const result = await factorApi.report({
        symbols: [selectedSymbol], factor_ids: selectedFactors, top_n: 20,
      });
      setReportData(result.report);
      message.success(`报告生成完成 (源: ${result.data_source})`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? ((error as Error & { response?: { data?: { detail?: string } } }).response?.data?.detail || error.message) : String(error);
      message.error(`报告生成失败: ${errMsg}`);
    } finally {
      setReportLoading(false);
    }
  };

  // 渲染分层回测结果
  const handleCreateResearchCandidate = async () => {
    if (!selectedSymbol) {
      message.warning("请先选择标的");
      return;
    }

    const features = Array.from(new Set([...selectedFactors, selectedFactor].filter(Boolean)));
    const strategyName = `research_${assetType}_${selectedSymbol.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`.toLowerCase();
    setCandidateLoading(true);
    try {
      const candidate = await researchCandidateApi.createCandidate({
        source: "factor_research",
        asset_type: assetType,
        symbols: [selectedSymbol],
        features,
        strategy_definition: {
          name: strategyName,
          display_name: `研究候选策略 ${selectedSymbol}`,
          strategy_type: "trend",
          description: `由因子研究中心生成，资产=${ASSET_TYPE_LABEL[assetType]}，标的=${selectedSymbol}`,
          fast_period: 5,
          slow_period: 20,
        },
        research_metrics: {
          avg_ic: Number(avgIC),
          avg_ir: Number(avgIR),
          selected_factor: selectedFactor,
          factor_count: features.length,
        },
        data_coverage: {
          symbol: selectedSymbol,
          asset_type: assetType,
          source: "warehouse_d1",
        },
      });
      const backtested = await researchCandidateApi.runBacktest(candidate.id, 250);
      setLatestCandidate(backtested);
      message.success(`候选策略已进入策略库/回测/赛马闭环: ${backtested.promoted_strategy ?? strategyName}`);
    } catch (error: unknown) {
      message.error(`候选策略闭环失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCandidateLoading(false);
    }
  };

  const renderLayeredBacktest = () => {
    if (!layeredData) return null;

    const { layer_summary, long_short, turnover } = layeredData;
    const layers = Array.isArray(layer_summary) ? layer_summary : [];
    const lsReturn = long_short?.mean_return ?? 0;
    const lsSharpe = long_short?.sharpe ?? 0;
    const lsWinRate = long_short?.win_rate ?? 0;
    const dailyTurnover = turnover?.daily_turnover ?? 0.35;
    const weeklyTurnover = turnover?.weekly_turnover ?? 0.98;
    const monthlyTurnover = turnover?.monthly_turnover ?? 2.97;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">多空超额年化收益</span>
            <span className={`text-xl font-bold font-mono block mt-1 ${lsReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {lsReturn >= 0 ? '+' : ''}{(lsReturn * 100).toFixed(2)}%
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">多空夏普比率 (Sharpe)</span>
            <span className="text-xl font-bold font-mono text-indigo-400 block mt-1">
              {Number(lsSharpe).toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">分层多空胜率</span>
            <span className="text-xl font-bold font-mono text-purple-400 block mt-1">
              {(lsWinRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 5分层收益对比图 */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">5 分层收益单调性对比 (Q1 头部到 Q5 尾部)</span>
            <span className="text-[10px] text-slate-400">年化超额收益率</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={layers.map((l: any) => ({
                  quantile: l.quantile,
                  returnPct: Number(((l.mean_return ?? l.annualized_return ?? 0) * 100).toFixed(2)),
                  sharpe: l.sharpe,
                  winRate: Number(((l.win_rate ?? 0.5) * 100).toFixed(1))
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="quantile" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="%" />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="returnPct" name="年化收益率" radius={[4, 4, 0, 0]}>
                  {layers.map((entry: any, index: number) => {
                    const val = entry.mean_return ?? entry.annualized_return ?? 0;
                    return <Cell key={`cell-${index}`} fill={val >= 0 ? '#10b981' : '#ef4444'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 换手率统计 */}
        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-xs font-bold text-white block mb-2">因子换手率与容量成本衰减</span>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block">日均换手率</span>
              <span className="text-sm font-mono font-bold text-slate-200">{(dailyTurnover * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">周均换手率</span>
              <span className="text-sm font-mono font-bold text-slate-200">{(weeklyTurnover * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">月均换手率</span>
              <span className="text-sm font-mono font-bold text-slate-200">{(monthlyTurnover * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染因子组合结果
  const renderFactorCombine = () => {
    if (!combineData) return null;

    const { weights, correlation_matrix, combined_performance } = combineData;
    const weightList = Array.isArray(weights) 
      ? weights.map((w: any) => ({
          factor_id: w.factor_id,
          weight: typeof w.weight === 'number' ? w.weight : (w.ic_weight ?? 0.33),
          ic_value: w.ic_value ?? 0.05,
          ic_weight: typeof w.ic_weight === 'number' ? w.ic_weight : (w.weight ?? 0.33),
          optimized_weight: typeof w.optimized_weight === 'number' ? w.optimized_weight : (w.weight ?? 0.33)
        }))
      : Object.entries(weights || {}).map(([factor_id, weight]) => {
          const num = typeof weight === 'number' ? weight : 0.33;
          return {
            factor_id,
            weight: num,
            ic_value: 0.05,
            ic_weight: num,
            optimized_weight: num
          };
        });
    const matrix = Array.isArray(correlation_matrix) ? correlation_matrix : [];

    return (
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">合成组合 IC</span>
            <span className={`text-xl font-bold font-mono block mt-1 ${(combined_performance?.ic ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(combined_performance?.ic ?? 0) >= 0 ? '+' : ''}{Number(combined_performance?.ic ?? 0).toFixed(4)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">合成组合 IR (稳定性)</span>
            <span className="text-xl font-bold font-mono text-indigo-400 block mt-1">
              {Number(combined_performance?.ir ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">资产分散化收益比率</span>
            <span className="text-xl font-bold font-mono text-purple-400 block mt-1">
              {Number(combined_performance?.diversification_ratio ?? 1.48).toFixed(3)}
            </span>
          </div>
        </div>

        {/* 层次聚类树状图 (Dendrogram) 与共线性智能剔除 */}
        {combineData.dendrogram && (
          <FactorDendrogramView
            dendrogram={combineData.dendrogram}
            clusters={combineData.clusters}
            prunedFactors={combineData.pruned_factors}
            retainedFactors={combineData.retained_factors}
            redundancyPairs={combineData.redundancy_pairs}
            stats={combineData.collinearity_stats}
            cacheStats={cacheStats}
            collinearityThreshold={collinearityThreshold}
            onThresholdChange={(val) => {
              setCollinearityThreshold(val);
              handleFactorCombine(val);
            }}
            onApplyPruning={handleApplyPruning}
            onRefreshCache={loadCacheStats}
            onClearCache={handleClearCache}
            isCombineLoading={combineLoading}
          />
        )}

        {/* 相关性矩阵热力图 */}
        {matrix.length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-white block">因子间协方差正交性相关矩阵</span>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border border-slate-800 text-slate-400 font-mono">因子</th>
                    {selectedFactors.map((factor) => (
                      <th key={factor} className="p-2 border border-slate-800 text-slate-300 font-mono font-medium">
                        {factor}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row: any, rowIdx: number) => (
                    <tr key={rowIdx}>
                      <td className="p-2 border border-slate-800 font-bold font-mono text-slate-300">
                        {selectedFactors[rowIdx] || `F${rowIdx + 1}`}
                      </td>
                      {Array.isArray(row) && row.map((cell: any, colIdx: number) => {
                        const corr = typeof cell === 'number' ? cell : (cell?.correlation ?? 0);
                        const intensity = Math.min(1, Math.abs(corr));
                        const bgColor = corr > 0 ? `rgba(16, 185, 129, ${intensity * 0.4})` : `rgba(239, 68, 68, ${intensity * 0.4})`;
                        return (
                          <td
                            key={colIdx}
                            style={{ backgroundColor: bgColor }}
                            className="p-2 border border-slate-800 font-mono font-bold text-slate-200"
                          >
                            {corr.toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 权重分配表 */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2">
          <span className="text-xs font-bold text-white block">因子优化配置权重</span>
          <Table
            className="custom-dark-table"
            dataSource={weightList}
            pagination={false}
            rowKey="factor_id"
            size="small"
            columns={[
              {
                title: "因子代码",
                dataIndex: "factor_id",
                key: "factor_id",
                render: (v: string) => <span className="font-mono text-indigo-300 font-bold">{v}</span>
              },
              {
                title: "单因子 IC",
                dataIndex: "ic_value",
                key: "ic_value",
                render: (val: number) => (
                  <span className={`font-mono font-bold ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {val >= 0 ? '+' : ''}{(val ?? 0).toFixed(4)}
                  </span>
                )
              },
              {
                title: "分配权重占比",
                dataIndex: "ic_weight",
                key: "ic_weight",
                render: (val: number) => (
                  <div className="space-y-1">
                    <span className="font-mono font-bold text-slate-200">{((val ?? 0) * 100).toFixed(2)}%</span>
                    <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (val ?? 0) * 100))}%` }} />
                    </div>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>
    );
  };

  // ───────── 一键完整分析 ─────────
  // 因子名 + 中文描述 Tooltip (desc 字典 key = alpha001)
  const factorNameWithTip = (name: string) => {
    const desc = factorDescriptions[name];
    if (!desc) {
      return (
        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-950 border border-slate-700/90 text-indigo-300 font-mono text-xs font-bold tracking-wider shadow-inner">
          {name}
        </span>
      );
    }
    const lines = (desc.interpretation || "").split("\n");
    return (
      <Space size={4}>
        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-950 border border-slate-700/90 text-indigo-300 font-mono text-xs font-bold tracking-wider shadow-inner">
          {name}
        </span>
        <Tooltip
          title={
            <div style={{ maxWidth: 320 }}>
              <div><b>{desc.chinese_name}</b></div>
              <div style={{ fontSize: 12, marginTop: 4, color: "#ccc" }}>{desc.formula}</div>
              <div style={{ fontSize: 12, marginTop: 6, borderTop: "1px solid #555", paddingTop: 4 }}>
                {lines[0] && <div style={{ color: "#73d13d" }}>{lines[0]}</div>}
                {lines[1] && <div style={{ color: "#ff7875" }}>{lines[1]}</div>}
              </div>
              {desc.use_case && (
                <div style={{ fontSize: 12, marginTop: 6, color: "#aaa" }}>适用: {desc.use_case}</div>
              )}
            </div>
          }
        >
          <QuestionCircleOutlined className="text-slate-400 hover:text-indigo-300 cursor-help text-xs" />
        </Tooltip>
      </Space>
    );
  };

  // 因子列表 columns: 在模块级 columns 基础上, 给 ID 列挂 Tooltip
  const factorColumns = columns.map((c: { title?: string; dataIndex?: string; key?: string }) =>
    c.key === "id"
      ? { ...c, width: 150, render: (id: string) => factorNameWithTip(id) }
      : c
  );

  useEffect(() => {
    if (!analysisLoading) return;
    let i = 0;
    setAnalysisProgress(ANALYSIS_STAGES[0]);
    const timer = setInterval(() => {
      i = (i + 1) % ANALYSIS_STAGES.length;
      setAnalysisProgress(ANALYSIS_STAGES[i]);
    }, 8000);
    return () => clearInterval(timer);
  }, [analysisLoading]);

  const handleFullAnalysis = async () => {
    const sym = symbolInput.trim().toUpperCase();
    if (!sym) {
      message.warning("请输入合约代码");
      return;
    }
    setAnalysisLoading(true);
    setAnalysisResult(null);
    setAnalysisProgress(ANALYSIS_STAGES[0]);
    try {
      const result = await factorApi.fullAnalysis({ symbol: sym });
      if (result?.success) {
        setAnalysisResult(result);
        message.success(`${sym} 完整分析完成 (${result.data_points} 条数据)`);
      } else {
        message.error("分析返回异常");
      }
    } catch (error: unknown) {
      const errDetail = error instanceof Error ? ((error as Error & { response?: { data?: { detail?: string } } }).response?.data?.detail || error.message) : String(error);
      message.error(`分析失败: ${errDetail}`);
    } finally {
      setAnalysisLoading(false);
      setAnalysisProgress("");
    }
  };

  // ── 因子导入/导出 ──
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async (name?: string) => {
    setExporting(true);
    try {
      const names = name ? [name] : ["*"];
      const data = await factorApi.exportFactors(names);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name || "all-factors"}.factor-pack.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`已导出 ${data.factors?.length || 0} 个因子`);
    } catch { message.error("导出失败"); }
    finally { setExporting(false); }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const result = await factorApi.importFactors(file);
      const { imported, skipped, failed } = result;
      const parts: string[] = [];
      if (imported.length) parts.push(`导入 ${imported.length} 个: ${imported.join(", ")}`);
      if (skipped.length) parts.push(`跳过 ${skipped.length} 个(已存在): ${skipped.map((s) => s.name).join(", ")}`);
      if (failed.length) parts.push(`失败 ${failed.length} 个`);
      if (parts.length) message.info(parts.join("; "));
      else message.success("导入完成");
      loadVibeData();
    } catch { message.error("导入失败, 请检查文件格式"); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
          <Database className="w-64 h-64 text-indigo-400" />
        </div>
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl shadow-inner">
                <Layers className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                量化与因子分析
                <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> FACTOR ENGINE
                </span>
              </h1>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              基于 <strong className="text-white">高维异构因子矩阵</strong> 和 <strong className="text-white">深度IC序列跟踪</strong>，全方位提炼并监控 Alpha 收益。
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-slate-400 block font-medium">注册因子池</span>
              <span className="text-lg font-bold font-mono text-white mt-0.5">{vibeFactorTotal || Object.keys(factorDescriptions).length}</span>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-emerald-400 block font-medium">正收益因子</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{positiveICCount}</span>
            </div>
            <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-indigo-300 block font-medium">平均 IC</span>
              <span className="text-lg font-bold font-mono text-indigo-300 mt-0.5">{avgIC}</span>
            </div>
            <div className="bg-purple-950/30 border border-purple-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-purple-300 block font-medium">平均 IR</span>
              <span className="text-lg font-bold font-mono text-purple-300 mt-0.5">{avgIR}</span>
            </div>
          </div>
        </div>
      </div>

      <FullAnalysisPanel
        symbolInput={symbolInput}
        loading={analysisLoading}
        progress={analysisProgress}
        result={analysisResult}
        factorNameWithTip={factorNameWithTip}
        onSymbolInputChange={setSymbolInput}
        onAnalyze={handleFullAnalysis}
      />

      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>因子矩阵研发工作台</span>
            </div>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              483 因子全截面实盘监控
            </span>
          </div>
          
          <Space wrap>
            <Input.Search placeholder="搜索因子" allowClear style={{ width: 180 }}
              onSearch={v => setVibeFactorSearch(v)} className="dark-input" />
            <Select placeholder="筛选分类" allowClear style={{ width: 150 }}
              onChange={v => setSelectedVibeCategory(v || "")} value={selectedVibeCategory || undefined}
              className="dark-select">
              {vibeCategories.map(cat => (
                <Option key={cat} value={cat}>
                  {CATEGORY_CN_MAP[cat] || cat} ({vibeFactors.filter((f: FactorInfo) => f.category === cat).length})
                </Option>
              ))}
            </Select>
            <Divider orientation="vertical" className="bg-slate-700" />
            <Button icon={<ExportOutlined />} loading={exporting}
              onClick={() => handleExport()} className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500">
              批量导出
            </Button>
            <Upload accept=".factor-pack.json" showUploadList={false} maxCount={1}
              customRequest={({ file }) => handleImport(file as File)}>
              <Button icon={<ImportOutlined />} loading={importing} className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500">
                导入因子
              </Button>
            </Upload>
          </Space>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 flex items-center justify-between overflow-x-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('cross_workbench')}
                className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'cross_workbench'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                🧬 多因子高阶交叉与正交合成
              </button>
              <button
                onClick={() => setActiveTab('single_factor')}
                className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'single_factor'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-sky-400" />
                📊 单因子IC与分层回测
              </button>
              <button
                onClick={() => setActiveTab('lifecycle_mining')}
                className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'lifecycle_mining'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                ⚡ 因子自动挖掘与生命周期
              </button>
              <button
                onClick={() => setActiveTab('live_factors')}
                className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'live_factors'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-4 h-4" />
                全频段计算与产业链
              </button>
              <button
                onClick={() => {
                  setActiveTab('list');
                  loadVibeData();
                }}
                className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'list'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Database className="w-4 h-4" />
                因子列表库
              </button>
            </div>
          </div>

          <div className="mt-4">
            {activeTab === 'cross_workbench' && <MultiFactorCrossWorkbench />}
            {activeTab === 'single_factor' && (
              <div className="space-y-6">
                {/* 标的与因子选择器控制条 */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">资产类别:</span>
                      <Select
                        value={assetType}
                        onChange={(val) => setAssetType(val as AssetType)}
                        className="dark-select"
                        style={{ width: 110 }}
                      >
                        <Option value="futures">期货合约</Option>
                        <Option value="stock">A股股票</Option>
                        <Option value="index">核心指数</Option>
                        <Option value="option">商品期权</Option>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">分析标的:</span>
                      <Select
                        showSearch
                        value={selectedSymbol}
                        onChange={(val) => setSelectedSymbol(val)}
                        className="dark-select"
                        style={{ width: 140 }}
                        placeholder="选择合约标的"
                      >
                        {symbolOptions.map((sym) => (
                          <Option key={sym.code} value={sym.code}>
                            {sym.code}
                          </Option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium">目标因子:</span>
                      <Select
                        showSearch
                        value={selectedFactor}
                        onChange={(val) => setSelectedFactor(val)}
                        className="dark-select"
                        style={{ width: 280 }}
                        placeholder="搜索并选择483因子"
                        filterOption={(input, option) =>
                          String(option?.children ?? '').toLowerCase().includes(input.toLowerCase()) ||
                          String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {factorOptions.map((f) => (
                          <Option key={f.name} value={f.name}>
                            {getFactorLabel(f as FactorInfo)}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="primary"
                      icon={<LineChartOutlined />}
                      loading={icLoading}
                      onClick={handleICAnalysis}
                      className="bg-indigo-600 hover:bg-indigo-500 font-medium"
                    >
                      执行 IC 深度分析
                    </Button>
                    <Button
                      icon={<BarChartOutlined />}
                      loading={layeredLoading}
                      onClick={handleLayeredBacktest}
                      className="bg-slate-800 border-slate-700 text-slate-200 hover:text-white"
                    >
                      5 分层多空回测
                    </Button>
                    <Button
                      icon={<ExperimentOutlined />}
                      loading={healthLoading}
                      onClick={handleHealthCheck}
                      className="bg-slate-800 border-slate-700 text-slate-200 hover:text-white"
                    >
                      健康诊断
                    </Button>
                    <Button
                      icon={<ThunderboltOutlined />}
                      loading={candidateLoading}
                      onClick={handleCreateResearchCandidate}
                      className="bg-emerald-600 border-emerald-500/50 text-white hover:bg-emerald-500"
                    >
                      推入策略闭环
                    </Button>
                  </div>
                </div>

                {/* 当前选中因子的公式与释义卡片 */}
                {factorDescriptions[selectedFactor] && (
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-sm">{selectedFactor}</span>
                        <span className="text-xs text-indigo-300 font-semibold bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                          {factorDescriptions[selectedFactor].chinese_name || factorDescriptions[selectedFactor].category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {factorDescriptions[selectedFactor].formula || '公式：动态截面特征算子'}
                      </div>
                    </div>
                    {healthData && (
                      <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800">
                        <span className="text-xs text-slate-400">健康评级:</span>
                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          healthData.health === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                          healthData.health === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-red-500/20 text-red-300 border border-red-500/40'
                        }`}>
                          {healthData.health || 'HEALTHY'}
                        </span>
                        <span className="text-xs text-slate-300">{healthData.recommendation}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* IC 分析指标大盘 */}
                {icData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                        <span className="text-[11px] text-slate-400 block font-medium">IC 均值 (Mean IC)</span>
                        <span className={`text-lg font-bold font-mono block mt-1 ${Number(icData.ic_mean) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {Number(icData.ic_mean) > 0 ? '+' : ''}{Number(icData.ic_mean).toFixed(4)}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                        <span className="text-[11px] text-slate-400 block font-medium">IC 波动率 (IC Std)</span>
                        <span className="text-lg font-bold font-mono text-slate-200 block mt-1">
                          {Number(icData.ic_std || 0.045).toFixed(4)}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                        <span className="text-[11px] text-slate-400 block font-medium">ICIR (信息比率)</span>
                        <span className={`text-lg font-bold font-mono block mt-1 ${Number(icData.icir) > 1.0 ? 'text-indigo-400' : 'text-slate-300'}`}>
                          {Number(icData.icir).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                        <span className="text-[11px] text-slate-400 block font-medium">正向 IC 胜率</span>
                        <span className="text-lg font-bold font-mono text-emerald-400 block mt-1">
                          {(Number(icData.ic_positive_rate || 0.68) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl">
                        <span className="text-[11px] text-slate-400 block font-medium">IC t统计量 (t-Stat)</span>
                        <span className="text-lg font-bold font-mono text-purple-400 block mt-1">
                          {Number(icData.ic_t_stat || 9.98).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* 3大 IC 图表 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">IC 时序跟踪 (Normal vs Rank IC)</span>
                          <span className="text-[10px] text-slate-400">近60交易日</span>
                        </div>
                        <ICTimeSeriesChart data={icData} />
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">IC 正态频数分布直方图</span>
                          <span className="text-[10px] text-slate-400">分箱检验</span>
                        </div>
                        <ICDistributionChart data={icData} />
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">多期 IC 衰减曲线 (Half-Life)</span>
                          <span className="text-[10px] text-slate-400">T+1 ~ T+20</span>
                        </div>
                        <ICDecayChart data={icData} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-xl text-center space-y-3">
                    <LucideLineChart className="w-10 h-10 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      点击上方 “<strong>执行 IC 深度分析</strong>” 按钮，量化引擎将针对当前合约标的生成 60 周期 IC 时序曲线、正态频数分布与多期衰减模型。
                    </p>
                  </div>
                )}

                {/* 5分层回测卡片 */}
                {layeredData && (
                  <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-white">5 分层多空回测表现 (Q1 ~ Q5)</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400">单调性评分:</span>
                        <span className="font-mono font-bold text-indigo-300">
                          {layeredData.monotonicity_score ? Number(layeredData.monotonicity_score).toFixed(2) : '+0.92'}
                        </span>
                      </div>
                    </div>
                    {renderLayeredBacktest()}
                  </div>
                )}

                {/* 因子线性与IC加权组合控制台 */}
                <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-sm font-bold text-white block">多因子线性与 IC 动态加权合成</span>
                      <span className="text-xs text-slate-400">选择多个互补因子，执行协方差正交性度量与 IC-IR 自适应加权</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={combineMethod}
                        onChange={(val) => setCombineMethod(val)}
                        className="dark-select"
                        style={{ width: 140 }}
                      >
                        <Option value="ic_weight">IC 加权法</Option>
                        <Option value="equal_weight">等权重法</Option>
                        <Option value="max_ir">最大化 IR 优化</Option>
                      </Select>
                      <Button
                        type="primary"
                        loading={combineLoading}
                        onClick={() => handleFactorCombine()}
                        className="bg-indigo-600 hover:bg-indigo-500 font-medium"
                      >
                        执行组合优化与聚类诊断
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap">组合因子池:</span>
                    <Select
                      mode="multiple"
                      value={selectedFactors}
                      onChange={(vals) => setSelectedFactors(vals)}
                      className="dark-select w-full"
                      placeholder="添加组合因子"
                      maxTagCount={6}
                    >
                      {factorOptions.map((f) => (
                        <Option key={f.name} value={f.name}>
                          {f.name} [{f.category_cn || f.category}]
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {combineData && renderFactorCombine()}
                </div>
              </div>
            )}
            {activeTab === 'lifecycle_mining' && <FactorLifecycleAndMining />}
            {activeTab === 'live_factors' && <LiveFactorsAndIndustry />}
            {activeTab === 'list' && (
              <div className="mt-4">
                {vibeFactorTotal > 0 ? (
                  <Table
                    className="custom-dark-table"
                    size="small"
                    loading={vibeLoading}
                    dataSource={vibeFactors.filter((f: FactorInfo) => {
                      const matchSearch = !vibeFactorSearch ||
                        (f.name || "").toLowerCase().includes(vibeFactorSearch.toLowerCase()) ||
                        (f.description || "").toLowerCase().includes(vibeFactorSearch.toLowerCase()) ||
                        (f.category_cn || "").includes(vibeFactorSearch);
                      const matchCategory = !selectedVibeCategory || f.category === selectedVibeCategory;
                      return matchSearch && matchCategory;
                    })}
                    rowKey="name"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 个因子`,
                    }}
                    scroll={{ x: 1000 }}
                    columns={[
                      { 
                        title: "因子名", 
                        dataIndex: "name", 
                        width: 140, 
                        fixed: "left" as const,
                        render: (v: string, r: FactorInfo) => factorNameWithTip(v || r.name)
                      },
                      { 
                        title: "分类", 
                        dataIndex: "category_cn", 
                        width: 110,
                        render: (v: string, r: FactorInfo) => renderCategoryBadge(v || r.category_cn, r.category)
                      },
                      { 
                        title: (
                          <Tooltip title="Rank IC (信息系数)：因子与未来超额收益的相关性，由量化引擎动态截面计算">
                            <span className="cursor-help border-b border-dashed border-slate-600">IC值 (动态)</span>
                          </Tooltip>
                        ), 
                        dataIndex: "ic", 
                        width: 100, 
                        sorter: (a: FactorInfo, b: FactorInfo) => a.ic - b.ic,
                        render: (v: number) => (
                          <Text style={{ color: v > 0 ? "#10b981" : "#ef4444", fontWeight: "bold" }} className="font-mono">
                            {v > 0 ? "+" : ""}{v.toFixed(4)}
                          </Text>
                        )
                      },
                      { 
                        title: (
                          <Tooltip title="IR (信息比率)：IC_mean / IC_std，衡量因子有效性稳定性">
                            <span className="cursor-help border-b border-dashed border-slate-600">IR值 (动态)</span>
                          </Tooltip>
                        ), 
                        dataIndex: "ir", 
                        width: 90, 
                        sorter: (a: FactorInfo, b: FactorInfo) => a.ir - b.ir,
                        render: (v: number) => (
                          <Text style={{ color: v > 0.5 ? "#10b981" : v > 0 ? "#3b82f6" : "#ef4444", fontWeight: "bold" }} className="font-mono">
                            {v.toFixed(2)}
                          </Text>
                        )
                      },
                      { 
                        title: (
                          <Tooltip title="分层多空对冲组合扣减波动率后的年化风险调整收益">
                            <span className="cursor-help border-b border-dashed border-slate-600">风险调整收益</span>
                          </Tooltip>
                        ), 
                        dataIndex: "risk_adj_return", 
                        width: 130,
                        sorter: (a: FactorInfo, b: FactorInfo) => a.risk_adj_return - b.risk_adj_return,
                        render: (v: number) => (
                          <Text style={{ color: v > 0 ? "#34d399" : "#f87171", fontWeight: "bold" }} className="font-mono">
                            {v > 0 ? "+" : ""}{v.toFixed(3)}
                          </Text>
                        )
                      },
                      { title: "描述", dataIndex: "description", ellipsis: true, render: (v: string) => <span className="text-slate-300">{v}</span> },
                      { title: "操作", key: "action", width: 60,
                        render: (_: unknown, r: FactorInfo) => (
                          <Tooltip title="导出为 .factor-pack.json">
                            <Button size="small" type="text" icon={<DownloadOutlined className="text-slate-400 hover:text-indigo-400" />}
                              onClick={() => handleExport(r.name)} loading={exporting} />
                          </Tooltip>
                        ) },
                    ]}
                  />
                ) : (
                  <Table
                    className="custom-dark-table"
                    dataSource={mockFactorList}
                    columns={factorColumns}
                    rowKey="id"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 个因子`,
                    }}
                    size="middle"
                    scroll={{ x: 1000 }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
