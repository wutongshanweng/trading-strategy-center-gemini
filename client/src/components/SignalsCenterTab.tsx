import React, { useState, useEffect } from 'react';
import { 
  Activity, Star, ShieldAlert, Zap, TrendingUp, TrendingDown, 
  BookOpen, Layers, Newspaper, ChevronRight, CheckCircle2,
  AlertTriangle, Flame, LayoutDashboard, BrainCircuit, Globe
} from 'lucide-react';

interface SignalsCenterTabProps {
  onSelectSymbol: (sym: string) => void;
}

export function SignalsCenterTab({ onSelectSymbol }: SignalsCenterTabProps) {
  const [activeSignal, setActiveSignal] = useState<any>(null);
  
  // 模拟从后端加载的综合交易信号数据 (基于原有系统数据规范)
  const mockSignals = [
    {
      id: 'SIG-RB-001',
      symbol: 'RB2701',
      name: '螺纹钢',
      direction: 'BUY',
      confidence: 85,
      starRating: 5,
      freshness: '12分钟前',
      status: 'active',
      quality: 'high',
      tradingPlan: {
        entry: 3650,
        stopLoss: 3600,
        takeProfit: 3800,
        riskReward: '1:3'
      },
      resonance: {
        strategy: { 
          total: 90, bullish: 65, bearish: 10, neutral: 15,
          highlights: ['DualMA (金叉)', '缠论 (底分型+一买)', 'BollingerBands (突破中轨)']
        },
        factors: {
          total: 483, netScore: 78, 
          highlights: ['库存偏低 (RankIC: 0.08)', '基差修复 (RankIC: 0.06)', '波动率收敛']
        },
        macro: {
          sentiment: 'positive',
          news: ['宏观调控发力，基建项目加速落地', '铁水产量回升，需求预期向好']
        }
      },
      reason: '多因子共振，缠论确认底部分型，且宏观政策驱动需求预期改善。'
    },
    {
      id: 'SIG-SR-002',
      symbol: 'SR2701',
      name: '白糖',
      direction: 'SELL',
      confidence: 72,
      starRating: 4,
      freshness: '45分钟前',
      status: 'active',
      quality: 'high',
      tradingPlan: {
        entry: 6050,
        stopLoss: 6150,
        takeProfit: 5800,
        riskReward: '1:2.5'
      },
      resonance: {
        strategy: { 
          total: 90, bullish: 12, bearish: 55, neutral: 23,
          highlights: ['MACD (高位死叉)', '缠论 (顶分型)', 'RSI (超买回落)']
        },
        factors: {
          total: 483, netScore: -65, 
          highlights: ['北半球增产预期', '进口利润倒挂缓解', '现货贴水']
        },
        macro: {
          sentiment: 'negative',
          news: ['巴西压榨数据超预期', '国际糖价走弱拖累内盘']
        }
      },
      reason: '外盘走弱带动，国内增产预期强化，技术面顶部特征明显。'
    }
  ];

  useEffect(() => {
    if (mockSignals.length > 0) {
      setActiveSignal(mockSignals[0]);
    }
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity className="w-32 h-32 text-indigo-400" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                综合交易信号枢纽 (Unified Signals Center)
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-mono tracking-widest">
                  QUALITY &gt;= 4★
                </span>
              </h2>
              <p className="text-xs text-indigo-200 mt-1">
                深度融合 <strong className="text-indigo-300">90+ 策略模型 (含缠论)</strong>、<strong className="text-indigo-300">483 维异构因子</strong> 与 <strong className="text-indigo-300">宏观新闻流</strong>，生成高置信度 (&gt;=60%) 交易信号。
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)]">
        {/* Left Panel: Signal List */}
        <div className="lg:col-span-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              高分信号流 (Live)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">共 {mockSignals.length} 个建议</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {mockSignals.map(sig => (
              <div 
                key={sig.id}
                onClick={() => setActiveSignal(sig)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeSignal?.id === sig.id 
                    ? 'bg-indigo-900/40 border-indigo-500 shadow-md shadow-indigo-900/20' 
                    : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest ${
                      sig.direction === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                    }`}>
                      {sig.direction}
                    </span>
                    <span className="font-bold text-white text-sm">{sig.symbol}</span>
                    <span className="text-xs text-slate-400">{sig.name}</span>
                  </div>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < sig.starRating ? 'fill-current' : 'text-slate-700'}`} />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <BrainCircuit className="w-3.5 h-3.5" />
                    置信度: <strong className={sig.confidence >= 80 ? 'text-emerald-400' : 'text-indigo-400'}>{sig.confidence}%</strong>
                  </span>
                  <span className="text-slate-500">{sig.freshness}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Signal Details (The Comprehensive Dashboard) */}
        {activeSignal ? (
          <div className="lg:col-span-8 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-widest ${
                      activeSignal.direction === 'BUY' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                    }`}>
                      {activeSignal.direction}
                    </span>
                    <h2 className="text-xl font-bold text-white">{activeSignal.symbol} <span className="text-slate-400 text-sm font-medium ml-1">({activeSignal.name})</span></h2>
                  </div>
                  <p className="text-sm text-slate-300 mt-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {activeSignal.reason}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-black font-mono text-white mb-1">
                    {activeSignal.confidence}<span className="text-lg text-slate-500">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest">综合置信度</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Trading Plan */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4" /> 严格交易计划 (Trading Plan)
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block">入场参考 (Entry)</span>
                    <p className="text-base font-black font-mono text-slate-100 mt-1">¥{activeSignal.tradingPlan.entry}</p>
                  </div>
                  <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-900/30">
                    <span className="text-[10px] text-rose-400 block">止损 (Stop Loss)</span>
                    <p className="text-base font-black font-mono text-rose-400 mt-1">¥{activeSignal.tradingPlan.stopLoss}</p>
                  </div>
                  <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30">
                    <span className="text-[10px] text-emerald-400 block">止盈 (Take Profit)</span>
                    <p className="text-base font-black font-mono text-emerald-400 mt-1">¥{activeSignal.tradingPlan.takeProfit}</p>
                  </div>
                  <div className="bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/30">
                    <span className="text-[10px] text-indigo-400 block">盈亏比 (R/R)</span>
                    <p className="text-base font-black font-mono text-indigo-300 mt-1">{activeSignal.tradingPlan.riskReward}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 策略共振 */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" /> 策略库共振 (Strategy Resonance)
                  </h3>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-3 text-[11px] text-slate-400">
                      <span>共 {activeSignal.resonance.strategy.total} 个核心策略参评</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full flex overflow-hidden mb-4">
                      <div style={{ width: `${(activeSignal.resonance.strategy.bullish / activeSignal.resonance.strategy.total) * 100}%` }} className="bg-emerald-500"></div>
                      <div style={{ width: `${(activeSignal.resonance.strategy.neutral / activeSignal.resonance.strategy.total) * 100}%` }} className="bg-slate-600"></div>
                      <div style={{ width: `${(activeSignal.resonance.strategy.bearish / activeSignal.resonance.strategy.total) * 100}%` }} className="bg-rose-500"></div>
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 uppercase">关键触发模型:</span>
                      {activeSignal.resonance.strategy.highlights.map((h: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 px-2 py-1.5 rounded-lg border border-slate-700/50">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 因子共振 */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" /> 因子库共振 (Factor Resonance)
                  </h3>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-3 text-[11px] text-slate-400">
                      <span>共 {activeSignal.resonance.factors.total} 个异构因子参评</span>
                      <span className="font-mono text-cyan-400">净得分: {activeSignal.resonance.factors.netScore}</span>
                    </div>
                    
                    <div className="space-y-2 mt-7">
                      <span className="text-[10px] text-slate-500 uppercase">显著生效因子:</span>
                      {activeSignal.resonance.factors.highlights.map((h: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 px-2 py-1.5 rounded-lg border border-slate-700/50">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 宏观新闻流 */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Newspaper className="w-4 h-4 text-amber-400" /> 宏观新闻与情绪 (Macro & Sentiment)
                </h3>
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg border shrink-0 ${
                    activeSignal.resonance.macro.sentiment === 'positive' ? 'bg-emerald-500/20 border-emerald-500/30' :
                    activeSignal.resonance.macro.sentiment === 'negative' ? 'bg-rose-500/20 border-rose-500/30' :
                    'bg-slate-800 border-slate-700'
                  }`}>
                    {activeSignal.resonance.macro.sentiment === 'positive' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> :
                     activeSignal.resonance.macro.sentiment === 'negative' ? <TrendingDown className="w-5 h-5 text-rose-400" /> :
                     <Activity className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="space-y-2 flex-1">
                    {activeSignal.resonance.macro.news.map((n: string, i: number) => (
                      <p key={i} className="text-xs text-slate-300 leading-relaxed border-l-2 border-slate-700 pl-3">
                        {n}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* View in Decision Engine Button */}
              <div className="pt-2 text-right">
                <button
                  onClick={() => onSelectSymbol(activeSignal.symbol)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  在K线决策引擎中查看盘面
                </button>
              </div>

            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col h-full items-center justify-center text-slate-500">
            <Activity className="w-12 h-12 opacity-20 mb-3" />
            <p>从左侧选择一个高分信号查看综合诊断细节</p>
          </div>
        )}
      </div>
    </div>
  );
}
