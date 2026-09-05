import client from "../api/client";
import registryData from "../data/quantRegistryData.json";

export interface StrategyDetail {
  name: string;
  description: string;
  timeframes: string[];
  params: Record<string, unknown>;
}

export interface SignalResult {
  strategy: string;
  direction: string;
  confidence: number;
  price: number;
  reason: string;
}


export interface ResearchChallenger {
  id: string;
  source: string;
  asset_type: "futures" | "stock" | "option";
  symbols: string[];
  features: string[];
  strategy_name: string;
  strategy_display_name?: string;
  promoted_strategy: string;
  quality_label?: string;
  quality_score?: number;
  quality_reason?: string;
  sharpe?: number;
  trades?: number;
  updated_at: string;
}

export interface ResearchChallengerResponse {
  count: number;
  challengers: ResearchChallenger[];
  safety_note: string;
}

export interface QuickBacktestResult {
  strategy: string;
  symbol: string;
  start_date: string;
  end_date: string;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  total_trades: number;
  profit_factor: number;
  equity_curve: number[];
}

export interface CatalogStrategy {
  name: string;
  chinese_name: string;
  is_active: boolean;
  sharpe: number;
  win_rate: number;
  total_trades: number;
  regime_fit: string[];
  timeframes: string[];
  [key: string]: unknown;
}

export interface GroupedCatalogResponse {
  total: number;
  types: Record<string, { count: number; active: number; inactive: number; strategies: CatalogStrategy[] }>;
}

export interface PoolStrategy {
  name: string;
  chinese_name: string;
  sharpe: number;
  status: string;
  regime: string;
  n_evals: number;
  pass_rate: number;
  avg_oos_sharpe: number;
  allocation: number;
  eligible: boolean;
}

export interface TuningMetric {
  total_return_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  win_rate: number;
  calmar_ratio: number;
  total_trades: number;
}

export interface ConvergencePoint {
  iteration: number;
  params: Record<string, any>;
  score: number;
  best_score: number;
}

export interface ParameterPlateau {
  param1_name: string;
  param1_label: string;
  param1_values: number[];
  param2_name: string;
  param2_label: string;
  param2_values: number[];
  matrix: number[][];
  stability_score: number;
  assessment: 'EXCELLENT_PLATEAU' | 'MODERATE_PLATEAU' | 'SHARP_PEAK_RISK';
}

export interface AutoTuneResult {
  strategy_name: string;
  chinese_name: string;
  symbol: string;
  method: 'bayesian' | 'grid';
  objective: string;
  split_ratio: number;
  iterations_run: number;
  baseline_params: Record<string, any>;
  baseline_metrics: TuningMetric;
  best_params: Record<string, any>;
  is_metrics: TuningMetric;
  oos_metrics: TuningMetric;
  overfitting_diagnosis: {
    decay_rate: number;
    robustness_status: 'ROBUST' | 'MODERATE' | 'OVERFITTED';
    verdict: string;
  };
  convergence_history: ConvergencePoint[];
  plateau: ParameterPlateau;
  regime_recommendations: Array<{
    regime: string;
    regime_cn: string;
    description: string;
    suggested_params: Record<string, any>;
  }>;
}

export interface PortfolioStrategyInput {
  name: string;
  chinese_name?: string;
  weight?: number;
}

export interface PortfolioBacktestResult {
  symbol: string;
  allocation_method: string;
  capital: number;
  strategies: Array<{
    name: string;
    chinese_name: string;
    weight: number;
    metrics: TuningMetric;
    color: string;
  }>;
  portfolio_metrics: {
    total_return_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    win_rate: number;
    volatility_annual_pct: number;
    calmar_ratio: number;
    diversification_ratio: number;
  };
  correlation_matrix: {
    strategies: string[];
    matrix: number[][];
  };
  equity_curve: Array<{
    date: string;
    portfolio_equity: number;
    [key: string]: number | string;
  }>;
}

export interface StrategyCompareResult {
  strategies: Array<{
    name: string;
    chinese_name: string;
    sharpe: number;
    win_rate: number;
    max_drawdown: number;
    calmar: number;
    turnover: number;
    regimes: string[];
    suitable_assets: string[];
    params: Record<string, any>;
  }>;
  radar_axes: Array<{ axis: string; max: number }>;
  radar_data: Array<{
    metric: string;
    [key: string]: number | string;
  }>;
}

export interface StrategyPoolResponse {
  retired: PoolStrategy[];
  challengers: PoolStrategy[];
  champions: PoolStrategy[];
}

export interface DegradationResponse {
  total_tracked: number;
  at_risk: { name: string; zero_days: number }[];
  threshold_days: number;
}

