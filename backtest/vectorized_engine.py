from typing import Optional, List, Dict
import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from signals.base import BaseStrategy, Signal, Direction
from signals.engine import StrategyEngine


@dataclass
class BacktestResult:
    strategy_name: str = ""
    symbol: str = ""
    start_date: str = ""
    end_date: str = ""
    total_return: float = 0.0
    annualized_return: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    win_rate: float = 0.0
    total_trades: int = 0
    profit_factor: float = 0.0
    equity_curve: List[float] = field(default_factory=list)
    # 严肃回测新增字段
    total_commission: float = 0.0
    total_slippage: float = 0.0
    margin_used: float = 0.0
    leverage: float = 1.0
    turnover: float = 0.0  # 总成交额
    trades_detail: List[dict] = field(default_factory=list)


class VectorizedBacktest:
    def __init__(
        self,
        initial_capital: float = 1_000_000.0,
        commission_pct: float = 0.0003,
        slippage_pct: float = 0.0,
        leverage: float = 1.0,
        margin_rate: float = 0.12,
        position_pct: float = 0.1,
    ):
        """
        Args:
            initial_capital: 初始资金
            commission_pct: 手续费率 (默认万三, 期货交易所标准)
            slippage_pct: 滑点率 (默认0, 可设 0.0001~0.0005)
            leverage: 杠杆倍数 (默认1, 期货可设10)
            margin_rate: 保证金率 (默认12%, 期货交易所标准)
            position_pct: 单笔仓位比例 (默认10%)
        """
        self.initial_capital = initial_capital
        self.commission_pct = commission_pct
        self.slippage_pct = slippage_pct
        self.leverage = leverage
        self.margin_rate = margin_rate
        self.position_pct = position_pct

    def run(self, df: pd.DataFrame, strategy: BaseStrategy, symbol: str = "") -> BacktestResult:
        result = BacktestResult(strategy_name=strategy.name, symbol=symbol)
        if df.empty or len(df) < 50:
            return result

        signals = []
        for i in range(50, len(df)):
            chunk = df.iloc[:i + 1]
            sig = strategy.compute(chunk, symbol)
            if sig and sig.direction != Direction.HOLD:
                sig.timestamp = chunk.index[-1]
                signals.append(sig)

        if not signals:
            return result

        result.start_date = str(df.index[0])[:10]
        result.end_date = str(df.index[-1])[:10]

        capital = self.initial_capital
        position = 0
        entry_price = 0.0
        equity_curve = [capital]
        trades = []
        timestamps = df.index[50:]
        total_commission = 0.0
        total_slippage = 0.0
        turnover = 0.0

        for i, ts in enumerate(timestamps):
            price = df.loc[ts, "close"]
            signal = next((s for s in signals if s.timestamp == ts), None)

            if signal and signal.direction == Direction.BUY and position == 0:
                # 滑点: 买入价上浮
                buy_price = price * (1 + self.slippage_pct)
                # 保证金计算
                margin_required = buy_price * self.position_pct * self.margin_rate * self.leverage
                if capital < margin_required:
                    continue  # 资金不足, 跳过开仓
                position = int(capital * self.position_pct / buy_price)
                entry_price = buy_price
                # 手续费 (开仓)
                commission = position * buy_price * self.commission_pct
                total_commission += commission
                # 滑点成本
                slippage = position * (price * self.slippage_pct)
                total_slippage += slippage
                # 成交额
                turnover += position * buy_price
                capital -= position * buy_price + commission + slippage
                trades.append({
                    "type": "BUY", "price": buy_price, "qty": position,
                    "ts": ts, "commission": commission, "slippage": slippage,
                })
            elif signal and signal.direction == Direction.SELL and position > 0:
                # 滑点: 卖出价下浮
                sell_price = price * (1 - self.slippage_pct)
                pnl = (sell_price - entry_price) * position
                # 手续费 (平仓)
                commission = position * sell_price * self.commission_pct
                total_commission += commission
                # 滑点成本
                slippage = position * (price * self.slippage_pct)
                total_slippage += slippage
                # 成交额
                turnover += position * sell_price
                capital += pnl - commission - slippage
                trades.append({
                    "type": "SELL", "price": sell_price, "qty": position,
                    "pnl": pnl, "ts": ts, "commission": commission, "slippage": slippage,
                })
                position = 0

            # 权益 = 现金 + 持仓市值 (保证金占用)
            margin_used = position * df.loc[ts, "close"] * self.margin_rate * self.leverage if position > 0 else 0
            equity = capital + margin_used
            equity_curve.append(float(equity))

        if position > 0:
            final_price = df.iloc[-1]["close"] * (1 - self.slippage_pct)
            pnl = (final_price - entry_price) * position
            commission = position * final_price * self.commission_pct
            total_commission += commission
            capital += pnl - commission

        equity_series = pd.Series(equity_curve)
        returns = equity_series.pct_change().dropna()
        total_return = (capital - self.initial_capital) / self.initial_capital

        result.total_return = round(float(total_return), 4)
        result.annualized_return = round(float(total_return * (252 / len(returns)) if len(returns) > 0 else 0), 4)
        result.sharpe_ratio = round(float(returns.mean() / returns.std() * np.sqrt(252)), 4) if len(returns) > 1 and returns.std() > 0 else 0.0

        rolling_max = equity_series.expanding().max()
        drawdowns = (equity_series - rolling_max) / rolling_max
        result.max_drawdown = round(float(drawdowns.min()), 4)

        closed_trades = [t for t in trades if "pnl" in t]
        result.total_trades = len(closed_trades)
        if closed_trades:
            wins = sum(1 for t in closed_trades if t["pnl"] > 0)
            gross_profit = sum(t["pnl"] for t in closed_trades if t["pnl"] > 0)
            gross_loss = abs(sum(t["pnl"] for t in closed_trades if t["pnl"] < 0))
            result.win_rate = round(wins / len(closed_trades), 4)
            result.profit_factor = round(gross_profit / gross_loss, 4) if gross_loss > 0 else float("inf")

        result.equity_curve = [round(x, 2) for x in equity_curve]
        result.total_commission = round(total_commission, 2)
        result.total_slippage = round(total_slippage, 2)
        result.turnover = round(turnover, 2)
        result.trades_detail = trades
        return result

    def compare_strategies(self, df: pd.DataFrame, strategies: List[BaseStrategy],
                           symbol: str = "") -> Dict[str, BacktestResult]:
        return {s.name: self.run(df, s, symbol) for s in strategies}
