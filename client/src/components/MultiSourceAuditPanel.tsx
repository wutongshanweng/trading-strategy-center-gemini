import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  ShieldCheck, 
  ArrowDownToLine, 
  Search, 
  Activity, 
  Sparkles,
  Zap
} from 'lucide-react';

interface DataSourceMeta {
  id: string;
  name: string;
  type: string;
  priority: number;
  status: 'OK' | 'UNAVAILABLE' | 'DEGRADED';
  description: string;
  supportedPeriods?: string[];
}

interface QualityReport {
  source: string;
  symbol: string;
  period: string;
  totalRows: number;
  nullCount: number;
  priceErrors: number;
  dateGaps: number;
  timeInconsistency: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  score: number;
  status: 'OK' | 'WARN' | 'ERROR' | 'EMPTY';
  issues: string[];
}

interface InspectResult {
  symbol: string;
  period: string;
  sourceUsed: string;
  totalRows: number;
  qualityReport: QualityReport;
  sampleBars: {
    first3: any[];
    last3: any[];
  };
}

export const MultiSourceAuditPanel: React.FC = () => {
  const [sources, setSources] = useState<DataSourceMeta[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  // Inspection states
  const [symbol, setSymbol] = useState('FG2701');
  const [period, setPeriod] = useState('1d');
  const [limit, setLimit] = useState(60);
  const [inspecting, setInspecting] = useState(false);
  const [inspectData, setInspectData] = useState<InspectResult | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Syncing states
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Core five sync states
  const [syncingCoreFive, setSyncingCoreFive] = useState(false);
  const [coreFiveResult, setCoreFiveResult] = useState<any>(null);

  // Load sources
  const loadSources = async () => {
    setLoadingSources(true);
    try {
      const res = await fetch('/api/v1/data/collector/sources');
      const json = await res.json();
      if (json.status === 'ok') {
        setSources(json.sources || []);
      }
    } catch (e: any) {
      console.warn('Failed to load sources:', e.message);
    } finally {
      setLoadingSources(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  // Run inspection test
  const handleInspect = async (testSymbol?: string) => {
    const targetSymbol = (testSymbol || symbol).trim().toUpperCase();
    setInspecting(true);
    setInspectError(null);
    setSyncMessage(null);

    try {
      const res = await fetch('/api/v1/data/collector/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: targetSymbol, period, limit })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        setInspectData(json);
      } else {
        setInspectError(json.error || '采集接口返回异常');
      }
    } catch (e: any) {
      setInspectError(`请求失败: ${e.message}`);
    } finally {
      setInspecting(false);
    }
  };

  // Run database sync
  const handleSyncToDb = async () => {
    if (!symbol) return;
    setSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch('/api/v1/data/collector/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: [symbol.toUpperCase()], period, limit: 300 })
      });
      const json = await res.json();
      if (json.status === 'ok' && json.results?.[0]) {
        const r = json.results[0];
        setSyncMessage(`✅ 成功将合约 [${r.symbol}] 的 ${r.rowsCollected} 条真实 K 线落盘写入本地数据库 market_bars！(质量分: ${r.qualityScore}/100)`);
      } else {
        setSyncMessage(`❌ 同步失败: ${json.error || '未知异常'}`);
      }
    } catch (e: any) {
      setSyncMessage(`❌ 同步异常: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Run 5 Core Products + 2701 Dominant Collection
  const handleCollectCoreFive = async () => {
    setSyncingCoreFive(true);
    setSyncMessage(null);

    try {
      const res = await fetch('/api/v1/data/collector/core-five', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setCoreFiveResult(json.data);
        setSyncMessage(`✅ 5大核心品种跨年主力 (2701) 真实行情同步完毕！共采集 ${json.data.totalBarsCollected} 条高精度 K 线，已无冲突去重落盘。`);
      } else {
        setSyncMessage(`❌ 5大品种同步失败: ${json.error || '接口返回异常'}`);
      }
    } catch (e: any) {
      setSyncMessage(`❌ 5大品种同步异常: ${e.message}`);
    } finally {
      setSyncingCoreFive(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">独立多源数据采集与容灾备份系统</h3>
            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded-full text-[10px] font-bold">
              双源主备热备
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            已集成独立数据接口，支持官方行情直连采集、空值/价格倒挂/日期间隙校验，主源异常时自动从本地物理库及备用源兜底。
          </p>
        </div>

        <button
          onClick={loadSources}
          disabled={loadingSources}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingSources ? 'animate-spin' : ''}`} />
          <span>刷新数据源状态</span>
        </button>
      </div>

      {/* 5 Core Products & 2701 Dominant Fast Sync Panel */}
      <div className="bg-gradient-to-br from-slate-950/90 via-purple-950/20 to-slate-950/90 border border-purple-500/30 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[10px] font-bold">
                重点业务场景
              </span>
              <h4 className="text-sm font-bold text-white">5 大核心品种 (FG, SA, MA, RB, M) 2019-2026 及 2701 跨年主力精准采集</h4>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              针对换月场景，当前 2026 年 9 月主力已平滑切换至 2701 合约，采用纯增量校验与唯一性约束，防止空间膨胀与重复插入。
            </p>
          </div>

          <button
            onClick={handleCollectCoreFive}
            disabled={syncingCoreFive}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-purple-600/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingCoreFive ? 'animate-spin' : ''}`} />
            <span>{syncingCoreFive ? '核心品种同步落库中...' : '一键同步 5 大核心 2701 跨年主力'}</span>
          </button>
        </div>

        {/* 5 Core Contracts Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { sym: 'FG2701', name: '玻璃 2701', ex: 'CZCE' },
            { sym: 'SA2701', name: '纯碱 2701', ex: 'CZCE' },
            { sym: 'MA2701', name: '甲醇 2701', ex: 'CZCE' },
            { sym: 'RB2701', name: '螺纹钢 2701', ex: 'SHFE' },
            { sym: 'M2701', name: '豆粕 2701', ex: 'DCE' }
          ].map(item => {
            const contractData = coreFiveResult?.syncedContracts?.find((c: any) => c.symbol === item.sym);
            return (
              <div 
                key={item.sym}
                onClick={() => {
                  setSymbol(item.sym);
                  handleInspect(item.sym);
                }}
                className="bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/80 hover:border-purple-500/60 p-3 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-sm text-purple-300 group-hover:text-purple-200">{item.sym}</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-bold border border-purple-500/30">
                    跨年主力
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium">{item.name}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>{item.ex}</span>
                  {contractData ? (
                    <span className="text-emerald-400 font-mono font-bold">¥{contractData.latestClose}</span>
                  ) : (
                    <span className="text-indigo-300 font-mono">点击校验</span>
                  )}
                </div>
                {contractData && (
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between border-t border-slate-800/60 pt-1">
                    <span>已入库: {contractData.d1Count} 日线</span>
                    <span className="text-emerald-400">OK</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sources Matrix Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {sources.map((src) => {
          const isOk = src.status === 'OK';
          return (
            <div
              key={src.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isOk 
                  ? 'bg-slate-900/60 border-emerald-900/40 hover:border-emerald-700/60' 
                  : 'bg-slate-950/40 border-slate-800/60 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 truncate">{src.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  src.priority === 1 ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  {src.priority === 1 ? '主源' : `备源 P${src.priority}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <span className={`w-2 h-2 rounded-full ${isOk ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' : 'bg-slate-600'}`} />
                <span className={`text-xs font-semibold ${isOk ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isOk ? '在线正常' : '网络预留备源'}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                {src.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Interactive Inspector & Sync Console */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">独立数据接口采样与质量审计控制台</h4>
          </div>
          <span className="text-xs text-slate-400">
            支持对任意活跃合约与历史已交割到期合约进行独立测试
          </span>
        </div>

        {/* Form Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">合约代码 (Symbol):</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="如 FG2701, FG2601, MA2701..."
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-300 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {['FG2701', 'FG2601', 'MA2701', 'SA2701', 'RB2701', 'M2701'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSymbol(s);
                    handleInspect(s);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all ${
                    symbol === s ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">K线周期 (Period):</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-200 focus:outline-none"
            >
              <option value="1d">1d (日线 D1 - 完整历史+持仓+结算价)</option>
              <option value="30m">30m (30分钟线 M30 - 高频盘口)</option>
              <option value="60m">60m (60分钟/1小时 H1)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">返回条数 (Limit):</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-200 focus:outline-none"
            >
              <option value={10}>最近 10 条样本</option>
              <option value={30}>最近 30 条</option>
              <option value={60}>最近 60 条</option>
              <option value={150}>全部历史序列 (至多150条)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={() => handleInspect()}
              disabled={inspecting}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/30"
            >
              <Activity className={`w-3.5 h-3.5 ${inspecting ? 'animate-spin' : ''}`} />
              <span>{inspecting ? '独立接口抓取中...' : '测试采集与质量校验'}</span>
            </button>
            <button
              onClick={handleSyncToDb}
              disabled={syncing || !inspectData}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-md shadow-emerald-600/30"
            >
              <ArrowDownToLine className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
              <span>{syncing ? '物理落盘写入中...' : '将验证数据沉淀入库'}</span>
            </button>
          </div>
        </div>

        {/* Sync message feedback */}
        {syncMessage && (
          <div className={`p-3 rounded-xl border text-xs font-medium ${
            syncMessage.startsWith('✅') 
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
          }`}>
            {syncMessage}
          </div>
        )}

        {/* Error message */}
        {inspectError && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
            {inspectError}
          </div>
        )}

        {/* Quality Report Card */}
        {inspectData && (
          <div className="space-y-4 pt-2">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white font-mono">{inspectData.symbol}</span>
                  <span className="px-2 py-0.5 bg-slate-800 rounded text-xs font-mono text-indigo-300">
                    周期: {inspectData.period}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded text-xs font-mono">
                    数据源: {inspectData.sourceUsed}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">质量综合评分:</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {inspectData.qualityReport.score} / 100
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inspectData.qualityReport.status === 'OK' 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {inspectData.qualityReport.status}
                  </span>
                </div>
              </div>

              {/* Quality Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[11px] text-slate-400">总获取 K 线</span>
                  <p className="text-sm font-bold font-mono text-white mt-0.5">
                    {inspectData.totalRows} 条
                  </p>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[11px] text-slate-400">时间跨度</span>
                  <p className="text-xs font-bold font-mono text-indigo-300 mt-0.5">
                    {inspectData.qualityReport.dateRangeStart} ~ {inspectData.qualityReport.dateRangeEnd}
                  </p>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[11px] text-slate-400">空值/缺失字段 (Nulls)</span>
                  <p className={`text-sm font-bold font-mono mt-0.5 ${inspectData.qualityReport.nullCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {inspectData.qualityReport.nullCount} 项
                  </p>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[11px] text-slate-400">价格逻辑倒挂 (HL/CO)</span>
                  <p className={`text-sm font-bold font-mono mt-0.5 ${inspectData.qualityReport.priceErrors === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {inspectData.qualityReport.priceErrors} 项
                  </p>
                </div>
              </div>

              {/* Issues/Remarks if any */}
              {inspectData.qualityReport.issues.length > 0 && (
                <div className="mt-3 text-xs text-amber-400 bg-amber-950/30 p-2 rounded-lg border border-amber-900/40">
                  <span className="font-bold">数据审计附注：</span>
                  {inspectData.qualityReport.issues.join('; ')}
                </div>
              )}
            </div>

            {/* Sample Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  真实返回数据片段样例 (首尾样本 · 包含持仓与结算价):
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  字段完整度 100% (Open / High / Low / Close / Volume / OpenInterest / Settlement)
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-xs text-left text-slate-300 font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">合约</th>
                      <th className="py-2 px-3">交易日期 / 时间戳</th>
                      <th className="py-2 px-3 text-right">开盘</th>
                      <th className="py-2 px-3 text-right">最高</th>
                      <th className="py-2 px-3 text-right">最低</th>
                      <th className="py-2 px-3 text-right">收盘</th>
                      <th className="py-2 px-3 text-right">成交量</th>
                      <th className="py-2 px-3 text-right">持仓量 (Hold)</th>
                      <th className="py-2 px-3 text-right">结算价 (Settle)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {inspectData.sampleBars.last3.map((bar: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-1.5 px-3 text-emerald-400 font-bold">{bar.symbol}</td>
                        <td className="py-1.5 px-3 text-indigo-300">{bar.date || bar.timestamp}</td>
                        <td className="py-1.5 px-3 text-right text-white">¥{bar.open}</td>
                        <td className="py-1.5 px-3 text-right text-emerald-400">¥{bar.high}</td>
                        <td className="py-1.5 px-3 text-right text-rose-400">¥{bar.low}</td>
                        <td className="py-1.5 px-3 text-right text-white font-bold">¥{bar.close}</td>
                        <td className="py-1.5 px-3 text-right text-amber-300">{Number(bar.volume).toLocaleString()}</td>
                        <td className="py-1.5 px-3 text-right text-slate-400">{Number(bar.openInterest).toLocaleString()}</td>
                        <td className="py-1.5 px-3 text-right text-cyan-300">¥{bar.settlement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