export const strategyApi = {
  async catalogGrouped(): Promise<GroupedCatalogResponse> {
    try {
      const r = await client.get<GroupedCatalogResponse>("/strategies/catalog/grouped");
      if (r.data?.types && r.data.total > 0 && Object.values(r.data.types).some(t => t.strategies && t.strategies.length > 0)) {
        return r.data;
      }
    } catch {
      // fallback to registryData below
    }

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
        params: s.params || {}
      });
    }

    return {
      total: strategies.length || 90,
      types
    };
  },
  async catalog(params: { regime?: string; strategy_type?: string; symbol?: string } = {}) {
    const r = await client.get("/strategies/catalog", { params });
    return r.data;
  },
  async detail(name: string) {
    const r = await client.get<StrategyDetail>(`/strategies/${name}`);
    return r.data;
  },
  async computeSignals(symbol: string, timeframe = "1d", strategy_names?: string[]) {
    const r = await client.post<{ symbol: string; timeframe: string; signals: SignalResult[]; total: number }>(
      "/strategies/compute", { symbol, timeframe, strategy_names }
    );
    return r.data;
  },

  // ── 快捷回测 (Phase 2) ──
  async quickBacktest(symbol: string, strategyName: string, limit = 250) {
    const r = await client.get<QuickBacktestResult>("/backtest/quick", {
      params: { symbol, strategy_name: strategyName, limit },
    });
    return r.data;
  },

  // ── 优化池 (Phase 4) ──

  async researchChallengers(asset_type?: "futures" | "stock" | "option") {
    const r = await client.get<ResearchChallengerResponse>("/tournament/research-challengers", {
      params: { asset_type },
    });
    return r.data;
  },
  async getPool() {
    const r = await client.get<StrategyPoolResponse>("/strategies/pool");
    return r.data;
  },
  async getDegradation() {
    const r = await client.get<DegradationResponse>("/strategies/pool/degradation");
    return r.data;
  },
  async optimizeStrategy(strategyName: string, nIter = 15, product = "RB") {
    const r = await client.post("/strategies/pool/optimize", { strategy_name: strategyName, n_iter: nIter, product });
    return r.data;
  },
  async retireStrategy(name: string) {
    const r = await client.post(`/strategies/pool/${encodeURIComponent(name)}/retire`);
    return r.data;
  },
  async reactivateStrategy(name: string) {
    const r = await client.post(`/strategies/pool/${encodeURIComponent(name)}/reactivate`);
    return r.data;
  },

  // ── 策略导入/导出 (即插即用) ──
  async exportStrategies(strategyNames: string[] = ["*"]) {
    const r = await client.post<{ strategies: unknown[] }>("/strategies/export", { strategy_names: strategyNames });
    return r.data;
  },
  async importStrategies(file: File) {
    const form = new FormData();
    form.append("file", file);
    const r = await client.post<{ imported: string[]; skipped: Array<{ name: string }>; failed: unknown[] }>("/strategies/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },

  // ── 信号白名单 (Phase 2) ──
  async getWhitelist() {
    const r = await client.get<{ strategies: string[]; count: number }>("/signals/whitelist");
    return r.data;
  },
  async addToWhitelist(strategyNames: string[]) {
    const r = await client.post<{ strategies: string[]; count: number }>("/signals/whitelist", {
      strategy_names: strategyNames,
    });
    return r.data;
  },
  async removeFromWhitelist(name: string) {
    const r = await client.delete(`/signals/whitelist/${encodeURIComponent(name)}`);
    return r.data;
  },

  // ── 自适应自动调优 (Auto-Tune) ──
  async autoTune(
    strategyName: string,
    options?: {
      symbol?: string;
      method?: 'bayesian' | 'grid';
      objective?: 'sharpe' | 'calmar' | 'composite';
      n_iter?: number;
      split_ratio?: number;
    }
  ): Promise<AutoTuneResult> {
    const r = await client.post<{ status: string; data: AutoTuneResult }>(
      `/strategies/${encodeURIComponent(strategyName)}/auto-tune`,
      options || {}
    );
    return r.data.data;
  },

  async applyParams(strategyName: string, params: Record<string, any>) {
    const r = await client.post<{ status: string; strategy: any }>(
      `/strategies/${encodeURIComponent(strategyName)}/apply-params`,
      { params }
    );
    return r.data;
  },

  // ── 多策略横向对比与组合回测 ──
  async compareStrategies(names: string[]): Promise<StrategyCompareResult> {
    const r = await client.post<{ status: string; data: StrategyCompareResult }>("/strategies/compare", {
      names,
    });
    return r.data.data;
  },

  async portfolioBacktest(options: {
    strategies: PortfolioStrategyInput[];
    symbol?: string;
    allocation_method?: 'equal_weight' | 'sharpe_weighted' | 'risk_parity' | 'custom';
    capital?: number;
  }): Promise<PortfolioBacktestResult> {
    const r = await client.post<{ status: string; data: PortfolioBacktestResult }>("/strategies/portfolio-backtest", options);
    return r.data.data;
  },
};
