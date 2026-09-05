import React, { useState } from 'react';
import {
  Card,
  Button,
  Select,
  Radio,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Progress,
  Divider,
  Alert,
  Tooltip,
  message,
  Spin
} from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  CompassOutlined,
  LineChartOutlined,
  ExperimentOutlined,
  CheckOutlined,
  FireOutlined,
  SlidersOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid
} from 'recharts';
import {
  strategyApi,
  type AutoTuneResult
} from '../services/strategyApi';

interface Props {
  strategyName: string;
  chineseName?: string;
  currentParams?: Record<string, any>;
  onParamsApplied?: (newParams: Record<string, any>) => void;
}

export const StrategyAutoTuneStudio: React.FC<Props> = ({
  strategyName,
  chineseName,
  currentParams,
  onParamsApplied
}) => {
  const [method, setMethod] = useState<'bayesian' | 'grid'>('bayesian');
  const [objective, setObjective] = useState<'sharpe' | 'calmar' | 'composite'>('sharpe');
  const [symbol, setSymbol] = useState<string>('RB');
  const [nIter, setNIter] = useState<number>(20);
  const [splitRatio, setSplitRatio] = useState<number>(0.7);

  const [loading, setLoading] = useState(false);
  const [tuneResult, setTuneResult] = useState<AutoTuneResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const handleStartTuning = async () => {
    setLoading(true);
    setHasApplied(false);
    try {
      const res = await strategyApi.autoTune(strategyName, {
        symbol,
        method,
        objective,
        n_iter: nIter,
        split_ratio: splitRatio
      });
      setTuneResult(res);
      message.success(`${chineseName || strategyName} 自动调优与参数平原评估已完成`);
    } catch (err: any) {
      message.error(`调优失败: ${err.message || '网络异常'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyParams = async (paramsToApply: Record<string, any>) => {
    setApplying(true);
    try {
      await strategyApi.applyParams(strategyName, paramsToApply);
      setHasApplied(true);
      message.success(`已成功采纳最优参数至策略 [${chineseName || strategyName}] 注册表！`);
      if (onParamsApplied) {
        onParamsApplied(paramsToApply);
      }
    } catch (err: any) {
      message.error(`参数采纳失败: ${err.message || '未知错误'}`);
    } finally {
      setApplying(false);
    }
  };

  const getHeatmapColor = (val: number, maxVal: number, minVal: number) => {
    if (maxVal === minVal) return 'bg-emerald-600/80 text-white';
    const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
    if (norm > 0.85) return 'bg-emerald-500 text-slate-950 font-bold';
    if (norm > 0.65) return 'bg-emerald-600/70 text-emerald-100';
    if (norm > 0.45) return 'bg-teal-700/60 text-teal-100';
    if (norm > 0.25) return 'bg-amber-700/60 text-amber-100';
    return 'bg-rose-900/60 text-rose-200';
  };

  return (
    <div className="space-y-4">
      {/* 调优控制台表头与参数设置 */}
      <Card
        size="small"
        className="bg-slate-900/90 border-slate-800 text-slate-200"
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersOutlined className="text-indigo-400" />
              <span className="font-semibold text-slate-100 text-sm">
                自适应自动调优引擎 (Auto-Tuning Engine)
              </span>
            </div>
            <Tag color="indigo" className="font-mono text-xs">
              {strategyName}
            </Tag>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">寻优算法核心</label>
            <Radio.Group
              size="small"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full flex"
            >
              <Radio.Button value="bayesian" className="flex-1 text-center text-xs">
                贝叶斯 (TPE)
              </Radio.Button>
              <Radio.Button value="grid" className="flex-1 text-center text-xs">
                全局网格
              </Radio.Button>
            </Radio.Group>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">优化目标函数</label>
            <Select
              size="small"
              value={objective}
              onChange={(val) => setObjective(val)}
              className="w-full"
              options={[
                { label: '最大化夏普比率 (Sharpe)', value: 'sharpe' },
                { label: '最大化卡玛比率 (Calmar)', value: 'calmar' },
                { label: '复合平衡 (夏普+卡玛+胜率)', value: 'composite' }
              ]}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">测试标的与迭代轮数</label>
            <div className="flex gap-1.5">
              <Select
                size="small"
                value={symbol}
                onChange={(v) => setSymbol(v)}
                className="w-1/2"
                options={[
                  { label: '螺纹钢 (RB)', value: 'RB' },
                  { label: '沪深300 (IF)', value: 'IF' },
                  { label: '沪铜 (CU)', value: 'CU' },
                  { label: '原油 (SC)', value: 'SC' }
                ]}
              />
              <Select
                size="small"
                value={nIter}
                onChange={(v) => setNIter(v)}
                className="w-1/2"
                options={[
                  { label: '15 轮快速', value: 15 },
                  { label: '25 轮精细', value: 25 },
                  { label: '40 轮深度', value: 40 }
                ]}
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <Button
              type="primary"
              size="small"
              icon={<ThunderboltOutlined />}
              loading={loading}
              onClick={handleStartTuning}
              className="bg-indigo-600 hover:bg-indigo-500 font-medium h-7"
            >
              {loading ? '正在高维寻优...' : '启动参数自动寻优'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 调优中 Loading 骨架 */}
      {loading && (
        <Card size="small" className="bg-slate-900/60 border-slate-800 text-center py-8">
          <Spin tip="正在并行执行样本内切分、贝叶斯代理模型迭代、参数平原矩阵模拟与样本外盲测检验..." />
        </Card>
      )}

      {/* 调优结果呈现面板 */}
      {tuneResult && !loading && (
        <div className="space-y-4">
          {/* 状态与诊断横幅 */}
          <div
            className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
              tuneResult.overfitting_diagnosis.robustness_status === 'ROBUST'
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                : tuneResult.overfitting_diagnosis.robustness_status === 'MODERATE'
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {tuneResult.overfitting_diagnosis.robustness_status === 'ROBUST' ? (
                <SafetyCertificateOutlined className="text-emerald-400 text-lg mt-0.5" />
              ) : tuneResult.overfitting_diagnosis.robustness_status === 'MODERATE' ? (
                <WarningOutlined className="text-amber-400 text-lg mt-0.5" />
              ) : (
                <WarningOutlined className="text-rose-400 text-lg mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {tuneResult.overfitting_diagnosis.robustness_status === 'ROBUST'
                      ? '稳健泛化验证通过'
                      : tuneResult.overfitting_diagnosis.robustness_status === 'MODERATE'
                      ? '适度泛化 (轻微衰减)'
                      : '过拟合警报 (样本外衰减过大)'}
                  </span>
                  <Tag
                    color={
                      tuneResult.overfitting_diagnosis.robustness_status === 'ROBUST'
                        ? 'green'
                        : tuneResult.overfitting_diagnosis.robustness_status === 'MODERATE'
                        ? 'gold'
                        : 'red'
                    }
                  >
                    衰减率 {(tuneResult.overfitting_diagnosis.decay_rate * 100).toFixed(1)}%
                  </Tag>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {tuneResult.overfitting_diagnosis.verdict}
                </div>
              </div>
            </div>

            <Button
              type="primary"
              size="middle"
              icon={hasApplied ? <CheckOutlined /> : <FireOutlined />}
              disabled={hasApplied}
              loading={applying}
              onClick={() => handleApplyParams(tuneResult.best_params)}
              className={
                hasApplied
                  ? 'bg-emerald-600 border-none text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 font-semibold'
              }
            >
              {hasApplied ? '已采纳上线' : '一键采纳最优参数'}
            </Button>
          </div>

          {/* 参数对比与样本内外双盲检验卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 参数调优前后对照 */}
            <Card
              size="small"
              className="bg-slate-950/70 border-slate-800 text-slate-200"
              title={
                <span className="text-xs font-semibold text-slate-300">
                  参数演化对比 (Baseline vs Optimized)
                </span>
              }
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-xs text-slate-400">快线/动量周期 (fast_period)</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500 line-through">
                      {tuneResult.baseline_params.fast_period || 5}
                    </span>
                    <span className="text-indigo-400 font-bold">
                      → {tuneResult.best_params.fast_period}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-xs text-slate-400">慢线/基准周期 (slow_period)</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500 line-through">
                      {tuneResult.baseline_params.slow_period || 20}
                    </span>
                    <span className="text-indigo-400 font-bold">
                      → {tuneResult.best_params.slow_period}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-xs text-slate-400">动态止损阈值 (stop_loss)</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500 line-through">
                      {((tuneResult.baseline_params.stop_loss || 0.02) * 100).toFixed(1)}%
                    </span>
                    <span className="text-emerald-400 font-bold">
                      → {((tuneResult.best_params.stop_loss || 0.02) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800/60">
                  <span className="text-xs text-slate-400">跟踪止盈空间 (take_profit)</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500 line-through">
                      {((tuneResult.baseline_params.take_profit || 0.06) * 100).toFixed(1)}%
                    </span>
                    <span className="text-emerald-400 font-bold">
                      → {((tuneResult.best_params.take_profit || 0.06) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* 样本内 (IS) vs 样本外 (OOS) 检验 */}
            <Card
              size="small"
              className="bg-slate-950/70 border-slate-800 text-slate-200"
              title={
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    防过拟合检验：样本内 (70%) vs 样本外盲测 (30%)
                  </span>
                  <Tag color="cyan" className="text-[10px]">
                    IS: {Math.round(tuneResult.split_ratio * 100)}% / OOS:{' '}
                    {Math.round((1 - tuneResult.split_ratio) * 100)}%
                  </Tag>
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1 font-semibold">
                    样本内 (In-Sample)
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">夏普比率:</span>
                      <span className="font-mono font-bold text-indigo-400">
                        {tuneResult.is_metrics.sharpe_ratio}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">总收益率:</span>
                      <span className="font-mono text-emerald-400">
                        {tuneResult.is_metrics.total_return_pct}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">最大回撤:</span>
                      <span className="font-mono text-rose-400">
                        {tuneResult.is_metrics.max_drawdown_pct}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">胜率:</span>
                      <span className="font-mono text-slate-200">
                        {(tuneResult.is_metrics.win_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-1 font-semibold flex items-center justify-between">
                    <span>样本外 (Out-of-Sample)</span>
                    <span className="text-[10px] text-emerald-400">真实盲测</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">夏普比率:</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {tuneResult.oos_metrics.sharpe_ratio}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">总收益率:</span>
                      <span className="font-mono text-emerald-400">
                        {tuneResult.oos_metrics.total_return_pct}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">最大回撤:</span>
                      <span className="font-mono text-rose-400">
                        {tuneResult.oos_metrics.max_drawdown_pct}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">胜率:</span>
                      <span className="font-mono text-slate-200">
                        {(tuneResult.oos_metrics.win_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 基准 vs 调优提振 */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  基准夏普:{' '}
                  <span className="text-slate-300 font-mono">
                    {tuneResult.baseline_metrics.sharpe_ratio}
                  </span>
                </span>
                <span className="text-emerald-400 font-semibold">
                  全流程夏普提振:{' '}
                  {tuneResult.is_metrics.sharpe_ratio - tuneResult.baseline_metrics.sharpe_ratio > 0
                    ? `+${(
                        tuneResult.is_metrics.sharpe_ratio -
                        tuneResult.baseline_metrics.sharpe_ratio
                      ).toFixed(2)}`
                    : '0.00'}
                </span>
              </div>
            </Card>
          </div>

          {/* 参数平原敏感性热力图 (Parameter Plateau Analysis) */}
          {tuneResult.plateau && (
            <Card
              size="small"
              className="bg-slate-950/70 border-slate-800 text-slate-200"
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CompassOutlined className="text-teal-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      参数平原稳定性热力图 (Parameter Plateau Analysis)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">高原平缓指数:</span>
                    <Tag
                      color={
                        tuneResult.plateau.assessment === 'EXCELLENT_PLATEAU'
                          ? 'green'
                          : tuneResult.plateau.assessment === 'MODERATE_PLATEAU'
                          ? 'gold'
                          : 'red'
                      }
                    >
                      {tuneResult.plateau.stability_score}% (
                      {tuneResult.plateau.assessment === 'EXCELLENT_PLATEAU'
                        ? '平坦高原·实盘稳健'
                        : tuneResult.plateau.assessment === 'MODERATE_PLATEAU'
                        ? '中度平原'
                        : '尖峰孤岛·过拟合风险'}
                      )
                    </Tag>
                  </div>
                </div>
              }
            >
              <div className="text-xs text-slate-400 mb-2">
                以最优化核心点为中心，探测横轴（{tuneResult.plateau.param2_label}）与纵轴（
                {tuneResult.plateau.param1_label}
                ）二维扰动下的夏普稳定性。越宽平的绿色高原，意味着实盘遇到市场噪音时容错率越高。
              </div>

              {/* 5x5 热力网格 */}
              <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                  <div className="grid grid-cols-6 gap-1 text-center text-xs font-mono">
                    <div className="p-1 text-slate-500 text-[10px]">
                      {tuneResult.plateau.param1_name} \ {tuneResult.plateau.param2_name}
                    </div>
                    {tuneResult.plateau.param2_values.map((v2) => (
                      <div
                        key={v2}
                        className={`p-1 text-[11px] ${
                          v2 === tuneResult.best_params.slow_period
                            ? 'text-indigo-300 font-bold border-b border-indigo-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {v2}
                      </div>
                    ))}

                    {tuneResult.plateau.param1_values.map((v1, rIdx) => (
                      <React.Fragment key={v1}>
                        <div
                          className={`p-1.5 text-[11px] flex items-center justify-center ${
                            v1 === tuneResult.best_params.fast_period
                              ? 'text-indigo-300 font-bold border-r border-indigo-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {v1}
                        </div>
                        {tuneResult.plateau.param2_values.map((_, cIdx) => {
                          const val = tuneResult.plateau.matrix[rIdx]?.[cIdx] || 0;
                          const isCenter =
                            v1 === tuneResult.best_params.fast_period &&
                            tuneResult.plateau.param2_values[cIdx] ===
                              tuneResult.best_params.slow_period;
                          const allVals = tuneResult.plateau.matrix.flat();
                          const maxV = Math.max(...allVals);
                          const minV = Math.min(...allVals);
                          const colorCls = getHeatmapColor(val, maxV, minV);

                          return (
                            <Tooltip
                              key={cIdx}
                              title={`${tuneResult.plateau.param1_label}: ${v1}, ${tuneResult.plateau.param2_label}: ${tuneResult.plateau.param2_values[cIdx]} => 夏普: ${val}`}
                            >
                              <div
                                className={`p-2 rounded text-xs transition-all flex items-center justify-center cursor-pointer relative ${colorCls} ${
                                  isCenter ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-950 scale-105' : ''
                                }`}
                              >
                                {val.toFixed(2)}
                                {isCenter && (
                                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-400 rounded-full"></span>
                                )}
                              </div>
                            </Tooltip>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 寻优收敛轨迹图谱 */}
          {tuneResult.convergence_history && tuneResult.convergence_history.length > 0 && (
            <Card
              size="small"
              className="bg-slate-950/70 border-slate-800 text-slate-200"
              title={
                <div className="flex items-center gap-2">
                  <LineChartOutlined className="text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    贝叶斯代理模型迭代收敛轨迹 ({tuneResult.iterations_run} 轮探索)
                  </span>
                </div>
              }
            >
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={tuneResult.convergence_history}
                    margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="iteration"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: 6,
                        fontSize: 11
                      }}
                      formatter={(val: any, name: any) => [
                        val,
                        name === 'best_score' ? '当前最佳得分' : '当前轮次样本得分'
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#475569"
                      strokeDasharray="2 2"
                      dot={false}
                      name="score"
                    />
                    <Line
                      type="stepAfter"
                      dataKey="best_score"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      name="best_score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* 市场体制自适应分治参数建议 (Regime-Conditioned Parameters) */}
          {tuneResult.regime_recommendations && (
            <Card
              size="small"
              className="bg-slate-950/70 border-slate-800 text-slate-200"
              title={
                <span className="text-xs font-semibold text-slate-300">
                  分市场体制（Regime）自适应动态参数推荐
                </span>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {tuneResult.regime_recommendations.map((rec) => (
                  <div
                    key={rec.regime}
                    className="p-2.5 rounded bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-200">
                        {rec.regime_cn}
                      </span>
                      <Tag
                        color={
                          rec.regime === 'trending'
                            ? 'green'
                            : rec.regime === 'ranging'
                            ? 'orange'
                            : 'red'
                        }
                        className="text-[10px]"
                      >
                        {rec.regime}
                      </Tag>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                      {rec.description}
                    </p>
                    <div className="bg-slate-950/80 p-1.5 rounded text-[10px] font-mono text-indigo-300 flex justify-between">
                      <span>fast: {rec.suggested_params.fast_period}</span>
                      <span>slow: {rec.suggested_params.slow_period}</span>
                      <span>stop: {((rec.suggested_params.stop_loss || 0.02) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
