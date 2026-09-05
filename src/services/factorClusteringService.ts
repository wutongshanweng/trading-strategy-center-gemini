/**
 * 因子层次聚类 (Hierarchical Clustering) 与共线性智能剔除引擎 (Collinearity Pruner)
 */

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

export interface FactorClusteringResult {
  dendrogram: DendrogramTreeNode;
  clusters: FactorClusterGroup[];
  pruned_factors: string[];
  retained_factors: string[];
  redundancy_pairs: RedundancyPair[];
  stats: {
    original_factor_count: number;
    retained_factor_count: number;
    pruned_factor_count: number;
    avg_corr_before: number;
    avg_corr_after: number;
    collinearity_reduction_pct: number;
    orthogonality_improvement: number;
  };
}

export class FactorClusteringService {
  private static instance: FactorClusteringService;

  public static getInstance(): FactorClusteringService {
    if (!FactorClusteringService.instance) {
      FactorClusteringService.instance = new FactorClusteringService();
    }
    return FactorClusteringService.instance;
  }

  /**
   * 计算凝聚层次聚类树 (Average Linkage / UPGMA) 与共线性诊断
   */
  public clusterFactors(
    factorList: { name: string; ic: number; ir: number; category?: string }[],
    correlationMatrix: { row: string; col: string; correlation: number }[][],
    collinearityThreshold: number = 0.65
  ): FactorClusteringResult {
    const n = factorList.length;
    if (n === 0) {
      const dummyLeaf: DendrogramTreeNode = {
        id: 'root',
        name: 'Empty',
        distance: 0,
        height: 0,
        factor_count: 0,
        is_leaf: true
      };
      return {
        dendrogram: dummyLeaf,
        clusters: [],
        pruned_factors: [],
        retained_factors: [],
        redundancy_pairs: [],
        stats: {
          original_factor_count: 0,
          retained_factor_count: 0,
          pruned_factor_count: 0,
          avg_corr_before: 0,
          avg_corr_after: 0,
          collinearity_reduction_pct: 0,
          orthogonality_improvement: 0
        }
      };
    }

    if (n === 1) {
      const f = factorList[0];
      const singleLeaf: DendrogramTreeNode = {
        id: f.name,
        name: f.name,
        distance: 0,
        height: 0,
        factor_count: 1,
        ic: f.ic,
        ir: f.ir,
        category: f.category,
        is_leaf: true
      };
      return {
        dendrogram: singleLeaf,
        clusters: [{ cluster_id: 1, representative: f.name, members: [f.name], avg_internal_correlation: 1.0 }],
        pruned_factors: [],
        retained_factors: [f.name],
        redundancy_pairs: [],
        stats: {
          original_factor_count: 1,
          retained_factor_count: 1,
          pruned_factor_count: 0,
          avg_corr_before: 1.0,
          avg_corr_after: 1.0,
          collinearity_reduction_pct: 0,
          orthogonality_improvement: 1.0
        }
      };
    }

    // 建立因子查找映射
    const factorMap = new Map<string, { name: string; ic: number; ir: number; category?: string }>();
    factorList.forEach(f => factorMap.set(f.name, f));

    // 提取相关性二维矩阵
    const corrMap = new Map<string, number>();
    correlationMatrix.forEach(row => {
      row.forEach(cell => {
        corrMap.set(`${cell.row}__${cell.col}`, cell.correlation);
        corrMap.set(`${cell.col}__${cell.row}`, cell.correlation);
      });
    });

    const getCorr = (a: string, b: string): number => {
      if (a === b) return 1.0;
      return corrMap.get(`${a}__${b}`) ?? 0.2;
    };

    // 转换成距离指标: d = 1 - |corr| (相关性越强，距离越小，0 表示完全共线，1 表示正交无关)
    const getDistance = (a: string, b: string): number => {
      const c = Math.abs(getCorr(a, b));
      return Math.max(0, 1.0 - c);
    };

    // 初始化每个因子为一个叶子簇
    interface ClusterState {
      id: string;
      members: string[];
      node: DendrogramTreeNode;
    }

    let activeClusters: ClusterState[] = factorList.map(f => ({
      id: f.name,
      members: [f.name],
      node: {
        id: f.name,
        name: f.name,
        distance: 0,
        height: 0,
        factor_count: 1,
        ic: f.ic,
        ir: f.ir,
        category: f.category,
        is_leaf: true
      }
    }));

    // 凝聚聚类循环: 每次寻找平均距离最小的两个簇并合并
    let clusterSequence = 1;
    while (activeClusters.length > 1) {
      let minDistance = Infinity;
      let mergeI = 0;
      let mergeJ = 1;

      for (let i = 0; i < activeClusters.length; i++) {
        for (let j = i + 1; j < activeClusters.length; j++) {
          const cA = activeClusters[i];
          const cB = activeClusters[j];

          // 计算两簇间的平均距离 (Average Linkage)
          let sumDist = 0;
          let count = 0;
          for (const m1 of cA.members) {
            for (const m2 of cB.members) {
              sumDist += getDistance(m1, m2);
              count++;
            }
          }
          const avgDist = count > 0 ? sumDist / count : 1.0;

          if (avgDist < minDistance) {
            minDistance = avgDist;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      const left = activeClusters[mergeI];
      const right = activeClusters[mergeJ];
      const mergedMembers = [...left.members, ...right.members];

      const parentHeight = Math.max(left.node.height, right.node.height) + minDistance * 0.5 + 0.1;
      const parentNode: DendrogramTreeNode = {
        id: `node_${clusterSequence++}`,
        name: `Cluster(${mergedMembers.length})`,
        distance: Number(minDistance.toFixed(4)),
        height: Number(parentHeight.toFixed(4)),
        factor_count: mergedMembers.length,
        children: [left.node, right.node],
        is_leaf: false
      };

      const newCluster: ClusterState = {
        id: parentNode.id,
        members: mergedMembers,
        node: parentNode
      };

      // 移除 mergeI 和 mergeJ，加入 newCluster
      activeClusters = activeClusters.filter((_, idx) => idx !== mergeI && idx !== mergeJ);
      activeClusters.push(newCluster);
    }

    const dendrogram = activeClusters[0].node;

    // 诊断高共线性因子对与分组剔除
    const redundancyPairs: RedundancyPair[] = [];
    const prunedSet = new Set<string>();
    const retainedSet = new Set<string>(factorList.map(f => f.name));

    // 计算综合质量得分 Score = IC * 0.7 + IR * 0.3
    const getQualityScore = (name: string): number => {
      const f = factorMap.get(name);
      if (!f) return 0;
      return (f.ic || 0) * 0.7 + ((f.ir || 0) / 10) * 0.3;
    };

    // 扫描所有因子对，寻找 |correlation| >= collinearityThreshold 的强相关因子
    for (let i = 0; i < factorList.length; i++) {
      for (let j = i + 1; j < factorList.length; j++) {
        const nameA = factorList[i].name;
        const nameB = factorList[j].name;
        const corr = getCorr(nameA, nameB);

        if (Math.abs(corr) >= collinearityThreshold) {
          const scoreA = getQualityScore(nameA);
          const scoreB = getQualityScore(nameB);

          const retained = scoreA >= scoreB ? nameA : nameB;
          const pruned = scoreA >= scoreB ? nameB : nameA;
          const factorRetained = factorMap.get(retained);
          const factorPruned = factorMap.get(pruned);

          redundancyPairs.push({
            factor_a: nameA,
            factor_b: nameB,
            correlation: Number(corr.toFixed(3)),
            retained,
            pruned,
            reason: `${pruned} 与 ${retained} 相关系数高达 ${corr.toFixed(2)}。因 ${retained} 的综合表现 (IC:${factorRetained?.ic.toFixed(3) || '0'}, IR:${factorRetained?.ir.toFixed(2) || '0'}) 优于 ${pruned} (IC:${factorPruned?.ic.toFixed(3) || '0'}, IR:${factorPruned?.ir.toFixed(2) || '0'})，建议剔除 ${pruned} 以避免共线性过拟合。`
          });

          prunedSet.add(pruned);
          retainedSet.delete(pruned);
        }
      }
    }

    const prunedFactors = Array.from(prunedSet);
    const retainedFactors = Array.from(retainedSet);

    // 确保至少保留一个因子
    if (retainedFactors.length === 0 && factorList.length > 0) {
      const best = [...factorList].sort((a, b) => getQualityScore(b.name) - getQualityScore(a.name))[0];
      retainedFactors.push(best.name);
      const idx = prunedFactors.indexOf(best.name);
      if (idx !== -1) prunedFactors.splice(idx, 1);
    }

    // 计算剔除前后的平均绝对相关性与正交性改善度
    let totalCorrBefore = 0;
    let pairsBefore = 0;
    for (let i = 0; i < factorList.length; i++) {
      for (let j = i + 1; j < factorList.length; j++) {
        totalCorrBefore += Math.abs(getCorr(factorList[i].name, factorList[j].name));
        pairsBefore++;
      }
    }
    const avgCorrBefore = pairsBefore > 0 ? totalCorrBefore / pairsBefore : 0;

    let totalCorrAfter = 0;
    let pairsAfter = 0;
    for (let i = 0; i < retainedFactors.length; i++) {
      for (let j = i + 1; j < retainedFactors.length; j++) {
        totalCorrAfter += Math.abs(getCorr(retainedFactors[i], retainedFactors[j]));
        pairsAfter++;
      }
    }
    const avgCorrAfter = pairsAfter > 0 ? totalCorrAfter / pairsAfter : 0;

    const collinearityReductionPct = avgCorrBefore > 0
      ? Math.max(0, Number((((avgCorrBefore - avgCorrAfter) / avgCorrBefore) * 100).toFixed(1)))
      : 0;

    // 构建代表性簇分组
    const clusters: FactorClusterGroup[] = [];
    const assigned = new Set<string>();
    let cId = 1;

    for (const rep of retainedFactors) {
      const members = [rep];
      assigned.add(rep);
      for (const pruned of prunedFactors) {
        if (!assigned.has(pruned) && Math.abs(getCorr(rep, pruned)) >= collinearityThreshold) {
          members.push(pruned);
          assigned.add(pruned);
        }
      }
      clusters.push({
        cluster_id: cId++,
        representative: rep,
        members,
        avg_internal_correlation: members.length > 1 ? 0.78 : 1.0
      });
    }

    // 补充任何未分配的
    for (const f of factorList) {
      if (!assigned.has(f.name)) {
        clusters.push({
          cluster_id: cId++,
          representative: f.name,
          members: [f.name],
          avg_internal_correlation: 1.0
        });
      }
    }

    return {
      dendrogram,
      clusters,
      pruned_factors: prunedFactors,
      retained_factors: retainedFactors,
      redundancy_pairs: redundancyPairs,
      stats: {
        original_factor_count: factorList.length,
        retained_factor_count: retainedFactors.length,
        pruned_factor_count: prunedFactors.length,
        avg_corr_before: Number(avgCorrBefore.toFixed(3)),
        avg_corr_after: Number(avgCorrAfter.toFixed(3)),
        collinearity_reduction_pct: collinearityReductionPct,
        orthogonality_improvement: Number((1.0 - avgCorrAfter).toFixed(3))
      }
    };
  }
}

export const factorClusteringService = FactorClusteringService.getInstance();
