import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Tag,
  Radio,
  Select,
  Slider,
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Tooltip,
  message,
  Table,
  Divider,
  Alert
} from 'antd';
import {
  SwapOutlined,
  FundProjectionScreenOutlined,
  RadarChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SlidersOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid
} from 'recharts';
import {
  strategyApi,
  type StrategyCompareResult,
  type PortfolioBacktestResult
} from '../services/strategyApi';

interface Props {
  selectedStrategies: string[];
  onClearSelection: () => void;
}

export const MultiStrategyWorkbench: React.FC<Props> = ({
  selectedStrategies,
  onClearSelection,
}) => {
  const [compareVisible, setCompareVisible] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareData, setCompareData] = useState<StrategyCompareResult | null>(null);

  const [portfolioVisible, setPortfolioVisible] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioBacktestResult | null>(null);

  const [allocationMethod, setAllocationMethod] = useState<'equal_weight' | 'sharpe_weighted' | 'risk_parity' | 'custom'>('equal_weight');
  const [portfolioSymbol, setPortfolioSymbol] = useState<string>('RB');
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({});

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

  // 1. 打开多策略横向对比
  const handleOpenCompare = async () => {
    if (selectedStrategies.length < 2) {
      message.warning('请至少勾选 2 个策略进行对比');
      return;
    }
    setCompareVisible(true);
    setCompareLoading(true);
    try {
      const data = await strategyApi.compareStrategies(selectedStrategies);
      setCompareData(data);
    } catch (err: any) {
      message.error(`对比数据获取失败: ${err.message || '未知错误'}`);
    } finally {
      setCompareLoading(false);
    }
  };

  // 2. 打开组合回测
  const handleOpenPortfolio = async () => {
    if (selectedStrategies.length < 2) {
      message.warning('请至少勾选 2 个策略进行组合回测');
      return;
    }
    // Initialize default equal weights for custom slider
    const initialW: Record<string, number> = {};
    const baseW = Math.round(100 / selectedStrategies.length);
    selectedStrategies.forEach(s => { initialW[s] = baseW; });
    setCustomWeights(initialW);

    setPortfolioVisible(true);
    await executePortfolioBacktest('equal_weight', initialW);
  };

  const executePortfolioBacktest = async (
    method: 'equal_weight' | 'sharpe_weighted' | 'risk_parity' | 'custom',
    weightsMap?: Record<string, number>
  ) => {
    setPortfolioLoading(true);
    try {
      const inputs = selectedStrategies.map(name => ({
        name,
        weight: (weightsMap || customWeights)[name] || 20
      }));

      const res = await strategyApi.portfolioBacktest({
        strategies: inputs,
        symbol: portfolioSymbol,
        allocation_method: method,
        capital: 100000
      });
      setPortfolioData(res);
    } catch (err: any) {
      message.error(`组合回测失败: ${err.message || '未知错误'}`);
    } finally {
      setPortfolioLoading(false);
    }
  };

  if (selectedStrategies.length < 2) {
    return null;
  }

  return (
    <>
      {/* 底部悬浮多选操作条 (Floating Workbench Action Bar) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 shadow-2xl rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3 max-w-4xl w-[92vw]">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          <span className="text-xs font-semibold text-slate-100">
            已勾选 <span className="text-indigo-400 font-mono text-sm">{selectedStrategies.length}</span> 个策略
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-0.5">
          {selectedStrategies.slice(0, 4).map((s, idx) => (
            <Tag key={s} color="indigo" className="font-mono text-xs m-0">
              {s}
            </Tag>
          ))}
          {selectedStrategies.length > 4 && (
            <Tag color="default" className="text-xs m-0">
              +{selectedStrategies.length - 4}
            </Tag>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            type="default"
            size="small"
            icon={<SwapOutlined />}
            onClick={handleOpenCompare}
            className="bg-slate-800 border-slate-700 text-indigo-300 hover:bg-slate-700 text-xs font-medium"
          >
            多策略横向对比 (雷达图)
          </Button>

          <Button
            type="primary"
            size="small"
            icon={<FundProjectionScreenOutlined />}
            onClick={handleOpenPortfolio}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
          >
            多策略组合回测 (资产配置)
          </Button>

          <Button
            type="text"
            size="small"
            onClick={onClearSelection}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            清空
          </Button>
        </div>
      </div>

      {/* 弹窗 1：多策略横向对比 (Radar & Matrix) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-100">
            <RadarChartOutlined className="text-indigo-400 text-lg" />
            <span className="font-bold text-base">多策略横向综合画像与雷达对比</span>
            <Tag color="indigo" className="text-xs ml-2">
              {selectedStrategies.length} 个候选策略
            </Tag>
          </div>
        }
        open={compareVisible}
        onCancel={() => setCompareVisible(false)}
        footer={null}
        width={920}
        className="dark-modal"
      >
        {compareLoading ? (
          <div className="py-16 text-center">
            <Spin tip="正在提取策略综合维度指标与能力雷达..." />
          </div>
        ) : compareData ? (
          <div className="space-y-4">
            {/* 雷达图与对比解读 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 h-72 w-full bg-slate-950/60 rounded-xl p-2 border border-slate-800/80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={compareData.radar_data}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                    {compareData.strategies.map((s, idx) => (
                      <Radar
                        key={s.name}
                        name={s.chinese_name || s.name}
                        dataKey={s.name}
                        stroke={colors[idx % colors.length]}
                        fill={colors[idx % colors.length]}
                        fillOpacity={0.25}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 6, fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="md:col-span-5 space-y-2.5">
                <Card size="small" className="bg-slate-900/80 border-slate-800 text-slate-200">
                  <div className="text-xs font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                    <SafetyCertificateOutlined />
                    策略互补性与配置价值评估
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    雷达图从夏普比率、胜率、卡玛比率、抗回撤韧性、换手收益比、体制适应度 6 大维度刻画策略基因。
                  </p>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• <span className="text-emerald-400">夏普与卡玛突出型</span>：适合承担核心底仓；</div>
                    <div>• <span className="text-amber-400">抗回撤与胜率防御型</span>：可有效平抑组合净值震荡；</div>
                    <div>• <span className="text-cyan-400">跨体制适应型</span>：在行情反转时提供稳定性对冲。</div>
                  </div>
                </Card>

                <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-200 flex items-center justify-between">
                  <span>建议进入下一步：</span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<FundProjectionScreenOutlined />}
                    onClick={() => {
                      setCompareVisible(false);
                      handleOpenPortfolio();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500"
                  >
                    立即进行组合曲线回测
                  </Button>
                </div>
              </div>
            </div>

            {/* 对比矩阵表格 */}
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs text-left text-slate-200">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">策略名称</th>
                    <th className="p-2.5">夏普比率</th>
                    <th className="p-2.5">历史胜率</th>
                    <th className="p-2.5">最大回撤</th>
                    <th className="p-2.5">卡玛比率</th>
                    <th className="p-2.5">适用市场体制</th>
                    <th className="p-2.5">适用品种板块</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                  {compareData.strategies.map((s, idx) => (
                    <tr key={s.name} className="hover:bg-slate-900/50 transition">
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                          <span className="font-semibold text-slate-100">{s.chinese_name}</span>
                          <span className="font-mono text-[10px] text-slate-500">({s.name})</span>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-indigo-400">{s.sharpe}</td>
                      <td className="p-2.5 font-mono text-emerald-400">{(s.win_rate * 100).toFixed(1)}%</td>
                      <td className="p-2.5 font-mono text-rose-400">{(s.max_drawdown * 100).toFixed(1)}%</td>
                      <td className="p-2.5 font-mono text-cyan-400">{s.calmar}</td>
                      <td className="p-2.5">
                        <div className="flex gap-1">
                          {s.regimes.map(r => (
                            <Tag key={r} color="blue" className="text-[10px] m-0">{r}</Tag>
                          ))}
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-400">
                        {s.suitable_assets.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 弹窗 2：多策略组合收益回测与权重配置 (Portfolio Backtest) */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-100">
            <FundProjectionScreenOutlined className="text-emerald-400 text-lg" />
            <span className="font-bold text-base">多策略合成组合回测与对冲评估</span>
            <Tag color="cyan" className="text-xs ml-2">
              {selectedStrategies.length} 策略组合
            </Tag>
          </div>
        }
        open={portfolioVisible}
        onCancel={() => setPortfolioVisible(false)}
        footer={null}
        width={960}
        className="dark-modal"
      >
        <div className="space-y-4">
          {/* 配置栏：分配模式与标的 */}
          <Card size="small" className="bg-slate-900/90 border-slate-800 text-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-5">
                <label className="text-xs text-slate-400 block mb-1">仓位资产分配算法 (Allocation Method)</label>
                <Radio.Group
                  size="small"
                  value={allocationMethod}
                  onChange={(e) => {
                    const m = e.target.value;
                    setAllocationMethod(m);
                    executePortfolioBacktest(m);
                  }}
                  className="w-full flex"
                >
                  <Radio.Button value="equal_weight" className="flex-1 text-center text-xs">等权重 (1/N)</Radio.Button>
                  <Radio.Button value="sharpe_weighted" className="flex-1 text-center text-xs">夏普加权</Radio.Button>
                  <Radio.Button value="risk_parity" className="flex-1 text-center text-xs">风险平价 (逆波动)</Radio.Button>
                  <Radio.Button value="custom" className="flex-1 text-center text-xs">自定义权重</Radio.Button>
                </Radio.Group>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs text-slate-400 block mb-1">测试期货标的</label>
                <Select
                  size="small"
                  value={portfolioSymbol}
                  onChange={(val) => {
                    setPortfolioSymbol(val);
                    executePortfolioBacktest(allocationMethod);
                  }}
                  className="w-full"
                  options={[
                    { label: '螺纹钢主力 (RB)', value: 'RB' },
                    { label: '沪深300主力 (IF)', value: 'IF' },
                    { label: '沪铜主力 (CU)', value: 'CU' },
                    { label: '原油主力 (SC)', value: 'SC' }
                  ]}
                />
              </div>

              <div className="md:col-span-4 flex items-end justify-end">
                <Button
                  type="primary"
                  size="small"
                  loading={portfolioLoading}
                  onClick={() => executePortfolioBacktest(allocationMethod)}
                  className="bg-indigo-600 hover:bg-indigo-500 font-medium h-7"
                >
                  重新计算合成曲线
                </Button>
              </div>
            </div>

            {/* 自定义权重调节滑块 */}
            {allocationMethod === 'custom' && (
              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedStrategies.map((name, idx) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                    <span className="text-xs text-slate-300 font-mono w-28 truncate">{name}</span>
                    <Slider
                      min={0}
                      max={100}
                      value={customWeights[name] || 20}
                      onChange={(v) => setCustomWeights(prev => ({ ...prev, [name]: v }))}
                      className="flex-1 m-0"
                    />
                    <span className="text-xs font-mono text-indigo-400 w-10 text-right">{customWeights[name] || 20}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {portfolioLoading ? (
            <div className="py-16 text-center">
              <Spin tip="正在并行模拟各策略日频 PnL、计算协方差矩阵并合成多策略净值曲线..." />
            </div>
          ) : portfolioData ? (
            <div className="space-y-4">
              {/* 组合核心 KPI 指标卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400">组合总收益率</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    {portfolioData.portfolio_metrics.total_return_pct > 0 ? '+' : ''}
                    {portfolioData.portfolio_metrics.total_return_pct}%
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400">组合夏普比率</div>
                  <div className="text-lg font-bold font-mono text-indigo-400 mt-0.5">
                    {portfolioData.portfolio_metrics.sharpe_ratio}
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400">组合最大回撤</div>
                  <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                    {portfolioData.portfolio_metrics.max_drawdown_pct}%
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400">月度胜率</div>
                  <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                    {(portfolioData.portfolio_metrics.win_rate * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg text-center">
                  <div className="text-[11px] text-slate-400">组合年化波动率</div>
                  <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
                    {portfolioData.portfolio_metrics.volatility_annual_pct}%
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg text-center relative overflow-hidden">
                  <div className="text-[11px] text-slate-400">分散化收益倍率</div>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                    {portfolioData.portfolio_metrics.diversification_ratio}x
                  </div>
                  <div className="text-[9px] text-slate-500">波动压缩收益</div>
                </div>
              </div>

              {/* 组合净值走势 vs 单策略对照折线图 */}
              <Card
                size="small"
                className="bg-slate-950/70 border-slate-800 text-slate-200"
                title={
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      组合净值走势 vs 单策略独立曲线对比
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-3 h-1 bg-indigo-500 rounded"></span>
                      <span className="text-[11px] text-slate-300 font-bold">合成组合 (加粗)</span>
                    </div>
                  </div>
                }
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={portfolioData.equity_curve} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 6, fontSize: 11 }}
                        formatter={(val: any) => [`¥${Number(val).toLocaleString()}`]}
                      />
                      {/* 单策略曲线 */}
                      {portfolioData.strategies.map((s, idx) => (
                        <Line
                          key={s.name}
                          type="monotone"
                          dataKey={s.name}
                          name={s.chinese_name}
                          stroke={s.color}
                          strokeWidth={1}
                          strokeOpacity={0.65}
                          dot={false}
                        />
                      ))}
                      {/* 组合加粗曲线 */}
                      <Line
                        type="monotone"
                        dataKey="portfolio_equity"
                        name="组合净值 (Portfolio)"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={false}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* 收益相关性矩阵与配置权重 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* 策略收益相关性矩阵 */}
                <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-lg p-3">
                  <div className="text-xs font-semibold text-slate-200 mb-2 flex items-center justify-between">
                    <span>策略间收益相关性矩阵 (Correlation Matrix)</span>
                    <span className="text-[10px] text-slate-400">低相关性 (绿色) = 优质对冲</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs font-mono">
                      <thead>
                        <tr>
                          <th className="p-1 text-slate-500 text-left">策略</th>
                          {portfolioData.correlation_matrix.strategies.map(s => (
                            <th key={s} className="p-1 text-slate-400 max-w-[70px] truncate text-[10px]">{s}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioData.correlation_matrix.strategies.map((sRow, rIdx) => (
                          <tr key={sRow}>
                            <td className="p-1 text-slate-400 text-left truncate max-w-[80px] text-[10px]">{sRow}</td>
                            {portfolioData.correlation_matrix.strategies.map((_, cIdx) => {
                              const corr = portfolioData.correlation_matrix.matrix[rIdx]?.[cIdx] ?? 1.0;
                              const isSelf = rIdx === cIdx;
                              let cellCls = 'bg-slate-900 text-slate-300';
                              if (!isSelf) {
                                if (corr < 0.25) cellCls = 'bg-emerald-900/60 text-emerald-200 font-bold';
                                else if (corr < 0.6) cellCls = 'bg-teal-900/50 text-teal-200';
                                else cellCls = 'bg-amber-900/60 text-amber-200';
                              }
                              return (
                                <td key={cIdx} className="p-1">
                                  <div className={`py-1 px-1.5 rounded ${cellCls}`}>
                                    {corr.toFixed(2)}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 各策略在组合中分配的权重与指标 */}
                <div className="md:col-span-5 bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-200">
                    组合内策略配置权重与贡献
                  </div>
                  <div className="space-y-2">
                    {portfolioData.strategies.map((s, idx) => (
                      <div key={s.name} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                          <div>
                            <div className="font-semibold text-slate-200 text-xs">{s.chinese_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{s.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-indigo-400">{s.weight}% 权重</div>
                          <div className="text-[10px] text-slate-400">
                            夏普 {s.metrics.sharpe_ratio} | 胜率 {(s.metrics.win_rate * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
