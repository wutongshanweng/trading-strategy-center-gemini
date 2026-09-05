import client from "../api/client";
import registryData from "../data/quantRegistryData.json";

export interface ICAnalysisRequest {
  factor_id: string;
  symbol?: string;
  start_date?: string;
  end_date?: string;
  method?: string;
}

export interface LayeredBacktestRequest {
  factor_id: string;
  symbols?: string[];
  start_date?: string;
  end_date?: string;
  n_quantiles?: number;
}

export interface FactorCombineRequest {
  factor_ids: string[];
  symbols?: string[];
  method?: string;
  collinearity_threshold?: number;
}

export interface DendrogramTreeNode {
  id: string;
  name: string;
  distance: number;
  height: number;
  factor_count: number;
  ic?: number;
  ir?: number;
  category?: string;
  children?: [DendrogramTreeNode, DendrogramTreeNode];
  is_leaf: boolean;
}

export interface RedundancyPair {
  factor_a: string;
  factor_b: string;
  correlation: number;
  retained: string;
  pruned: string;
  reason: string;
}

export interface FactorClusterGroup {
  cluster_id: number;
  representative: string;
  members: string[];
  avg_internal_correlation: number;
}

export interface CollinearityStats {
  original_factor_count: number;
  retained_factor_count: number;
  pruned_factor_count: number;
  avg_corr_before: number;
  avg_corr_after: number;
  collinearity_reduction_pct: number;
  orthogonality_improvement: number;
}

export interface CacheStatsData {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxCapacity: number;
  totalComputed: number;
  estimatedMemoryKB: number;
  dailyKey: string;
}

export interface CombineResult {
  method: string;
  combined_factors: string[];
  weights: any;
  weights_map: Record<string, number>;
  correlation_matrix: Array<Array<{ row: string; col: string; correlation: number } | number>>;
  dendrogram?: DendrogramTreeNode;
  clusters?: FactorClusterGroup[];
  pruned_factors?: string[];
  retained_factors?: string[];
  redundancy_pairs?: RedundancyPair[];
  collinearity_stats?: CollinearityStats;
  combined_performance?: {
    ic: number;
    ir: number;
    sharpe: number;
    diversification_ratio: number;
  };
}

export interface MineRequest {
  symbol?: string;
  n_factors?: number;
  population_size?: number;
  generations?: number;
  days?: number;
}

export interface ReportRequest {
  symbols?: string[];
  factor_ids?: string[];
  top_n?: number;
}

export interface NeutralizeRequest {
  values: Record<string, number>;
  industries: Record<string, string>;
  method?: string;
}

export interface FullAnalysisRequest {
  symbol: string;
  top_n?: number;
  n_quantiles?: number;
}

export const factorApi = {
  // IC分析
  async icAnalysis(request: ICAnalysisRequest) {
    const response = await client.post("/factor/ic-analysis", request);
    return response.data;
  },

  async layeredBacktest(request: LayeredBacktestRequest) {
    const response = await client.post("/factor/layered-backtest", request);
    return response.data;
  },

  async factorCombine(request: FactorCombineRequest) {
    const response = await client.post("/factor/factor-combine", request);
    return response.data;
  },

  async listFactors(category?: string) {
    try {
      const params = category ? { category } : {};
      const response = await client.get("/factor/factors/list", { params });
      if (response.data?.factors?.length > 0) {
        return response.data;
      }
    } catch {
      // fallback below
    }
    const factors = (registryData.factors || []) as any[];
    const filtered = category ? factors.filter(f => f.category === category || f.category_cn === category) : factors;
    return {
      status: 'ok',
      total: filtered.length,
      factors: filtered
    };
  },

  async mine(request: MineRequest) {
    const response = await client.post("/factor/mine", request, { timeout: 120000 });
    return response.data;
  },

  async healthCheck(request: ICAnalysisRequest) {
    const response = await client.post("/factor/health-check", request);
    return response.data;
  },

  async report(request: ReportRequest) {
    const response = await client.post("/factor/report", request, { timeout: 60000 });
    return response.data;
  },

  async neutralize(request: NeutralizeRequest) {
    const response = await client.post("/factor/neutralize", request);
    return response.data;
  },

  async fullAnalysis(request: FullAnalysisRequest) {
    const response = await client.post("/factor/full-analysis", request, { timeout: 120000 });
    return response.data;
  },

  // ── 因子截面 LRU 缓存与分片加速 ──
  async getCacheStats(): Promise<{ status: string; data: CacheStatsData }> {
    const response = await client.get("/factor/cache/stats");
    return response.data;
  },

  async clearCache(): Promise<{ status: string; message: string; data: CacheStatsData }> {
    const response = await client.post("/factor/cache/clear");
    return response.data;
  },

  // ── 因子层次聚类与共线性树状图 ──
  async clusterDendrogram(factorIds: string[], collinearityThreshold: number = 0.65) {
    const response = await client.post("/factor/cluster-dendrogram", {
      factor_ids: factorIds,
      collinearity_threshold: collinearityThreshold,
    });
    return response.data;
  },

  async getFactorDescriptions() {
    try {
      const response = await client.get("/factor/factors/descriptions");
      if (response.data && Object.keys(response.data).length > 0) {
        return response.data;
      }
    } catch {
      // fallback below
    }
    const descMap: Record<string, any> = {};
    for (const f of registryData.factors || []) {
      descMap[f.name] = {
        name: f.name,
        chinese_name: (f as any).chinese_name || (f as any).category_cn || f.name,
        category: f.category,
        description: f.description,
        formula: (f as any).formula || ''
      };
    }
    return { descriptions: descMap };
  },

  // ── 因子导入/导出 (即插即用) ──
  async exportFactors(factorNames: string[] = ["*"]) {
    const r = await client.post<{ factors: unknown[] }>("/factor/factors/export", { factor_names: factorNames });
    return r.data;
  },
  async importFactors(file: File) {
    const form = new FormData();
    form.append("file", file);
    const r = await client.post<{ imported: string[]; skipped: Array<{ name: string }>; failed: unknown[] }>("/factor/factors/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return r.data;
  },
};
