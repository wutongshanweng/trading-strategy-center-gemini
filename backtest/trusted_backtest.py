from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from backtest.execution_models import ExecutionConfig, InstrumentSpec, MarketBar, OrderIntent, OrderSide
from backtest.trusted_engine import TrustedExecutionEngine
from signals.base import BaseStrategy, Direction


@dataclass(frozen=True, slots=True)
class TrustedTrade:
    direction: str
    entry_price: float
    exit_price: float
    quantity: int
    net_pnl: float


@dataclass(frozen=True, slots=True)
class TrustedBacktestResult:
    strategy_name: str
    symbol: str
    execution_mode: str
    trades: tuple[TrustedTrade, ...]
    net_pnl: float
    net_return: float
    total_commission: float
    cost_scenarios: dict[str, float]


def run_trusted_backtest(
    frame: pd.DataFrame,
    strategy: BaseStrategy,
    spec: InstrumentSpec,
    initial_equity: float,
) -> TrustedBacktestResult:
    scenario_results = {
        name: _run_scenario(frame, strategy, spec, initial_equity, slippage_ticks)
        for name, slippage_ticks in (("optimistic", 0), ("base", 1), ("stress", 2))
    }
    base_engine, base_trades = scenario_results["base"]
    total_commission = sum(fill.commission for fill in base_engine.fills)
    return TrustedBacktestResult(
        strategy_name=strategy.name,
        symbol=spec.symbol,
        execution_mode="next_open",
        trades=base_trades,
        net_pnl=base_engine.account.realized_pnl - total_commission,
        net_return=(base_engine.account.cash - initial_equity) / initial_equity,
        total_commission=round(total_commission, 4),
        cost_scenarios={
            name: round((engine.account.cash - initial_equity) / initial_equity, 8)
            for name, (engine, _trades) in scenario_results.items()
        },
    )


def _run_scenario(
    frame: pd.DataFrame,
    strategy: BaseStrategy,
    spec: InstrumentSpec,
    initial_equity: float,
    slippage_ticks: int,
) -> tuple[TrustedExecutionEngine, tuple[TrustedTrade, ...]]:
    engine = TrustedExecutionEngine(spec, ExecutionConfig(initial_equity, slippage_ticks))
    fill_cursor = 0
    completed: list[TrustedTrade] = []
    entry_fill = None
    for index in range(49, len(frame)):
        row = frame.iloc[index]
        timestamp = frame.index[index].to_pydatetime()
        engine.process_bar(
            MarketBar(timestamp, float(row.open), float(row.high), float(row.low), float(row.close), float(row.volume))
        )
        new_fills = engine.fills[fill_cursor:]
        fill_cursor = len(engine.fills)
        for fill in new_fills:
            if fill.side in (OrderSide.OPEN_LONG, OrderSide.OPEN_SHORT):
                entry_fill = fill
            elif entry_fill is not None:
                signed = entry_fill.quantity if entry_fill.side is OrderSide.OPEN_LONG else -entry_fill.quantity
                gross = (fill.fill_price - entry_fill.fill_price) * signed * spec.contract_multiplier
                completed.append(
                    TrustedTrade(entry_fill.side.value, entry_fill.fill_price, fill.fill_price, fill.quantity, gross - entry_fill.commission - fill.commission)
                )
                entry_fill = None
        signal = strategy.compute(frame.iloc[: index + 1], spec.symbol)
        if signal is None or signal.direction is Direction.HOLD:
            continue
        side = _order_side(signal.direction, engine.position.quantity)
        if side is not None:
            engine.submit(OrderIntent(spec.symbol, side, 1, timestamp))
    return engine, tuple(completed)


def _order_side(direction: Direction, position: int) -> OrderSide | None:
    if direction is Direction.BUY and position == 0:
        return OrderSide.OPEN_LONG
    if direction is Direction.SELL and position > 0:
        return OrderSide.CLOSE_LONG
    if direction is Direction.SELL and position == 0:
        return OrderSide.OPEN_SHORT
    if direction is Direction.BUY and position < 0:
        return OrderSide.CLOSE_SHORT
    return None
