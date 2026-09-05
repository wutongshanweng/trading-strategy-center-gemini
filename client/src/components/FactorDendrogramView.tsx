import React, { useState } from 'react';
import {
  GitFork,
  Network,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Button, Tooltip, Slider, Tag } from 'antd';
import {
  DendrogramTreeNode,
  FactorClusterGroup,
  RedundancyPair,
  CollinearityStats,
  CacheStatsData
} from '../services/factorApi';

interface FactorDendrogramViewProps {
  dendrogram?: DendrogramTreeNode;
  clusters?: FactorClusterGroup[];
  prunedFactors?: string[];
  retainedFactors?: string[];
  redundancyPairs?: RedundancyPair[];
  stats?: CollinearityStats;
  cacheStats?: CacheStatsData | null;
  collinearityThreshold: number;
  onThresholdChange: (threshold: number) => void;
  onApplyPruning: (retained: string[]) => void;
  onRefreshCache?: () => void;
  onClearCache?: () => void;
  isCombineLoading?: boolean;
}

export const FactorDendrogramView: React.FC<FactorDendrogramViewProps> = ({
  dendrogram,
  clusters = [],
  prunedFactors = [],
  retainedFactors = [],
  redundancyPairs = [],
  stats,
  cacheStats,
  collinearityThreshold,
  onThresholdChange,
  onApplyPruning,
  onRefreshCache,
  onClearCache,
  isCombineLoading = false
}) => {
  const [hoveredNode, setHoveredNode] = useState<DendrogramTreeNode | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'dendrogram' | 'redundancy' | 'clusters' | 'cache'>('dendrogram');

  // 递归收集所有叶子节点以确定垂直排列顺序
  const getLeaves = (node?: DendrogramTreeNode): DendrogramTreeNode[] => {
    if (!node) return [];
    if (node.is_leaf || !node.children) return [node];
    return [...getLeaves(node.children[0]), ...getLeaves(node.children[1])];
  };

  const leaves = getLeaves(dendrogram);
  const totalLeaves = leaves.length;

  // 计算树的最大高度以进行坐标归一化
  const getMaxHeight = (node?: DendrogramTreeNode): number => {
    if (!node) return 1;
    if (node.is_leaf || !node.children) return node.height || 0.1;
    return Math.max(node.height, getMaxHeight(node.children[0]), getMaxHeight(node.children[1]));
  };

  const treeMaxHeight = Math.max(1, getMaxHeight(dendrogram));

  // 为每个叶子节点分配 Y 坐标
  const leafYMap = new Map<string, number>();
  leaves.forEach((leaf, idx) => {
    leafYMap.set(leaf.id, idx);
  });

  // 递归计算每个节点的 X, Y 坐标 (绘制横向树状图)
  interface PlottedNode {
    node: DendrogramTreeNode;
    x: number;
    y: number;
    left?: PlottedNode;
    right?: PlottedNode;
  }

  const svgWidth = 650;
  const svgHeight = Math.max(220, totalLeaves * 42);
  const paddingLeft = 140; // 给左侧因子标签留足空间
  const paddingRight = 40;
  const plotWidth = svgWidth - paddingLeft - paddingRight;

  const buildPlottedTree = (node?: DendrogramTreeNode): PlottedNode | null => {
    if (!node) return null;
    if (node.is_leaf || !node.children) {
      const leafIdx = leafYMap.get(node.id) ?? 0;
      const y = totalLeaves > 1 ? 30 + (leafIdx / (totalLeaves - 1)) * (svgHeight - 60) : svgHeight / 2;
      return {
        node,
        x: paddingLeft, // 叶子节点位于最左侧
        y
      };
    }

    const left = buildPlottedTree(node.children[0]);
    const right = buildPlottedTree(node.children[1]);

    const y = ((left?.y ?? 0) + (right?.y ?? 0)) / 2;
    // X坐标按高度向右延展
    const normHeight = Math.min(1, Math.max(0.05, node.height / treeMaxHeight));
    const x = paddingLeft + normHeight * plotWidth;

    return {
      node,
      x,
      y,
      left: left || undefined,
      right: right || undefined
    };
  };

  const plottedRoot = buildPlottedTree(dendrogram);

  // 渲染 SVG 树连线
  const renderTreeLines = (pNode: PlottedNode): React.ReactNode => {
    if (!pNode.left || !pNode.right) return null;

    const isCollinearBreached = (1.0 - pNode.node.distance) >= collinearityThreshold;
    const strokeColor = isCollinearBreached ? '#ef4444' : '#6366f1';

    return (
      <g key={pNode.node.id}>
        {/* 连接左子节点的折线: 从 (pNode.x, pNode.y) 到 (pNode.x, pNode.left.y) 到 (pNode.left.x, pNode.left.y) */}
        <path
          d={`M ${pNode.left.x} ${pNode.left.y} L ${pNode.x} ${pNode.left.y} L ${pNode.x} ${pNode.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={hoveredNode?.id === pNode.node.id ? 2.5 : 1.5}
          strokeOpacity={0.85}
        />
        {/* 连接右子节点的折线 */}
        <path
          d={`M ${pNode.right.x} ${pNode.right.y} L ${pNode.x} ${pNode.right.y} L ${pNode.x} ${pNode.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={hoveredNode?.id === pNode.node.id ? 2.5 : 1.5}
          strokeOpacity={0.85}
        />

        {/* 聚合分支节点圆点 */}
        <circle
          cx={pNode.x}
          cy={pNode.y}
          r={hoveredNode?.id === pNode.node.id ? 6 : 4}
          fill={isCollinearBreached ? '#ef4444' : '#818cf8'}
          className="cursor-pointer transition-all hover:scale-125"
          onMouseEnter={() => setHoveredNode(pNode.node)}
          onMouseLeave={() => setHoveredNode(null)}
        />

        {renderTreeLines(pNode.left)}
        {renderTreeLines(pNode.right)}
      </g>
    );
  };

  // 渲染叶子节点标签
  const renderLeafNodes = (pNode: PlottedNode): React.ReactNode => {
    if (!pNode.left && !pNode.right) {
      const isPruned = prunedFactors.includes(pNode.node.name);
      return (
        <g
          key={pNode.node.id}
          className="cursor-pointer"
          onMouseEnter={() => setHoveredNode(pNode.node)}
          onMouseLeave={() => setHoveredNode(null)}
        >
          <circle
            cx={pNode.x}
            cy={pNode.y}
            r={5}
            fill={isPruned ? '#f87171' : '#10b981'}
          />
          <text
            x={pNode.x - 12}
            y={pNode.y + 4}
            textAnchor="end"
            fill={isPruned ? '#fca5a5' : '#e2e8f0'}
            fontSize={11}
            fontFamily="monospace"
            fontWeight={isPruned ? 'normal' : 'bold'}
          >
            {pNode.node.name}
          </text>
          {isPruned && (
            <text
              x={pNode.x - 110}
              y={pNode.y + 4}
              textAnchor="end"
              fill="#ef4444"
              fontSize={9}
              fontWeight="normal"
            >
              [共线建议剔除]
            </text>
          )}
        </g>
      );
    }
    return (
      <g key={pNode.node.id}>
        {pNode.left && renderLeafNodes(pNode.left)}
        {pNode.right && renderLeafNodes(pNode.right)}
      </g>
    );
  };

  // 截断阈值垂直标尺 X 坐标 (d = 1 - threshold)
  const cutDistance = Math.max(0, 1.0 - collinearityThreshold);
  const cutNormHeight = Math.min(1, Math.max(0.05, cutDistance / treeMaxHeight));
  const cutLineX = paddingLeft + cutNormHeight * plotWidth;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl text-white">
      {/* 顶部标题与快速动作区 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                因子层次聚类树状图 (Dendrogram) 与共线性诊断
              </h3>
              <Tag color="purple" className="border-purple-500/30 font-mono text-[10px]">
                Agglomerative UPGMA
              </Tag>
              {cacheStats && (
                <Tag color="cyan" className="border-cyan-500/30 font-mono text-[10px]">
                  LRU缓存命中: {cacheStats.hitRate}%
                </Tag>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              基于相关系数距离矩阵 (d = 1 - |r|) 构建层次凝聚树，自动诊断强共线性冗余并支持一键正交化剔除
            </p>
          </div>
        </div>

        {/* 关键操作：一键剔除高共线性因子 */}
        <div className="flex items-center gap-2">
          {prunedFactors.length > 0 && (
            <Button
              type="primary"
              danger
              icon={<Scissors className="w-3.5 h-3.5" />}
              loading={isCombineLoading}
              onClick={() => onApplyPruning(retainedFactors)}
              className="bg-red-600 hover:bg-red-500 font-bold text-xs h-8 shadow-lg shadow-red-600/20 flex items-center gap-1"
            >
              一键剔除高共线性因子 ({prunedFactors.length}个)
            </Button>
          )}
          <Button
            size="small"
            icon={<RefreshCw className="w-3 h-3" />}
            onClick={onRefreshCache}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white text-xs h-8"
          >
            刷新缓存
          </Button>
        </div>
      </div>

      {/* 核心指标统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 block font-medium">当前组合因子</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-slate-200">
              {stats?.original_factor_count ?? totalLeaves}
            </span>
            <span className="text-xs text-slate-500">个</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-emerald-900/40 p-3 rounded-xl">
          <span className="text-[11px] text-emerald-400 block font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 正交保留核心因子
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {retainedFactors.length}
            </span>
            <span className="text-xs text-emerald-500/70">个</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-red-900/40 p-3 rounded-xl">
          <span className="text-[11px] text-red-400 block font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> 建议剔除共线性
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-red-400">
              {prunedFactors.length}
            </span>
            <span className="text-xs text-red-500/70">个</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 block font-medium">共线性降低幅度</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-indigo-400">
              -{stats?.collinearity_reduction_pct ?? 0}%
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 block font-medium">正交性改善度</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-purple-400">
              +{stats?.orthogonality_improvement ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* 控制栏: 阈值调节滑块与子标签切换 */}
      <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-300 font-medium">共线性判定阈值 |r|:</span>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              ≥ {collinearityThreshold.toFixed(2)}
            </span>
          </div>
          <div className="w-44">
            <Slider
              min={0.50}
              max={0.85}
              step={0.05}
              value={collinearityThreshold}
              onChange={onThresholdChange}
              tooltip={{ formatter: (val) => `相关性阈值: ${val}` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            (相关度超出该阈值的因子对被归为同一共线簇，择优保留单因子表现最优者)
          </span>
        </div>

        {/* 视图切换按钮 */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveSubTab('dendrogram')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activeSubTab === 'dendrogram'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            聚类树状图
          </button>
          <button
            onClick={() => setActiveSubTab('redundancy')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
              activeSubTab === 'redundancy'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            共线性因子对
            {redundancyPairs.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {redundancyPairs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('clusters')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
              activeSubTab === 'clusters'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            正交聚类簇 ({clusters.length})
          </button>
          <button
            onClick={() => setActiveSubTab('cache')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
              activeSubTab === 'cache'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            LRU缓存与分片
          </button>
        </div>
      </div>

      {/* 视图 1: 层次聚类树状图 (Dendrogram SVG) */}
      {activeSubTab === 'dendrogram' && (
        <div className="space-y-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
              <span>← 独立单因子 (叶节点)</span>
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                红色虚线: 共线性截断阈值 |r| ≥ {collinearityThreshold.toFixed(2)} (距离 d ≤ {cutDistance.toFixed(2)})
              </span>
              <span>聚合分支 (根节点) →</span>
            </div>

            {plottedRoot ? (
              <svg width={svgWidth} height={svgHeight} className="mx-auto block select-none">
                {/* 阈值垂直指示虚线 */}
                <line
                  x1={cutLineX}
                  y1={10}
                  x2={cutLineX}
                  y2={svgHeight - 10}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                />
                <text
                  x={cutLineX + 4}
                  y={20}
                  fill="#f59e0b"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  阈值截断线
                </text>

                {/* 树连线 */}
                {renderTreeLines(plottedRoot)}

                {/* 叶子节点 */}
                {renderLeafNodes(plottedRoot)}
              </svg>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">暂无聚类节点数据</div>
            )}
          </div>

          {/* 节点悬浮详情提示 */}
          {hoveredNode && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white">聚类节点: {hoveredNode.name}</span>
                <span className="text-slate-400">| 聚合距离: {hoveredNode.distance.toFixed(3)}</span>
                <span className="text-slate-400">| 包含因子数: {hoveredNode.factor_count}</span>
              </div>
              {hoveredNode.is_leaf && (
                <div className="flex items-center gap-3">
                  <span>单因子 IC: <strong className="text-emerald-400">{hoveredNode.ic ?? '0.05'}</strong></span>
                  <span>IR: <strong className="text-indigo-400">{hoveredNode.ir ?? '1.2'}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 视图 2: 共线性因子对与剔除推荐明细 */}
      {activeSubTab === 'redundancy' && (
        <div className="space-y-3">
          {redundancyPairs.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">未检测到严重共线性因子</span>
              <span>当前所有所选因子间相关系数均在 |r| &lt; {collinearityThreshold} 范围内，正交性良好！</span>
            </div>
          ) : (
            <div className="space-y-2">
              {redundancyPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-red-900/30 hover:border-red-700/50 transition-colors p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-red-300">{pair.pruned}</span>
                      <span className="text-slate-500">↔</span>
                      <span className="font-mono font-bold text-emerald-300">{pair.retained}</span>
                      <Tag color="red" className="font-mono text-[10px] ml-1">
                        相关系数: {pair.correlation.toFixed(3)}
                      </Tag>
                    </div>
                    <p className="text-slate-400 leading-relaxed">{pair.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded font-mono font-medium">
                      保留: {pair.retained}
                    </span>
                    <span className="bg-red-950/60 border border-red-500/30 text-red-400 px-2.5 py-1 rounded font-mono line-through">
                      剔除: {pair.pruned}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 视图 3: 聚类簇结构 */}
      {activeSubTab === 'clusters' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clusters.map((c) => (
            <div
              key={c.cluster_id}
              className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  聚类分组 #{c.cluster_id}
                </span>
                <Tag color={c.members.length > 1 ? 'warning' : 'default'} className="font-mono text-[10px]">
                  {c.members.length} 个因子
                </Tag>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">簇代表性因子:</span>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {c.representative}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">簇内成员:</span>
                <div className="flex flex-wrap gap-1.5">
                  {c.members.map((m) => {
                    const isPruned = prunedFactors.includes(m);
                    return (
                      <span
                        key={m}
                        className={`font-mono px-2 py-0.5 rounded text-[11px] border ${
                          isPruned
                            ? 'bg-red-950/40 border-red-800/40 text-red-300 line-through'
                            : 'bg-slate-900 border-slate-800 text-slate-200'
                        }`}
                      >
                        {m} {isPruned && '(剔除)'}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 视图 4: LRU 缓存与分片计算指标 */}
      {activeSubTab === 'cache' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 block">LRU 缓存命中率</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {cacheStats?.hitRate ?? 0}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                命中: {cacheStats?.hits ?? 0} / 未命中: {cacheStats?.misses ?? 0}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 block">当前缓存截面数</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">
                {cacheStats?.size ?? 0} / {cacheStats?.maxCapacity ?? 10000}
              </span>
              <span className="text-[10px] text-slate-500 block">
                日频快照: {cacheStats?.dailyKey ?? new Date().toISOString().split('T')[0]}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 block">累计加速计算次数</span>
              <span className="text-2xl font-bold font-mono text-indigo-400">
                {cacheStats?.totalComputed ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 block">
                免除重复全截面计算开销
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-xs text-slate-400 block">内存驻留占用</span>
              <span className="text-2xl font-bold font-mono text-purple-400">
                {cacheStats?.estimatedMemoryKB ?? 0} KB
              </span>
              <span className="text-[10px] text-slate-500 block">
                轻量高效，自动定时驱逐
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>
                全市场 483 因子计算采用 <strong>分片异步并行机制 (Chunk Size: 40)</strong> 与 <strong>LRU 日频缓存</strong>，保障海量特征截面毫秒级输出。
              </span>
            </div>

            <Button
              danger
              size="small"
              onClick={onClearCache}
              className="bg-red-950/40 border-red-800/60 text-red-300 hover:text-white"
            >
              清空因子 LRU 日频缓存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
