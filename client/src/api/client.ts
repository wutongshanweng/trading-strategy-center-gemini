import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE = "/api/v1";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach auth token if available
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // localStorage may not be available (SSR)
  }
  return config;
});

// Response interceptor — unwrap errors, handle 401
client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: string; message?: string }>) => {
    // 401 → token 过期或无效，清除并跳转登录页
    if (err.response?.status === 401) {
      localStorage.removeItem("auth_token");
      // 避免登录页本身 401 时死循环
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      "Unknown error";
    return Promise.reject(new Error(msg));
  }
);

// ─── Health ───────────────────────────────────────────────────────
export const checkHealth = () => client.get("/health");

// ─── Strategy ─────────────────────────────────────────────────────
export interface Strategy {
  id: string;
  name: string;
  type: string;
  status: "active" | "paused" | "backtest" | "draft" | "champion" | "challenger" | "retired";
  signals: string[];
  created_at: string;
  updated_at: string;
  performance?: {
    sharpe: number;
    total_return: number;
    win_rate: number;
    max_drawdown: number;
  };
}

export const listStrategies = (params?: {
  status?: string;
  type?: string;
  page?: number;
  page_size?: number;
}) => client.get<{ strategies: Strategy[]; total: number }>("/strategies", { params });

export const getStrategy = (id: string) => client.get<Strategy>(`/strategies/${id}`);

export const createStrategy = (data: Partial<Strategy>) =>
  client.post<Strategy>("/strategies", data);

export const updateStrategy = (id: string, data: Partial<Strategy>) =>
  client.put<Strategy>(`/strategies/${id}`, data);

export const deleteStrategy = (id: string) => client.delete(`/strategies/${id}`);

// ─── Trading ──────────────────────────────────────────────────────
export interface Position {
  symbol: string;
  direction: "long" | "short";
  volume: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
  open_time: string;
}

export interface Order {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  price: number;
  volume: number;
  filled: number;
  status: "pending" | "filled" | "cancelled" | "rejected";
  created_at: string;
}

export const getPositions = () => client.get<Position[]>("/trading/positions");
export const getOrders = (params?: { status?: string }) =>
  client.get<Order[]>("/trading/orders", { params });
export const placeOrder = (data: {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  price?: number;
  volume: number;
}) => client.post<Order>("/trading/orders", data);
export const cancelOrder = (id: string) => client.delete(`/trading/orders/${id}`);

// ─── Backtest ─────────────────────────────────────────────────────
export interface BacktestResult {
  id: string;
  strategy_id: string;
  symbol: string;
  start_date: string;
  end_date: string;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  total_trades: number;
  equity_curve: { date: string; value: number }[];
}

export const runBacktest = (data: {
  strategy_id: string;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital?: number;
}) => client.post<BacktestResult>("/backtest/run", data);

export const getBacktestHistory = (strategy_id?: string) =>
  client.get<BacktestResult[]>("/backtest/results", {
    params: strategy_id ? { strategy_id } : undefined,
  });

// ─── Portfolio ────────────────────────────────────────────────────
export interface PortfolioSummary {
  total_value: number;
  cash: number;
  position_value: number;
  position_count: number;
  exposure_pct: number;
  weights: Record<string, number>;
  total_pnl: number;
  diversification: number;
  positions: Position[];
  allocation: { symbol: string; percent: number }[];
}

export const getPortfolio = () => client.get<PortfolioSummary>("/portfolio/stats");
export const rebalancePortfolio = (targets: { symbol: string; weight: number }[]) =>
  client.post("/portfolio/rebalance", { targets });

// ─── ML Models ────────────────────────────────────────────────────
export interface MLModel {
  id: string;
  name: string;
  type: string;
  status: "idle" | "training" | "ready" | "failed";
  accuracy: number | null;
  last_trained: string | null;
}

export interface MLModelsResponse {
  models: string[];
}

export interface MLTrainResponse {
  model: string;
  symbol: string;
  status: "trained";
  params: Record<string, unknown>;
}

export const listMLModels = () => client.get<MLModelsResponse>("/models");
export const trainModel = (name: string, data: { symbol: string; timeframe?: string; params?: Record<string, unknown> }) =>
  client.post<MLTrainResponse>(`/models/${encodeURIComponent(name)}/train`, data);

