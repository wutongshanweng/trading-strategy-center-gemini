/** FactorResearch 页面共享类型定义 */

export interface FactorInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  ic: number;
  ir: number;
}

export interface ICTimeSeriesStatistics {
  mean: number;
  std: number;
  ir: number;
  positive_ratio: number;
}

export interface ICTimeSeriesData {
  dates: string[];
  values: number[];
  statistics: ICTimeSeriesStatistics;
}

export interface ICResult {
  success?: boolean;
  factor_id: string;
  symbol?: string;
  ic_time_series?: ICTimeSeriesData;
  ic_distribution?: { range: string; count: number }[];
  ic_decay?: { period: number; ic: number }[];
  [key: string]: unknown;
}

export interface LayerSummary {
  quantile: string;
  mean_return: number;
  count: number;
}

export interface LongShort {
  mean_return: number;
  sharpe: number;
  win_rate: number;
}

export interface LayeredResult {
  factor_id: string;
  layer_summary: LayerSummary[];
  long_short: LongShort;
  turnover: { daily_turnover: number; weekly_turnover: number; monthly_turnover: number };
  [key: string]: unknown;
}

export interface CombineResult {
  combined_ic: number;
  weights: { factor_id: string; weight: number }[];
  correlation_matrix: { correlation: number }[][];
  combined_performance: {
    mean_return?: number;
    sharpe?: number;
    max_drawdown?: number;
    ic?: number;
    ir?: number;
    diversification_ratio?: number;
  };
  dendrogram?: any;
  clusters?: any[];
  pruned_factors?: string[];
  retained_factors?: string[];
  redundancy_pairs?: any[];
  collinearity_stats?: any;
  [key: string]: unknown;
}

export interface MineResult {
  count: number;
  data_source: string;
  factors: { name: string; expression: string; fitness: number; ic: number; formula?: string; complexity?: number }[];
  generation: number;
  [key: string]: unknown;
}

export interface HealthResult {
  factor_id: string;
  health_score: number;
  issues: string[];
  recommendations: string[];
  [key: string]: unknown;
}

export interface ReportResult {
  summary: string;
  top_factors: {
    id?: string;
    rank?: number;
    name?: string;
    ic?: number;
    ir?: number;
    ic_mean?: number;
    icir?: number;
    sharpe_q5q1?: number;
    turnover?: number;
    health?: string;
    is_recommended?: boolean;
  }[];
  details: string;
  total_factors?: number;
  healthy_count?: number;
  warning_count?: number;
  decayed_count?: number;
  recommended?: string[];
  recommended_ic?: number;
  recommended_icir?: number;
  high_correlation_pairs?: [string, string, number][];
  [key: string]: unknown;
}

export interface AnalysisResultTopFactor {
  rank: number;
  id: string;
  name: string;
  ic: number;
  direction: string;
  icir?: number;
  sharpe?: number;
  health?: number;
  recommended?: boolean;
  [key: string]: unknown;
}

export interface FullAnalysisResult {
  success?: boolean;
  data_points?: number;
  top_factors?: AnalysisResultTopFactor[];
  layered?: {
    factor?: string;
    quantiles?: { quantile: string | number; mean_return: number }[];
    long_short_return?: number;
    long_short_sharpe?: number;
  };
  advice?: { action: string; action_cn: string; reason: string; risk_note?: string; confidence: number; signal_value: number };
  ic_stats?: { mean?: number; positive_count?: number; total?: number };
  recommended?: string[];
  health_distribution?: { healthy?: number; warning?: number; decayed?: number };
  recommended_ic?: number;
  recommended_icir?: number;
  summary?: string;
  symbol?: string;
  [key: string]: unknown;
}

export interface VibeDatasource {
  name: string;
  status: string;
  records: number;
}

export interface SwarmStatus {
  running: boolean;
  generation: number;
  best_fitness: number;
}

export interface BacktestResult {
  symbol: string;
  strategy: string;
  total_return: number;
  sharpe: number;
  max_drawdown: number;
  trades: number;
  equity_curve: { date: string; value: number }[];
}

export interface ResearchResult {
  query: string;
  answer: string;
  sources: string[];
}
