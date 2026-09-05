import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// 交易策略中心跨系统统一反向代理客户端
// 参考《交易策略中心跨系统模块集成指南》

const client = axios.create({
  baseURL: "/api/v1", // 生产环境中可通过 nginx 代理到后端 FastAPI
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      // window.location.assign("/login");
    }
    return Promise.reject(
      new Error(error.response?.data?.detail ?? error.message),
    );
  },
);

// -------------------------------------------------------------
// 【策略库 (Strategy Library)】集成 API
// -------------------------------------------------------------
export const strategyIntegration = {
  groupedCatalog: () => client.get("/strategies/catalog/grouped"),
  catalog: (params?: { regime?: string; strategy_type?: string; symbol?: string; top_k?: number; }) =>
    client.get("/strategies/catalog", { params }),
  detail: (name: string) => client.get(`/strategies/${encodeURIComponent(name)}`),
  compute: (payload: { symbol: string; timeframe?: string; strategy_names?: string[]; }) =>
    client.post("/strategies/compute", payload),
  quickBacktest: (params: { strategy_name: string; symbol: string; limit?: number; commission_pct?: number; }) =>
    client.get("/backtest/quick", { params }),
};

// -------------------------------------------------------------
// 【因子库 (Factor Store)】集成 API
// -------------------------------------------------------------
export const factorIntegration = {
  list: (params?: { category?: string }) => client.get("/factor/factors/list", { params }),
  descriptions: () => client.get("/factor/factors/descriptions"),
  fullAnalysis: (symbol: string, topN = 20, nQuantiles = 5) =>
    client.post("/factor/full-analysis", { symbol, top_n: topN, n_quantiles: nQuantiles }, { timeout: 120_000 }),
};

// -------------------------------------------------------------
// 【交易信号 (Signals)】集成 API
// -------------------------------------------------------------
export interface SignalQuery {
  limit?: number;
}
export const signalIntegration = {
  list: async (params: SignalQuery = { limit: 100 }) => {
    const response = await client.get("/alerts", { params });
    // 强制过滤星级 >= 4 且置信度 >= 60%
    return {
      ...response.data,
      signals: response.data.signals.filter(
        (signal: { star_rating: number; confidence: number }) =>
          signal.star_rating >= 4 && signal.confidence >= 0.6,
      ),
    };
  },
  detail: (id: string) => client.get(`/alerts/${encodeURIComponent(id)}`),
  refresh: () => client.post("/alerts/refresh", {}, { timeout: 120_000 }),
  quality: () => client.get("/alerts/quality-summary"),
};

// -------------------------------------------------------------
// 【宏观新闻 (Macro News)】集成 API
// -------------------------------------------------------------
export const macroNewsIntegration = {
  dashboard: () => client.get("/macro-news/dashboard", { timeout: 60_000 }),
  news: (limit = 30, product?: string) => client.get("/macro-news/news", { params: { limit, product } }),
  refreshNews: () => client.post("/macro-news/refresh"),
  briefing: () => client.get("/briefing/"),
  generateBriefing: () => client.post("/macro-news/briefing/generate"),
};

// -------------------------------------------------------------
// 【LLM 配置与大语言模型任务 (LLM Configuration & AI Tasks)】集成 API
// -------------------------------------------------------------
export const llmIntegration = {
  providers: () => client.get("/llm/providers"),
  createProvider: (payload: {
    name: string;
    provider_type?: string;
    api_url?: string;
    api_key?: string;
    model?: string;
    available_models?: string[];
    is_active?: boolean;
  }) => client.post("/llm/providers", payload),
  editable: (id: string) =>
    client.get(`/llm/providers/${encodeURIComponent(id)}/edit`),
  update: (
    id: string,
    payload: {
      name?: string;
      provider_type?: string;
      api_url?: string;
      api_key?: string;
      model?: string;
      available_models?: string[];
      is_active?: boolean;
    },
  ) => client.put(`/llm/providers/${encodeURIComponent(id)}`, payload),
  deleteProvider: (id: string) =>
    client.delete(`/llm/providers/${encodeURIComponent(id)}`),
  activate: (id: string) =>
    client.post(`/llm/providers/${encodeURIComponent(id)}/activate`),
  test: (id: string, payload: { prompt?: string }) =>
    client.post(`/llm/providers/${encodeURIComponent(id)}/test`, payload, {
      timeout: 90_000,
    }),
  discoverModels: (payload: { provider_type?: string; api_url?: string; api_key?: string; model?: string }) =>
    client.post("/llm/providers/models", payload),
  useCases: () => client.get("/llm/use-cases"),
  setDefaultUseCase: (use_case: string, payload: { provider_id: string; model?: string }) =>
    client.put(`/llm/use-cases/${encodeURIComponent(use_case)}/default`, payload),
  runTask: (payload: { task_type: string; symbol?: string; prompt?: string; provider_id?: string; model?: string }) =>
    client.post("/llm/tasks/run", payload, { timeout: 90_000 }),
};

// -------------------------------------------------------------
// 【实时盘口与现货升贴水 (Realtime Quotes & Spot Basis)】集成 API
// -------------------------------------------------------------
export interface SpotBasisData {
  spotPrice: number;
  spotName: string;
  spotDate: string;
  futuresPrice: number;
  basis: number;
  basisRate: number;
  basisType: 'SPOT_PREMIUM' | 'FUTURES_PREMIUM' | 'PARITY';
  basisTypeName: string;
  marketImplication: string;
}

export interface DynamicPlanData {
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  takeProfitT2Price: number;
  stopLossDistance: number;
  stopLossPct: number;
  takeProfitDistance: number;
  takeProfitPct: number;
  riskRewardRatio: string;
  recommendedPositionPct: number;
  mode: 'REALTIME_DYNAMIC' | 'SIGNAL_BASE';
}

export interface RealtimeQuoteItem {
  symbol: string;
  name: string;
  product: string;
  latestPrice: number;
  bidPrice: number;
  askPrice: number;
  bidVolume: number;
  askVolume: number;
  open: number;
  high: number;
  low: number;
  preClose: number;
  change: number;
  changePct: number;
  volume: number;
  openInterest: number;
  tradingDate: string;
  quoteTime: string;
  updatedAt: string;
  source: 'SINA_LIVE' | 'DB_FALLBACK';
  spotBasis: SpotBasisData;
  dynamicPlan: {
    buyPlan: DynamicPlanData;
    sellPlan: DynamicPlanData;
  };
}

export const realtimeDataIntegration = {
  getQuotes: async (symbols?: string[]): Promise<Record<string, RealtimeQuoteItem>> => {
    try {
      const params = symbols && symbols.length > 0 ? { symbols: symbols.join(',') } : undefined;
      const res = await client.get('/data/realtime-quotes', { params, timeout: 6000 });
      return res.data?.data || {};
    } catch (e: any) {
      return {};
    }
  },
  getQuote: async (symbol: string): Promise<RealtimeQuoteItem | null> => {
    try {
      const res = await client.get(`/data/realtime-quote/${encodeURIComponent(symbol)}`, { timeout: 6000 });
      return res.data?.data || null;
    } catch (e: any) {
      return null;
    }
  }
};

export default client;