// ─── Market Data ──────────────────────────────────────────────────
export interface KlineRow {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  symbol: string;
  timeframe: string;
  quality_score: number;
  start: string;
  end: string;
  klines: KlineRow[];
  total: number;
}

export const getMarketData = (symbol: string, period = "1d", limit = 200) =>
  client.get<MarketData>("/data/kline", { params: { symbol, period, limit } });

export const getAvailableSymbols = () =>
  client.get<string[]>("/data/symbols");

// ─── Intelligence / LLM ──────────────────────────────────────────
export interface StrategyRecommendation {
  name: string;
  description: string;
  logic: string;
  expected_performance: string;
}

export const generateStrategy = (prompt: string) =>
  client.post<StrategyRecommendation>("/intelligence/generate-strategy", { prompt });

export const analyzeMarket = () =>
  client.get<{ analysis: string; signals: string[] }>("/intelligence/market-analysis");

// ─── Tournament ───────────────────────────────────────────────────
export interface TournamentEntry {
  rank: number;
  strategy_name: string;
  score: number;
  sharpe: number;
  total_return: number;
  trades: number;
}

export const getTournamentStandings = () =>
  client.get<TournamentEntry[]>("/tournament/standings");

export const runTournamentBacktest = (products?: string[]) =>
  client.post("/tournament/run-backtest", products ?? null, { timeout: 300000 });

export const promoteCandidates = (body?: { strategies?: string[]; products?: string[] }) =>
  client.post("/tournament/promote", body ?? {}, { timeout: 600000 });

export const getLifecycle = () =>
  client.get<{ champions: Record<string, unknown>[]; challengers: Record<string, unknown>[]; retired: Record<string, unknown>[] }>("/tournament/lifecycle");

export const graduateStrategy = (name: string, approved_by: string, allocation = 0.1) =>
  client.post("/tournament/graduate", { name, approved_by, allocation });

// ─── Intelligence Iteration Monitor ──────────────────────────────
export const getIterationOverview = () =>
  client.get("/intelligence/iteration/overview");

export const getParamVersions = (strategy?: string) =>
  client.get("/intelligence/iteration/param-versions", { params: strategy ? { strategy } : undefined });

export const getPromotionHistory = (limit = 20) =>
  client.get("/intelligence/iteration/promotion-history", { params: { limit } });

export const getRetrainHistory = (limit = 20) =>
  client.get("/intelligence/iteration/retrain-history", { params: { limit } });

export const runRetrainCycle = (body?: { strategies?: string[]; products?: string[]; param_n_iter?: number }) =>
  client.post("/intelligence/retrain/cycle", body ?? {}, { timeout: 600000 });

export const getAutomationConfig = () =>
  client.get("/intelligence/automation/config");

export const setAutomationConfig = (body: { enabled?: boolean; interval_hours?: number; param_n_iter?: number; top_n_for_param?: number }) =>
  client.post("/intelligence/automation/config", body);

export const runAutomationNow = () =>
  client.post("/intelligence/automation/run-now", {}, { timeout: 600000 });

export const listRealMLModels = () =>
  client.get<{ models: string[] }>("/models");

// ─── Evolve Engine ─────────────────────────────────────────────────
export const getEvolveStrategies = (top_k = 50) =>
  client.get("/evolve/strategies", { params: { top_k } });

export const getRegimeDetection = (params: { symbol: string; interval: string; limit: number }) =>
  client.get("/evolve/regime", { params });

export const getMemorySummary = (days = 90) =>
  client.get("/evolve/memory/summary", { params: { days } });

export const getMemoryRecent = (limit = 30) =>
  client.get("/evolve/memory/recent", { params: { limit } });

export const getEvolveReflectionStatus = () =>
  client.get("/evolve/reflection/status");

export const runEvolveReflection = () =>
  client.post("/evolve/reflection/run");

export const runQuickScore = (body: { symbol: string; interval: string; limit: number }) =>
  client.post("/evolve/quick-score", body);

export const runGridSearch = (body: { strategy_name: string; symbol: string; interval: string; max_variants?: number; method?: string }) =>
  client.post("/evolve/pipeline/grid", body, { timeout: 300000 });

// ─── Alpha Factors ────────────────────────────────────────────────
export const listAlphaFactors = () =>
  client.get<{ id: string; name: string; description: string }[]>("/alpha/factors");

// ─── Alert Signals ─────────────────────────────────────────────────
export interface AlertCacheStatus {
  stale: boolean;
  refreshing: boolean;
  last_refresh_error: string | null;
  ttl_seconds: number;
}

