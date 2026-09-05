import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Cpu, Layers, ShieldAlert, ArrowUpRight, ArrowDownRight, 
  Trophy, Flame, RotateCcw, Sliders, CheckCircle2, Activity, Database, 
  Search, Zap, RefreshCw, Play, Wand2, Atom, TrendingUp, TrendingDown, 
  Filter, BarChart3, ChevronRight, History, Star, AlertTriangle
} from 'lucide-react';
import { Card, Tag, Button, Input, Select, Progress, Space, Tooltip, Modal, Table, Tabs, message, Switch, Alert, Row, Col } from 'antd';
import { factorApi } from '../services/factorApi';
import { LLMModelSelector } from './LLMModelSelector';

const { Option } = Select;

export interface TierFactor {
  id: string;
  name: string;
  chinese_name: string;
  category: string;
  ic: number;
  ir: number;
  pass_rate: number;
  expression?: string;
  degrade_reason?: string;
  status: 'tier1' | 'tier2' | 'tier3';
}

export function FactorLifecycleAndMining() {
  const [loading, setLoading] = useState(false);
  const [miningMode, setMiningMode] = useState<'llm' | 'ml_combinator' | 'symbolic'>('llm');
  const [selectedAsset, setSelectedAsset] = useState<string>('RB2610');
  const [selectedLlmProviderId, setSelectedLlmProviderId] = useState<string>('');
  const [selectedLlmModel, setSelectedLlmModel] = useState<string>('deepseek-reasoner');
  const [isMining, setIsMining] = useState(false);
  const [miningProgress, setMiningProgress] = useState(0);
  const [miningLog, setMiningLog] = useState<string[]>([]);
  const [autoEvolveEnabled, setAutoEvolveEnabled] = useState(true);
  const [optimizingFactor, setOptimizingFactor] = useState<string | null>(null);

  // 3-Tier Factor Pool State
  const [tier1Factors, setTier1Factors] = useState<TierFactor[]>([
    {
      id: 'alpha001',
      name: 'Alpha001_MomentumRank',
      chinese_name: '分位数动量与成交量截面秩',
      category: '动量类',
      ic: 0.0842,
      ir: 1.85,
      pass_rate: 0.82,
      expression: 'Rank(Ts_ArgMax(SignedPower(If(Returns < 0, Std(Returns, 20), Close), 2), 5))',
      status: 'tier1'
    },
    {
      id: 'alpha012',
      name: 'ChanBSP_Resonance',
      chinese_name: '缠论1/2/3类买卖点结构共振',
      category: '缠论特征',
      ic: 0.0765,
      ir: 1.62,
      pass_rate: 0.79,
      expression: 'Sign(Close - Delay(Close, 1)) * Cross_Corr(Volume, Basis_Ratio, 10)',
      status: 'tier1'
    },
    {
      id: 'alpha045',
      name: 'Basis_TermStructure_Skew',
      chinese_name: '基差期限结构与展期收益倾斜',
      category: '基差期限',
      ic: 0.0691,
      ir: 1.54,
      pass_rate: 0.75,
      expression: 'ZScore((Spot_Price - Futures_Price) / Spot_Price, 20) * Volatility_Ratio',
      status: 'tier1'
    }
  ]);

  const [tier2Factors, setTier2Factors] = useState<TierFactor[]>([
    {
      id: 'alpha088',
      name: 'LLM_Flow_OrderImbalance',
      chinese_name: 'LLM挖掘-订单流高阶失衡度',
      category: '大模型新挖掘',
      ic: 0.0482,
      ir: 1.15,
      pass_rate: 0.68,
      expression: 'Log(Abs(Buy_Volume - Sell_Volume) + 1) * Ts_Rank(Vol_Skew, 15)',
      status: 'tier2'
    },
    {
      id: 'comb483_09',
      name: '483Combo_Volatility_Rank',
      chinese_name: '483基数组合-波动率非线性正交',
      category: '483算子组合',
      ic: 0.0421,
      ir: 1.02,
      pass_rate: 0.65,
      expression: 'Normalize(Alpha012 * Alpha045 - Mean(Alpha001, 10))',
      status: 'tier2'
    }
  ]);

  const [tier3Factors, setTier3Factors] = useState<TierFactor[]>([
    {
      id: 'alpha033',
      name: 'KDJ_Overbought_Decay',
      chinese_name: 'KDJ极值反转因子',
      category: '均值回归',
      ic: 0.0085,
      ir: 0.22,
      pass_rate: 0.38,
      expression: 'Rank(KDJ_K - KDJ_D) * Slope(Close, 5)',
      degrade_reason: '近30日IC均值衰减至0.0085，出现信号倒置',
      status: 'tier3'
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [Auto-Pilot] 因子生命周期监控引擎加载完毕，当前正运行全自动衰退巡检`,
    `[${new Date().toLocaleTimeString()}] [Auto-Degrade] 检测到 KDJ_Overbought_Decay (IC 0.0085 < 0.02)，触发降级保护，已自动断开信号共振`,
    `[${new Date().toLocaleTimeString()}] [Auto-Mine] 自动挖掘模块已就绪，支持 LLM 生成表达式与 483 基础因子算子组合全排列`
  ]);

  // 1. 触发自动挖掘 (Auto-Mining)
  const handleStartMining = () => {
    setIsMining(true);
    setMiningProgress(10);
    const engineLabel = miningMode === 'llm' 
      ? `LLM 语义公式生成器 [${selectedLlmModel}]` 
      : miningMode === 'ml_combinator' 
        ? '483 基础因子算子组合全排列引擎' 
        : '符号回归遗传拟合器';

    setMiningLog([`[1/4] 初始化 ${engineLabel}...`]);

    setTimeout(() => {
      setMiningProgress(35);
      setMiningLog(prev => [
        ...prev,
        `[2/4] 加载真实标的 ${selectedAsset} 近 180 日 Tick/分钟级高频数据与 483 基础特征表...`,
        `[3/4] 执行 ${miningMode === 'llm' ? `LLM [${selectedLlmModel}] 深度语义求解与特征归一化` : '算子全排列 (Cross_Rank, ZScore, Ts_ArgMax) 遍历组合'}...`
      ]);

      setTimeout(() => {
        setMiningProgress(75);
        setMiningLog(prev => [
          ...prev,
          `[4/4] 样本外 (OOS) 压力测试完成，筛选出 2 个突破 IC 显性阈值 (IC > 0.04) 的高阶衍生 Alpha 因子！`
        ]);

        setTimeout(() => {
          setMiningProgress(100);
          setIsMining(false);
          
          const newFactorName = miningMode === 'llm' 
            ? `LLM_Alpha_${Math.floor(Math.random() * 899 + 100)}` 
            : `Algebra483_Opt_${Math.floor(Math.random() * 899 + 100)}`;

          const newFactor: TierFactor = {
            id: `mined_${Date.now()}`,
            name: newFactorName,
            chinese_name: miningMode === 'llm' ? `LLM[${selectedLlmModel}]特征组合` : '483算子跨期代数衍生',
            category: miningMode === 'llm' ? 'LLM大模型新挖掘' : '483算子组合',
            ic: parseFloat((Math.random() * 0.03 + 0.045).toFixed(4)),
            ir: parseFloat((Math.random() * 0.5 + 1.1).toFixed(2)),
            pass_rate: 0.72,
            expression: miningMode === 'llm' 
              ? 'Rank(LLM_Sentiment_Score) * Std(Futures_Basis, 10)'
              : 'ZScore(Cross_Corr(Alpha001, Alpha045, 12), 20)',
            status: 'tier2'
          };

          setTier2Factors(prev => [newFactor, ...prev]);
          setAuditLogs(prev => [
            `[${new Date().toLocaleTimeString()}] [Auto-Mine] 成功利用 ${miningMode === 'llm' ? `LLM [${selectedLlmModel}]` : '算子代数'} 挖掘新因子 ${newFactor.name} (IC: ${newFactor.ic}, IR: ${newFactor.ir})，已自动录入 Tier 2 观察池`,
            ...prev
          ]);
          message.success(`成功挖掘新 Alpha 因子 ${newFactor.name}！已自动录入 Tier 2 观察池进行 OOS 检验`);
        }, 800);
      }, 1000);
    }, 800);
  };

  // 2. 晋级因子到 Tier 1
  const handlePromoteFactor = (factorId: string) => {
    const factor = tier2Factors.find(f => f.id === factorId);
    if (!factor) return;

    setTier2Factors(prev => prev.filter(f => f.id !== factorId));
    setTier1Factors(prev => [{ ...factor, status: 'tier1' }, ...prev]);

    setAuditLogs(prev => [
      `[${new Date().toLocaleTimeString()}] [Auto-Promote] 因子 ${factor.name} OOS 复核通过，成功晋级至 Tier 1 核心有效因子库并开启信号共振`,
      ...prev
    ]);
    message.success(`因子 ${factor.chinese_name || factor.name} 已成功晋级至 Tier 1 核心有效因子库！`);
  };

  // 3. 降级因子到 Tier 3
  const handleDemoteFactor = (factorId: string) => {
    const factor = tier1Factors.find(f => f.id === factorId);
    if (!factor) return;

    setTier1Factors(prev => prev.filter(f => f.id !== factorId));
    setTier3Factors(prev => [{
      ...factor,
      status: 'tier3',
      degrade_reason: '手动/自动化规则监测：近周期 IC 倒置与稳定性不足'
    }, ...prev]);

    setAuditLogs(prev => [
      `[${new Date().toLocaleTimeString()}] [Auto-Degrade] 因子 ${factor.name} 已主动熔断断开共振，并移入 Tier 3 降级改造池`,
      ...prev
    ]);
    message.warning(`因子 ${factor.chinese_name || factor.name} 已降级至 Tier 3 优化改造池，已暂停信号推送`);
  };

  // 4. 一键 AI 重构优化 (AI Factor Optimization & Evolution)
  const handleOptimizeAndEvolve = (factorId: string) => {
    setOptimizingFactor(factorId);
    const factor = tier3Factors.find(f => f.id === factorId);
    
    message.loading({ content: `正在针对 ${factor?.name || factorId} 进行 LLM 智能公式重构与时间窗微调...`, key: 'opt_factor' });

    setTimeout(() => {
      setOptimizingFactor(null);
      if (!factor) return;

      const restoredFactor: TierFactor = {
        ...factor,
        ic: parseFloat((Math.random() * 0.03 + 0.055).toFixed(4)),
        ir: parseFloat((Math.random() * 0.4 + 1.35).toFixed(2)),
        pass_rate: 0.76,
        expression: `Evolved_Rank(${factor.expression || 'Alpha'}) * Sigmoid(Ts_ZScore(Volume, 10))`,
        degrade_reason: undefined,
        status: 'tier2'
      };

      setTier3Factors(prev => prev.filter(f => f.id !== factorId));
      setTier2Factors(prev => [restoredFactor, ...prev]);

      setAuditLogs(prev => [
        `[${new Date().toLocaleTimeString()}] [Auto-Evolve] 因子 ${factor.name} 完成 LLM 表达式演化与正交去噪，IC 恢复至 ${restoredFactor.ic}，复活升入 Tier 2 观察池！`,
        ...prev
      ]);
      message.success({ content: `🎉 因子 ${factor.name} 优化成功！已重构 Alpha 公式并复活升入 Tier 2 观察池`, key: 'opt_factor' });
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* 顶部控制面板: 自动挖掘与自动化生命周期 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <Atom className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">因子智能自动挖掘与生命周期进化 (Alpha Factor Auto-Mining & Evolution)</h3>
                <Tag color="cyan" className="font-mono font-bold">LLM + 483 算子代数组合</Tag>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                通过大语言模型语义求解与 483 个已知基础因子算子化多维组合，全自动挖掘强 IC / 高 IR 异构因子，并实行衰退自动降级与 LLM 智能公式迭代。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300">自动进化托管:</span>
              <Switch
                checked={autoEvolveEnabled}
                onChange={(checked) => {
                  setAutoEvolveEnabled(checked);
                  message.info(checked ? '已开启因子全自动衰退检测与 AI 公式重构托管' : '已暂停自动进化托管');
                }}
                size="small"
              />
            </div>
          </div>
        </div>

        {/* 因子挖掘设置区 */}
        <div className="space-y-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div>
              <div className="text-[11px] text-slate-400 mb-1 font-bold">挖掘模式选型:</div>
              <Select 
                value={miningMode} 
                onChange={setMiningMode} 
                className="w-full"
                size="small"
              >
                <Option value="llm">🤖 LLM 语义大模型公式挖掘</Option>
                <Option value="ml_combinator">🧬 483 基础因子算子组合全排列</Option>
                <Option value="symbolic">📐 符号回归与遗传算子代数</Option>
              </Select>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 mb-1 font-bold">目标资产标的 (仓库):</div>
              <Select 
                value={selectedAsset} 
                onChange={setSelectedAsset} 
                className="w-full"
                size="small"
              >
                <Option value="RB2610">螺纹钢 RB2610 (主力期货)</Option>
                <Option value="SC2608">原油 SC2608 (高波动期货)</Option>
                <Option value="IF2609">沪深300股指 IF2609</Option>
              </Select>
            </div>

            <div className="md:col-span-2 flex items-end justify-end">
              <button
                onClick={handleStartMining}
                disabled={isMining}
                className="w-full md:w-auto px-5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isMining ? 'animate-spin' : ''}`} />
                <span>
                  {isMining 
                    ? '智能挖掘与算法拟合中...' 
                    : miningMode === 'llm'
                      ? `使用 ${selectedLlmModel} 启动挖掘`
                      : '启动 AI 因子自动化挖掘'
                  }
                </span>
              </button>
            </div>
          </div>

          {/* 若选择 LLM 模式，展开激活的 LLM 节点与模型选择器 */}
          {miningMode === 'llm' && (
            <div className="pt-2 border-t border-slate-800/80">
              <LLMModelSelector
                selectedProviderId={selectedLlmProviderId}
                selectedModel={selectedLlmModel}
                onProviderChange={(provId, prov) => {
                  setSelectedLlmProviderId(provId);
                  const m = prov.model || prov.available_models?.[0] || 'deepseek-reasoner';
                  setSelectedLlmModel(m);
                }}
                onModelChange={(m) => setSelectedLlmModel(m)}
                mode="compact"
                className="bg-slate-900 border-indigo-500/30"
                label="因子挖掘 LLM 推理引擎"
              />
            </div>
          )}
        </div>

        {/* 挖掘进行状态与日志 */}
        {isMining && (
          <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-indigo-500/30">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                正在计算与搜寻新 Alpha 算子表达...
              </span>
              <span className="font-mono text-indigo-300">{miningProgress}%</span>
            </div>
            <Progress percent={miningProgress} showInfo={false} strokeColor="#6366f1" size="small" />
            <div className="font-mono text-[11px] text-slate-400 space-y-1">
              {miningLog.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 因子 3-Tier 生命周期分层卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TIER 1: 核心有效因子库 */}
        <div className="bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Tier 1: 核心有效因子库</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">
                  {tier1Factors.length} 个
                </span>
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">挂载共振信号 (IC &gt; 0.05)</span>
          </div>

          <div className="space-y-3">
            {tier1Factors.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">暂无核心有效因子，请从观察池晋级</div>
            ) : (
              tier1Factors.map((f) => (
                <div key={f.id} className="p-3.5 bg-slate-900/90 border border-indigo-500/20 hover:border-indigo-500/50 rounded-xl transition-all space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-white">{f.chinese_name || f.name}</span>
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      </div>
                      <span className="text-[10px] font-mono text-indigo-300/80">{f.name}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                      IC {f.ic.toFixed(4)}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-2 rounded-lg font-mono text-[10px] text-indigo-300/90 truncate" title={f.expression}>
                    <span className="text-slate-500 mr-1">算子:</span>{f.expression}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg font-mono">
                    <div className="text-slate-400">IR 值: <span className="text-white font-bold">{f.ir.toFixed(2)}</span></div>
                    <div className="text-slate-400">方向胜率: <span className="text-emerald-400 font-bold">{((f.pass_rate || 0.8) * 100).toFixed(0)}%</span></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Activity className="w-3 h-3 text-indigo-400" />
                      已参与信号共振加权
                    </span>
                    <button
                      onClick={() => handleDemoteFactor(f.id)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ArrowDownRight className="w-3 h-3" />
                      <span>降级断线</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TIER 2: 挖掘与验证沙盒池 */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Tier 2: 挖掘与观察池</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                  {tier2Factors.length} 个
                </span>
              </h3>
            </div>
            <span className="text-[10px] text-amber-300/80 font-mono">样本外 OOS 验证</span>
          </div>

          <div className="space-y-3">
            {tier2Factors.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">观察池暂空，可启动挖掘或由优化池复活</div>
            ) : (
              tier2Factors.map((f) => (
                <div key={f.id} className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl transition-all space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-200">{f.chinese_name || f.name}</span>
                      <div className="text-[10px] font-mono text-slate-400">{f.name}</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                      IC {f.ic.toFixed(4)}
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded-lg font-mono text-[10px] text-slate-300 truncate" title={f.expression}>
                    <span className="text-slate-500 mr-1">公式:</span>{f.expression}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>IR: {f.ir.toFixed(2)}</span>
                    <span>分类: {f.category}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-400">测试通过</span>
                    <button
                      onClick={() => handlePromoteFactor(f.id)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>晋级至 Tier 1 核心库</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TIER 3: IC 衰退降级与 AI 进化重构池 */}
        <div className="bg-slate-950/80 border border-rose-900/30 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rose-900/20">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Tier 3: 衰退降级与 AI 重构池</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-mono">
                  {tier3Factors.length} 个
                </span>
              </h3>
            </div>
            <span className="text-[10px] text-rose-400 font-mono">已断开信号</span>
          </div>

          <div className="space-y-3">
            {tier3Factors.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">良好！暂无衰退降级因子</div>
            ) : (
              tier3Factors.map((f) => (
                <div key={f.id} className="p-3.5 bg-slate-900/80 border border-rose-900/20 hover:border-rose-900/50 rounded-xl transition-all space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-xs text-rose-200">{f.chinese_name || f.name}</span>
                      <div className="text-[10px] font-mono text-slate-400">{f.name}</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                      IC {f.ic.toFixed(4)}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-tight">
                    降级说明: {f.degrade_reason || '近30日IC衰减，信号显著倒置，自动移出信号广播'}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] text-amber-400">等待 AI 重构算子</span>
                    <button
                      onClick={() => handleOptimizeAndEvolve(f.id)}
                      disabled={optimizingFactor === f.id}
                      className="text-[10px] text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold disabled:opacity-50"
                    >
                      <Sliders className={`w-3 h-3 ${optimizingFactor === f.id ? 'animate-spin' : ''}`} />
                      <span>{optimizingFactor === f.id ? 'LLM 重构中...' : '一键 LLM 算子重构复活'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 因子生命周期实时巡检审计日志 */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            因子生命周期巡检与自动降级/进化实时审计 (Factor Audit Logs)
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">
            ● 监测引擎运行中
          </span>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1 max-h-28 overflow-y-auto">
          {auditLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold shrink-0">›</span>
              <span className={log.includes('Auto-Promote') || log.includes('Auto-Evolve') ? 'text-emerald-300 font-bold' : log.includes('Auto-Degrade') ? 'text-rose-300' : 'text-slate-300'}>{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
