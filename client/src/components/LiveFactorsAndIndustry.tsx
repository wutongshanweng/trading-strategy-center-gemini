import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Cpu, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Zap, 
  ArrowRight,
  Sparkles,
  Sliders,
  Compass
} from 'lucide-react';

interface LiveFactorsAndIndustryProps {
  onSelectSymbol?: (symbol: string) => void;
  onNavigateToDecision?: (symbol: string) => void;
}

export function LiveFactorsAndIndustry({ onSelectSymbol, onNavigateToDecision }: LiveFactorsAndIndustryProps) {
  const [subTab, setSubTab] = useState<'factors' | 'industry'>('factors');

  // 1. Factor state
  const [dominantContracts, setDominantContracts] = useState<{ symbol: string; name?: string; isDominant?: boolean }[]>([
    { symbol: 'RB2610', name: '螺纹2610' },
    { symbol: 'I2701', name: '铁矿2701' },
    { symbol: 'RU2611', name: '橡胶2611' },
    { symbol: 'ZN2610', name: '沪锌2610' },
    { symbol: 'BU2611', name: '沥青2611' },
    { symbol: 'FG2701', name: '玻璃2701' },
    { symbol: 'M2701', name: '豆粕2701' },
    { symbol: 'MA2701', name: '甲醇2701' }
  ]);
  const [factorSymbol, setFactorSymbol] = useState<string>('RB2610');
  const [factorFreq, setFactorFreq] = useState<'D1' | 'H1' | 'M30'>('H1');
  const [factorResult, setFactorResult] = useState<any>(null);
  const [crossRanking, setCrossRanking] = useState<any[]>([]);
  const [loadingFactor, setLoadingFactor] = useState(false);

  // Load latest dynamic dominant contracts from backend
  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/v1/data/contracts');
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        const rawList = Array.isArray(json.data) ? json.data : (json.data.contracts || []);
        if (rawList.length > 0) {
          const doms = rawList.map((c: any) => ({
            symbol: c.symbol || c.code || c,
            name: c.name || c.symbol || c.code,
            isDominant: c.isDominant ?? true
          }));
          setDominantContracts(doms);
          if (!doms.some((d: any) => d.symbol === factorSymbol)) {
            setFactorSymbol(doms[0].symbol);
          }
        }
      }
    } catch (e) {
      console.warn('Live factors dominant contracts fallback');
    }
  };

  // 2. Industry state
  const [industryProduct, setIndustryProduct] = useState<string>('RB');
  const [industryData, setIndustryData] = useState<any>(null);
  const [crossMatrix, setCrossMatrix] = useState<any[]>([]);
  const [loadingIndustry, setLoadingIndustry] = useState(false);

  // Fetch Factor Data
  const fetchFactors = async (sym: string = factorSymbol, freq: 'D1' | 'H1' | 'M30' = factorFreq) => {
    setLoadingFactor(true);
    try {
      const [fRes, rRes] = await Promise.all([
        fetch(`/api/v1/modules/factors/compute?symbol=${sym}&frequency=${freq}`),
        fetch(`/api/v1/modules/factors/cross-ranking?frequency=${freq === 'M30' ? 'H1' : freq}`)
      ]);
      const fJson = await fRes.json();
      const rJson = await rRes.json();
      if (fJson.status === 'ok') setFactorResult(fJson.data);
      if (rJson.status === 'ok') setCrossRanking(rJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFactor(false);
    }
  };

  // Fetch Industry Data
  const fetchIndustry = async (prod: string = industryProduct) => {
    setLoadingIndustry(true);
    try {
      const [pRes, mRes] = await Promise.all([
        fetch(`/api/v1/modules/industry/profile?product=${prod}`),
        fetch('/api/v1/modules/industry/cross-matrix')
      ]);
      const pJson = await pRes.json();
      const mJson = await mRes.json();
      if (pJson.status === 'ok') setIndustryData(pJson.data);
      if (mJson.status === 'ok') setCrossMatrix(mJson.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingIndustry(false);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchFactors();
    fetchIndustry();
  }, []);

  return (
    <div className="space-y-4 text-slate-200">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('factors')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'factors' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-300" />
            <span>483维全频段因子实时计算与截面打分</span>
          </button>

          <button
            onClick={() => setSubTab('industry')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'industry' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <Network className="w-4 h-4 text-emerald-300" />
            <span>产业链微观画像与多空偏离共振</span>
          </button>
        </div>

        <button
          onClick={() => {
            fetchFactors();
            fetchIndustry();
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-all cursor-pointer"
          title="刷新数据"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingFactor || loadingIndustry ? 'animate-spin text-indigo-400' : ''}`} />
          <span>刷新实时计算</span>
        </button>
      </div>

      {/* 1. QUANT FACTORS & FEATURE COMPUTATION */}
      {subTab === 'factors' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-bold">目标主力合约:</span>
              <div className="flex gap-1.5 flex-wrap">
                {dominantContracts.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      setFactorSymbol(item.symbol);
                      fetchFactors(item.symbol, factorFreq);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      factorSymbol === item.symbol 
                        ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400' 
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>{item.symbol}</span>
                    {item.name && item.name !== item.symbol && (
                      <span className="text-[10px] text-slate-400 font-sans font-normal opacity-80">({item.name.replace(/^[A-Za-z]+/, '')})</span>
                    )}
                  </button>
                ))}
              </div>

              <span className="text-slate-400 font-bold ml-2">计算周期:</span>
              <div className="flex gap-1">
                {(['D1', 'H1', 'M30'] as const).map((fq) => (
                  <button
                    key={fq}
                    onClick={() => {
                      setFactorFreq(fq);
                      fetchFactors(factorSymbol, fq);
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      factorFreq === fq ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {fq}
                  </button>
                ))}
              </div>
            </div>

            {factorResult && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">综合因子得分:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                  factorResult.compositeScore > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  factorResult.compositeScore < 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {factorResult.compositeScore > 0 ? `+${factorResult.compositeScore}` : factorResult.compositeScore} ({factorResult.compositeRating})
                </span>
              </div>
            )}
          </div>

          {/* Factor Cards Grid */}
          {factorResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {factorResult.factors.map((factor: any) => (
                <div key={factor.factorCode} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                      {factor.category}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      factor.signalBias === 'LONG' ? 'bg-emerald-500/20 text-emerald-300' :
                      factor.signalBias === 'SHORT' ? 'bg-rose-500/20 text-rose-300' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {factor.signalBias}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{factor.factorName}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{factor.description}</p>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-500 mr-1">数值:</span>
                      <span className="text-base font-black font-mono text-cyan-300">{factor.value}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Z-Score: <span className="text-slate-200">{factor.zScore}</span> (分位 {factor.quantile}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cross Sectional Ranking Table */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>多品种截面动量与基差强弱排行 (Cross-Sectional Rank)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2">位次</th>
                    <th className="p-2">品种</th>
                    <th className="p-2">主力合约</th>
                    <th className="p-2">综合得分</th>
                    <th className="p-2">评级</th>
                    <th className="p-2">现货基差率(%)</th>
                    <th className="p-2">20期动量(%)</th>
                    <th className="p-2">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {crossRanking.map((item, idx) => (
                    <tr key={item.product} className="hover:bg-slate-900/40">
                      <td className="p-2 font-bold text-slate-400">#{idx + 1}</td>
                      <td className="p-2 font-bold text-white">{item.product}</td>
                      <td className="p-2 text-indigo-300">{item.symbol}</td>
                      <td className={`p-2 font-black ${item.score > 0 ? 'text-emerald-400' : (item.score < 0 ? 'text-rose-400' : 'text-slate-400')}`}>
                        {item.score > 0 ? `+${item.score}` : item.score}
                      </td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                          {item.rating}
                        </span>
                      </td>
                      <td className="p-2 text-cyan-300">{item.basisYield}%</td>
                      <td className="p-2 text-amber-300">{item.momentum20}%</td>
                      <td className="p-2">
                        <button
                          onClick={() => {
                            if (onSelectSymbol) onSelectSymbol(item.symbol);
                            if (onNavigateToDecision) onNavigateToDecision(item.symbol);
                          }}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] cursor-pointer"
                        >
                          决策 →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. INDUSTRY FUNDAMENTALS & SPREADS */}
      {subTab === 'industry' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">查看品种产业链:</span>
              <div className="flex gap-1">
                {['BU', 'RU', 'ZN', 'RB', 'FG', 'M', 'MA'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setIndustryProduct(p);
                      fetchIndustry(p);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      industryProduct === p ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cross Product Bias Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {crossMatrix.map((m) => (
              <div key={m.product} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-base font-black font-mono text-indigo-400">{m.product}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    m.biasScore > 0 ? 'bg-emerald-500/20 text-emerald-300' :
                    m.biasScore < 0 ? 'bg-rose-500/20 text-rose-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {m.fundamentalBias}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>现货基差:</span>
                  <span className="font-mono font-bold text-slate-200">{m.basis} 元/吨</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>即期利润/加工费:</span>
                  <span className="font-mono font-bold text-slate-200">{m.profit} 元/吨</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>开工率:</span>
                  <span className="font-mono font-bold text-slate-200">{m.opRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