export interface AlertFreshnessSummary {
  stale_count: number;
  total_checked: number;
  message?: string;
}

export interface AlertFreshnessDetail {
  is_fresh?: boolean;
  last_date?: string | null;
  days_behind?: number | null;
  threshold?: number;
  last_datetime?: string | null;
  age_minutes?: number | null;
  threshold_minutes?: number;
  message?: string;
}

export interface AlertDataFreshness {
  D1?: AlertFreshnessDetail;
  M5?: AlertFreshnessDetail;
  [timeframe: string]: AlertFreshnessDetail | undefined;
}

export interface AlertSignal {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL" | "HOLD" | "WATCH";
  overall_score: number;
  signal_status: "active" | "blocked" | "pending";
  timestamp: string;
  agents?: Record<string, { score: number; direction: string; reasoning: string }>;
  mtf_matrix?: Record<string, string>;
  risk_score?: number;
  confidence?: number;
  strategy_family?: string;
  data_quality_status?: string;
  data_quality_score?: number;
  data_freshness?: AlertDataFreshness;
  data_quality_factors?: string[];
  data_quality_penalties?: string[];
  confidence_explain?: string;
  confidence_factors?: string[];
  confidence_penalties?: string[];
  entry_plan?: { entry_type: string; tp1: number; tp2: number; sl: number; holding_period: string };
}

export const getAlertSignals = (params?: { limit?: number }) =>
  client.get<{ signals: AlertSignal[]; count: number; updated_at?: string | null; cache_status?: AlertCacheStatus; data_freshness?: AlertFreshnessSummary }>("/alerts", { params });

export const getSignalFreshness = (product?: string) =>
  client.get("/alerts/freshness", { params: product ? { product } : undefined });

export const getSignalDetail = (id: string) =>
  client.get<AlertSignal>(`/alerts/${id}`);

// ─── Data Status ────────────────────────────────────────────────────
export interface DataStatus {
  status: "healthy" | "stale" | "unknown";
  fresh_symbols: string[];
  stale_symbols: string[];
  symbols: { symbol: string; status: "fresh" | "stale"; last_date: string }[];
}

export const getDataStatus = () =>
  client.get<DataStatus>("/data/status");

// ─── Health Diagnostics ─────────────────────────────────────────────
export interface HealthCheck {
  status: string;
  message: string;
  uptime: string;
  diagnostics?: {
    summary: string;
    all_ok: boolean;
    checks: Record<string, { status: string; value: string }>;
  };
}

export const getHealthDiagnostics = () =>
  client.get<HealthCheck>("/health/diagnostics");

export interface SystemOverviewComponent {
  status: string;
  items?: SystemOverviewDataItem[];
  stale_count?: number;
  total?: number;
  active_count?: number;
  high_quality_count?: number;
  blocked_count?: number;
  total_equity?: number;
  available_cash?: number;
  unrealized_pnl?: number;
  positions_count?: number;
  missing_quote_count?: number;
  provider_count?: number;
  active_provider_name?: string;
  active_model?: string;
  error?: string;
  [key: string]: unknown;
}

export interface SystemOverviewDataItem {
  asset_type: string;
  timeframe: string;
  latest: string;
  age_minutes: number | null;
  rows: number;
  status: string;
}

export interface SystemOverview {
  timestamp: string;
  status: string;
  score: number;
  summary: string;
  components: {
    data?: SystemOverviewComponent;
    signals?: SystemOverviewComponent;
    trading?: SystemOverviewComponent;
    llm?: SystemOverviewComponent;
    [key: string]: SystemOverviewComponent | undefined;
  };
  actions: string[];
}

export const getHealthOverview = () =>
  client.get<SystemOverview>("/health/overview");

// ─── Global Market Data ────────────────────────────────────────────
export interface MarketQuote {
  symbol: string; name: string; region: string; currency: string;
  price: number | null; change: number | null; change_pct: number | null; timestamp: string;
}
export const getMarketIndices = () =>
  client.get<{ items: MarketQuote[]; count: number }>("/market/indices");
export const getMarketForex = () =>
  client.get<{ items: MarketQuote[]; count: number }>("/market/forex");
export const getMarketBonds = () =>
  client.get<{ items: MarketQuote[]; count: number }>("/market/bonds");

export default client;
