import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  ShieldCheck,
  Percent
} from 'lucide-react';

interface PositionsRiskControlProps {
  initialSymbol?: string;
  initialDirection?: 'LONG' | 'SHORT';
  initialEntryPrice?: number | string;
  initialVolume?: number | string;
  initialStopLoss?: number | string;
  initialTakeProfit?: number | string;
  initialNotes?: string;
}

export function PositionsRiskControl({
  initialSymbol,
  initialDirection,
  initialEntryPrice,
  initialVolume,
  initialStopLoss,
  initialTakeProfit,
  initialNotes
}: PositionsRiskControlProps = {}) {
  const [positionsData, setPositionsData] = useState<any>(null);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [newSymbol, setNewSymbol] = useState(initialSymbol || 'RB2701');
  const [newDirection, setNewDirection] = useState<'LONG' | 'SHORT'>(initialDirection || 'LONG');
  const [newEntryPrice, setNewEntryPrice] = useState(initialEntryPrice ? String(initialEntryPrice) : '3180');
  const [newVolume, setNewVolume] = useState(initialVolume ? String(initialVolume) : '2');
  const [newStopLoss, setNewStopLoss] = useState(initialStopLoss ? String(initialStopLoss) : '3130');
  const [newTakeProfit, setNewTakeProfit] = useState(initialTakeProfit ? String(initialTakeProfit) : '3340');

  // 当外部传入的初始值变化时同步
  useEffect(() => {
    if (initialSymbol) setNewSymbol(initialSymbol);
    if (initialDirection) setNewDirection(initialDirection);
    if (initialEntryPrice) setNewEntryPrice(String(initialEntryPrice));
    if (initialVolume) setNewVolume(String(initialVolume));
    if (initialStopLoss) setNewStopLoss(String(initialStopLoss));
    if (initialTakeProfit) setNewTakeProfit(String(initialTakeProfit));
  }, [initialSymbol, initialDirection, initialEntryPrice, initialVolume, initialStopLoss, initialTakeProfit]);

  // Fetch Positions & Alerts
  const fetchPositions = async () => {
    setLoadingPositions(true);
    try {
      const res = await fetch('/api/v1/modules/positions/active');
      const json = await res.json();
      if (json.status === 'ok') setPositionsData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPositions(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    // 5秒轮询一次持仓现价与风控状态
    const pollInterval = setInterval(() => {
      fetchPositions();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // Handle Add Position
  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/modules/positions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: newSymbol,
          direction: newDirection,
          entryPrice: parseFloat(newEntryPrice),
          volume: parseInt(newVolume, 10),
          stopLossPrice: newStopLoss ? parseFloat(newStopLoss) : undefined,
          takeProfitPrice: newTakeProfit ? parseFloat(newTakeProfit) : undefined,
          notes: '人工手动开仓跟踪'
        })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        fetchPositions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Close Position
  const handleClosePosition = async (posId: string, currentPrice: number) => {
    try {
      const res = await fetch('/api/v1/modules/positions/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: posId, exitPrice: currentPrice })
      });
      const json = await res.json();
      if (json.status === 'ok') {
        fetchPositions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              人工持仓风控与出场预警系统 (Position Risk Monitor)
              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded-full font-mono">
                在监持仓: {positionsData?.activeCount ?? 0} 笔
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              实时跟踪实盘或模拟持仓的浮动盈亏，自动演算多维度动态止损/止盈阈值触发情况。
            </p>
          </div>
        </div>

        <button
          onClick={fetchPositions}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingPositions ? 'animate-spin text-indigo-400' : ''}`} />
          <span>刷新持仓</span>
        </button>
      </div>

      {/* Active Alerts Banner */}
      {positionsData?.alerts && positionsData.alerts.length > 0 && (
        <div className="space-y-2">
          {positionsData.alerts.map((alert: any, idx: number) => (
            <div key={idx} className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                <span className="text-rose-200 font-bold">{alert.message}</span>
              </div>
              <span className="text-[10px] text-rose-300/80 font-mono">{alert.createdAt?.slice(11, 19) || ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Manual Entry Form */}
      <form onSubmit={handleAddPosition} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4 text-indigo-400" />
          <span>录入人工持仓 (启用动态止损/止盈出场监控):</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">合约代码</label>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">方向</label>
            <select
              value={newDirection}
              onChange={(e: any) => setNewDirection(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
            >
              <option value="LONG">做多 (LONG)</option>
              <option value="SHORT">做空 (SHORT)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">开仓均价</label>
            <input
              type="number"
              step="any"
              value={newEntryPrice}
              onChange={(e) => setNewEntryPrice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">持仓手数</label>
            <input
              type="number"
              value={newVolume}
              onChange={(e) => setNewVolume(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">止损价 (触发预警)</label>
            <input
              type="number"
              step="any"
              value={newStopLoss}
              onChange={(e) => setNewStopLoss(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-rose-300 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">止盈价 (触发预警)</label>
            <input
              type="number"
              step="any"
              value={newTakeProfit}
              onChange={(e) => setNewTakeProfit(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-emerald-300 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            加入持仓监控池
          </button>
        </div>
      </form>

      {/* Active Positions Table */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-white">当前在监持仓明细 ({positionsData?.positions?.length ?? 0}):</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2">持仓ID</th>
                <th className="p-2">合约代码</th>
                <th className="p-2">持仓方向</th>
                <th className="p-2">手数</th>
                <th className="p-2">开仓均价 (参考价)</th>
                <th className="p-2">实时现价 (行情)</th>
                <th className="p-2">浮动盈亏</th>
                <th className="p-2">止损/止盈风控线</th>
                <th className="p-2">跟单来源/备注</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {positionsData?.positions?.map((pos: any) => (
                <tr key={pos.position_id} className="hover:bg-slate-900/40">
                  <td className="p-2 text-slate-500">{pos.position_id}</td>
                  <td className="p-2 font-bold text-white flex items-center gap-1.5">
                    <span>{pos.symbol}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({pos.product})</span>
                  </td>
                  <td className="p-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      pos.direction === 'LONG' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {pos.direction === 'LONG' ? '多头 LONG' : '空头 SHORT'}
                    </span>
                  </td>
                  <td className="p-2 text-slate-200">{pos.volume} 手</td>
                  <td className="p-2 text-amber-300 font-bold">¥{pos.entry_price}</td>
                  <td className="p-2 text-cyan-300 font-bold">¥{pos.currentPrice}</td>
                  <td className={`p-2 font-bold ${pos.floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pos.floatingPnl >= 0 ? `+¥${pos.floatingPnl.toFixed(0)}` : `-¥${Math.abs(pos.floatingPnl).toFixed(0)}`} ({pos.pnlRate > 0 ? '+' : ''}{pos.pnlRate}%)
                  </td>
                  <td className="p-2 text-slate-300">
                    <span className="text-rose-400">止损: ¥{pos.stop_loss_price ?? '--'}</span>
                    <span className="text-slate-600 mx-1">|</span>
                    <span className="text-emerald-400">止盈: ¥{pos.take_profit_price ?? '--'}</span>
                  </td>
                  <td className="p-2 text-slate-400 max-w-[140px] truncate" title={pos.notes || ''}>
                    {pos.notes || '模型信号跟单'}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleClosePosition(pos.position_id, pos.currentPrice)}
                      className="px-2 py-0.5 bg-rose-900/60 hover:bg-rose-700 text-rose-200 border border-rose-700/40 rounded text-[10px] cursor-pointer"
                    >
                      平仓结算
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
