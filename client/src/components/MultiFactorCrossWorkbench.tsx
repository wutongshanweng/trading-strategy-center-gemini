import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  GitMerge,
  Cpu,
  TrendingUp,
  Activity,
  ShieldCheck,
  Zap,
  Sliders,
  Play,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BarChart3,
  Percent,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

interface FactorDef {
  id: string;
  name: string;
  category: string;
  description: string;
  formula: string;
}

interface PresetStrategy {
  id: string;
  name: string;
  category: string;
  description: string;
  factors: string[];
  method: string;
  expectedSharpe: number;
  expectedWinRate: number;
}

export function MultiFactorCrossWorkbench() {
  const [symbol, setSymbol] = useState('RB2610');
  const [frequency, setFrequency] = useState<'D1' | 'H1' | 'M30'>('H1');
  const [method, setMethod] = useState<'non_linear_product' | 'orthogonal_residual' | 'regime_gated' | 'ic_ir_weighted'>('non_linear_product');
  const [selectedFactors, setSelectedFactors] = useState<string[]>([
    'FAC_TREND_MA_ALIGN',
    'FAC_BASIS_YIELD',
    'FAC_INVENTORY_CYCLE',
    'FAC_VOL_SQUEEZE'
  ]);
  
  const [factorRegistry, setFactorRegistry] = useState<FactorDef[]>([]);
  const [presetStrategies, setPresetStrategies] = useState<PresetStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [crossResult, setCrossResult] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<'signals' | 'weights_correlation' | 'synergy'>('signals');

  // 1. 初始化拉取因子注册表与预设
  useEffect(() => {
    fetchRegistry();
  }, []);

  const fetchRegistry = async () => {
    try {
      const res = await fetch('/api/v1/factor/cross/registry');
      const json = await res.json();
      if (json.status === 'ok') {
        setFactorRegistry(json.factors || []);
        setPresetStrategies(json.presets || []);
      }
    } catch (e) {
      console.error('Failed to load factor cross registry', e);
    }
  };

  // 2. 执行多因子交叉计算
  const handleComputeCross = async (
    targetSym = symbol,
    targetFreq = frequency,
    targetMethod = method,
    targetFactors = selectedFactors
  ) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/factor/cross/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: targetSym,
          frequency: targetFreq,
          combinationMethod: targetMethod,
          selectedFactors: targetFactors
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setCrossResult(json.data);
      }
    } catch (e) {
      console.error('Error computing cross factors', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleComputeCross();
  }, [symbol, frequency, method]);

  const toggleFactor = (fId: string) => {
    if (selectedFactors.includes(fId)) {
      if (selectedFactors.length > 2) {
        const next = selectedFactors.filter(id => id !== fId);
        setSelectedFactors(next);
        handleComputeCross(symbol, frequency, method, next);
      }
    } else {
      const next = [...selectedFactors, fId];
      setSelectedFactors(next);
      handleComputeCross(symbol, frequency, method, next);
    }
  };

  const applyPreset = (preset: PresetStrategy) => {
    setSelectedFactors(preset.factors);
    setMethod(preset.method as any);
    handleComputeCross(symbol, frequency, preset.method as any, preset.factors);
  };

  return (
    <div className="space-y-6">
      {/* 顶部标题与多因子交叉架构说明 */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl shadow-inner">
                <GitMerge className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    多因子高阶交叉与正交合成工作台
                  </h2>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-[11px] font-mono font-bold tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> NON-LINEAR ALPHA
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-1">
                  突破单因子局限，融合 <strong className="text-white">趋势动量 × 现货基差 × 产业库存周期 × 资金流失衡</strong>，利用非线性乘积与施密特正交化剥离共线性。
                </p>
              </div>
            </div>
          </div>

          {/* 控制选项：品种 + 周期 + 触发按钮 */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">标的:</span>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="RB2610">RB2610 螺纹钢</option>
                <option value="MA2609">MA2609 甲醇</option>
                <option value="SA2609">SA2609 纯碱</option>
                <option value="FG2609">FG2609 玻璃</option>
                <option value="M2609">M2609 豆粕</option>
                <option value="CU2610">CU2610 沪铜</option>
                <option value="IF2609">IF2609 沪深300</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">周期:</span>
              <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                {(['D1', 'H1', 'M30'] as const).map(fq => (
                  <button
                    key={fq}
                    onClick={() => setFrequency(fq)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      frequency === fq
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {fq}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleComputeCross()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>重新测算</span>
            </button>
          </div>
        </div>
      </div>

      {/* 预设推荐策略模板 (一键导入经典交叉范式) */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">精选多因子交叉实战模板库 (Top Preset Alpha Combinations)</span>
          </div>
          <span className="text-xs text-slate-400">点击卡片可快速载入经典因子交叉架构</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {presetStrategies.map((preset) => {
            const isCurrent = method === preset.method && preset.factors.every(f => selectedFactors.includes(f));
            return (
              <div
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    {preset.name}
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-mono">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3 line-clamp-2">
                  {preset.description}
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-slate-800/80 text-slate-400">
                  <span>预期夏普: <strong className="text-emerald-400">{preset.expectedSharpe}</strong></span>
                  <span>胜率: <strong className="text-indigo-300">{preset.expectedWinRate}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 因子交叉配置面板：因子池勾选 + 合成范式选择 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：因子选择器 */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">候选因子库池 (已选 {selectedFactors.length} 个)</span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {factorRegistry.map((factor) => {
              const isSelected = selectedFactors.includes(factor.id);
              return (
                <div
                  key={factor.id}
                  onClick={() => toggleFactor(factor.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/30 border-indigo-500/60 text-white shadow-xs'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                      {factor.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {factor.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {factor.description}
                  </p>
                  <div className="mt-1.5 text-[10px] font-mono text-indigo-300/80 bg-slate-950/50 p-1 rounded">
                    公式: {factor.formula}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 中间+右侧：交叉合成机制与核心指标 */}
        <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">合成算法模式 (Combination Architecture)</span>
            </div>
            <span className="text-xs text-indigo-300 font-mono">
              Formula: {crossResult?.generatedFormula || 'Orthogonal_Residual(...) '}
            </span>
          </div>

          {/* 模式选择 Pill */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'non_linear_product', name: '非线性乘积交互', desc: '符号共振放大' },
              { key: 'orthogonal_residual', name: '施密特正交化去噪', desc: '共线性剔除 68%' },
              { key: 'regime_gated', name: '基本面门限滤波', desc: '宏观/库存过滤' },
              { key: 'ic_ir_weighted', name: 'IC-IR自适应加权', desc: '滚动稳定性最优' }
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMethod(m.key as any)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  method === m.key
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xs'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{m.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* 复合回测核心指标卡片 */}
          {crossResult && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">复合 Rank IC</span>
                <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                  +{crossResult.metrics.compositeIC}
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">信息比率 (IR)</span>
                <span className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                  {crossResult.metrics.compositeIR}
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">年化夏普比率</span>
                <span className="text-lg font-bold font-mono text-purple-300 mt-0.5">
                  {crossResult.metrics.annualizedSharpe}
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">多空胜率</span>
                <span className="text-lg font-bold font-mono text-teal-300 mt-0.5">
                  {crossResult.metrics.winRate}%
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">共线性消除比例</span>
                <span className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {crossResult.metrics.collinearityReduction}%
                </span>
              </div>
            </div>
          )}

          {/* 实时最新信号诊断框 */}
          {crossResult && (
            <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                  crossResult.latestAction.includes('BUY')
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : (crossResult.latestAction.includes('SELL')
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-300')
                }`}>
                  {crossResult.latestAction} ({crossResult.latestScore > 0 ? `+${crossResult.latestScore}` : crossResult.latestScore}分)
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white">{crossResult.symbol}</span> 最新多因子共振打分：{crossResult.synergyAnalysis.structuralAlphaEdge}
                </div>
              </div>
              <div className="text-xs text-slate-400 font-mono whitespace-nowrap">
                门限滤波: {crossResult.synergyAnalysis.regimeFilterPassed ? '✅ 激活' : '⏸ 震荡过滤'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 下方详细视图：时序信号图表 / 权重与相关性热力图 / 协同效应剖析 */}
      {crossResult && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('signals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'signals'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                多因子合成时序打分与价格轨迹
              </button>
              <button
                onClick={() => setActiveSubTab('weights_correlation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeSubTab === 'weights_correlation'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                因子权重分配与相关性矩阵
              </button>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              样本区间: 最近 30 根 K 棒
            </span>
          </div>

          {activeSubTab === 'signals' && (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={crossResult.signals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#818cf8" fontSize={11} domain={[-100, 100]} />
                  <YAxis yAxisId="right" orientation="right" stroke="#34d399" fontSize={11} domain={['auto', 'auto']} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="compositeScore" name="多因子合成得分(-100~+100)" stroke="#818cf8" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="closePrice" name="收盘价" stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeSubTab === 'weights_correlation' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* 权重分配条形图 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  各因子有效贡献权重分布 (Feature Weights)
                </h4>
                <div className="space-y-3">
                  {crossResult.featureImportance.map((item: any) => (
                    <div key={item.factor}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-mono">{item.factor}</span>
                        <span className="text-indigo-300 font-bold font-mono">{item.importance}% (IC贡献: +{item.icContribution})</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full"
                          style={{ width: `${item.importance}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 相关性矩阵 */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  因子间皮尔逊相关性矩阵 (Correlation Matrix)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr>
                        <th className="p-1.5 text-slate-400 text-left font-mono">因子</th>
                        {crossResult.metrics.correlationMatrix.factors.map((f: string) => (
                          <th key={f} className="p-1.5 text-slate-300 font-mono text-[10px]">
                            {f.replace('FAC_', '')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {crossResult.metrics.correlationMatrix.factors.map((f1: string, i: number) => (
                        <tr key={f1} className="border-t border-slate-800">
                          <td className="p-1.5 text-left text-slate-300 font-mono text-[10px]">{f1.replace('FAC_', '')}</td>
                          {crossResult.metrics.correlationMatrix.factors.map((f2: string, j: number) => {
                            const val = crossResult.metrics.correlationMatrix.matrix[i][j];
                            const isHigh = Math.abs(val) > 0.5 && i !== j;
                            return (
                              <td
                                key={f2}
                                className={`p-1.5 font-mono text-[11px] ${
                                  i === j
                                    ? 'bg-slate-800 text-slate-500'
                                    : (isHigh ? 'text-rose-400 bg-rose-950/30' : 'text-slate-300')
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
