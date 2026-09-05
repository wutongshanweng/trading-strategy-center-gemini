import { db } from '../db/index.js';
import { manual_positions, market_bars, exit_alerts } from '../db/schema.js';
import { sql, eq, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { realtimeQuoteService } from './realtimeQuoteService.js';
import { getContractSpec } from './chinaFuturesMaster.js';

export interface AlertTriggerEvent {
  positionId: string;
  symbol: string;
  alertType: 'STOP_LOSS' | 'TAKE_PROFIT' | 'MAX_HOLD_TIME' | 'STRATEGY_REVERSAL';
  currentPrice: number;
  triggerPrice: number;
  pnlAmount: number;
  pnlRate: number;
  message: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

export class PositionAlertEngine {

  /**
   * 查询当前全部人工真实持仓及其实时监控状态
   */
  public async getActivePositionsWithAlerts() {
    const positions = await db.select().from(manual_positions)
      .where(eq(manual_positions.current_status, 'open'))
      .orderBy(desc(manual_positions.created_at));

    const enriched = [];
    const triggeredAlerts: AlertTriggerEvent[] = [];

    for (const pos of positions) {
      // 优先从实时行情接口获取最新市价，其次从 market_bars，最后以开仓价兜底
      let curPrice = Number(pos.entry_price);
      try {
        const quote = await realtimeQuoteService.getRealtimeQuote(pos.contract);
        if (quote && typeof quote.latestPrice === 'number' && quote.latestPrice > 0) {
          curPrice = quote.latestPrice;
        } else {
          const lastBar = await db.select().from(market_bars)
            .where(eq(market_bars.contract, pos.contract))
            .orderBy(desc(market_bars.bar_start))
            .limit(1);
          if (lastBar.length > 0) {
            curPrice = Number(lastBar[0].close);
          }
        }
      } catch (e) {
        // 出现异常时从 market_bars 兜底
        const lastBar = await db.select().from(market_bars)
          .where(eq(market_bars.contract, pos.contract))
          .orderBy(desc(market_bars.bar_start))
          .limit(1);
        if (lastBar.length > 0) {
          curPrice = Number(lastBar[0].close);
        }
      }

      const entryPrice = Number(pos.entry_price);
      const direction = pos.direction; // LONG or SHORT
      const volume = Number(pos.lots);
      const spec = getContractSpec(pos.contract);
      const mult = spec?.multiplier || 10; // 真实合约乘数

      // 计算浮动盈亏
      const priceDiff = direction === 'LONG' ? (curPrice - entryPrice) : (entryPrice - curPrice);
      const floatingPnl = priceDiff * mult * volume;
      const pnlRate = entryPrice > 0 ? (priceDiff / entryPrice) * 100 : 0;

      // 规则监控 1: 止损触发
      if (pos.stop_price) {
        const stopPrice = Number(pos.stop_price);
        const isStopLossTriggered = direction === 'LONG' ? curPrice <= stopPrice : curPrice >= stopPrice;
        if (isStopLossTriggered) {
          triggeredAlerts.push({
            positionId: pos.position_id,
            symbol: pos.contract,
            alertType: 'STOP_LOSS',
            currentPrice: curPrice,
            triggerPrice: stopPrice,
            pnlAmount: floatingPnl,
            pnlRate,
            message: `⚠️ [止损预警] ${pos.contract} 当前价 ${curPrice} 触及止损线 ${stopPrice}! 浮亏: ${floatingPnl.toFixed(0)}元 (${pnlRate.toFixed(2)}%)`,
            urgency: 'HIGH',
            createdAt: new Date().toISOString()
          });
        }
      }

      // 规则监控 2: 止盈触发
      if (pos.take_profit_price) {
        const tpPrice = Number(pos.take_profit_price);
        const isTpTriggered = direction === 'LONG' ? curPrice >= tpPrice : curPrice <= tpPrice;
        if (isTpTriggered) {
          triggeredAlerts.push({
            positionId: pos.position_id,
            symbol: pos.contract,
            alertType: 'TAKE_PROFIT',
            currentPrice: curPrice,
            triggerPrice: tpPrice,
            pnlAmount: floatingPnl,
            pnlRate,
            message: `🎯 [止盈预警] ${pos.contract} 当前价 ${curPrice} 达到目标止盈线 ${tpPrice}! 浮盈: ${floatingPnl.toFixed(0)}元 (+${pnlRate.toFixed(2)}%)`,
            urgency: 'MEDIUM',
            createdAt: new Date().toISOString()
          });
        }
      }

      enriched.push({
        position_id: pos.position_id,
        symbol: pos.contract,
        product: pos.product,
        direction: pos.direction,
        volume: pos.lots,
        entry_price: pos.entry_price,
        stop_loss_price: pos.stop_price,
        take_profit_price: pos.take_profit_price,
        currentPrice: curPrice,
        floatingPnl,
        pnlRate: Number(pnlRate.toFixed(2)),
        isStopLossNear: pos.stop_price ? Math.abs(curPrice - Number(pos.stop_price)) / curPrice < 0.01 : false
      });
    }

    return {
      activeCount: positions.length,
      positions: enriched,
      alerts: triggeredAlerts
    };
  }

  /**
   * 人工开仓录入接口
   */
  public async createManualPosition(data: {
    symbol: string;
    direction: 'LONG' | 'SHORT';
    entryPrice?: number;
    entry_price?: number;
    volume?: number;
    lots?: number;
    stopLossPrice?: number;
    stopPrice?: number;
    takeProfitPrice?: number;
    take_profit_price?: number;
    notes?: string;
  }) {
    const symbol = (data.symbol || '').toUpperCase();
    const direction = data.direction;
    const entryPrice = Number(data.entryPrice ?? data.entry_price ?? 0);
    const volume = Number(data.volume ?? data.lots ?? 1);
    const positionId = `POS-${symbol}-${Date.now().toString().slice(-6)}`;
    const product = symbol.replace(/[0-9]/g, '').toUpperCase();
    const exchange = product === 'FG' || product === 'MA' ? 'CZCE' : (product === 'M' ? 'DCE' : 'SHFE');
    const stopPrice = Number(data.stopLossPrice ?? data.stopPrice ?? (direction === 'LONG' ? entryPrice * 0.98 : entryPrice * 1.02));
    const tpPrice = (data.takeProfitPrice ?? data.take_profit_price) ? Number(data.takeProfitPrice ?? data.take_profit_price) : null;
    const maxHold = new Date(Date.now() + 30 * 86400000);
    const signalId = data.notes ? String(data.notes).slice(0, 64) : null;

    await db.execute(sql`
      INSERT INTO manual_positions (
        position_id, account_alias, exchange, product, contract, direction, lots,
        entry_time, entry_price, entry_signal_id, stop_price, take_profit_price, maximum_holding_until,
        current_status, manually_confirmed, created_at
      ) VALUES (
        ${positionId}, 'MAIN-ACCOUNT', ${exchange}, ${product}, ${symbol}, ${direction}, ${volume},
        NOW(), ${entryPrice}, ${signalId}, ${stopPrice}, ${tpPrice}, ${maxHold},
        'open', true, NOW()
      );
    `);

    return { status: 'ok', positionId };
  }

  /**
   * 平仓结算
   */
  public async closePosition(positionId: string, exitPrice: number) {
    const rows = await db.select().from(manual_positions).where(eq(manual_positions.position_id, positionId));
    if (rows.length === 0) throw new Error(`未找到持仓 ID: ${positionId}`);
    
    const pos = rows[0];
    const spec = getContractSpec(pos.contract);
    const mult = spec?.multiplier || 10;
    const priceDiff = pos.direction === 'LONG' ? (exitPrice - Number(pos.entry_price)) : (Number(pos.entry_price) - exitPrice);
    const realizedPnl = priceDiff * mult * Number(pos.lots);

    await db.execute(sql`
      UPDATE manual_positions
      SET current_status = 'closed', exit_time = NOW(), exit_price = ${exitPrice}, realized_pnl = ${realizedPnl}
      WHERE position_id = ${positionId};
    `);

    return { status: 'ok', positionId, realizedPnl };
  }
}

export const positionAlertEngine = new PositionAlertEngine();
