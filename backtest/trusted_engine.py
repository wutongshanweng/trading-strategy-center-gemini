from __future__ import annotations

from dataclasses import replace

from backtest.execution_models import (
    AccountSnapshot,
    ExecutionConfig,
    Fill,
    InstrumentSpec,
    MarketBar,
    OrderIntent,
    OrderSide,
    Position,
    Rejection,
)


class TrustedExecutionEngine:
    def __init__(self, spec: InstrumentSpec, config: ExecutionConfig) -> None:
        self._spec = spec
        self._config = config
        self._pending: list[OrderIntent] = []
        self._fills: list[Fill] = []
        self._rejections: list[Rejection] = []
        self._position = Position()
        self._cash = config.initial_equity
        self._realized_pnl = 0.0
        self._margin_used = 0.0
        self._last_price = 0.0
        self._unrealized_pnl = 0.0

    @property
    def fills(self) -> tuple[Fill, ...]:
        return tuple(self._fills)

    @property
    def rejections(self) -> tuple[Rejection, ...]:
        return tuple(self._rejections)

    @property
    def position(self) -> Position:
        return self._position

    @property
    def account(self) -> AccountSnapshot:
        return AccountSnapshot(
            cash=round(self._cash, 2),
            realized_pnl=round(self._realized_pnl, 2),
            margin_used=round(self._margin_used, 2),
            available_equity=round(self._cash - self._margin_used, 2),
            unrealized_pnl=round(self._unrealized_pnl, 2),
            equity=round(self._cash + self._unrealized_pnl, 2),
            maintenance_call=self._margin_used > 0 and self._cash + self._unrealized_pnl < self._maintenance_margin(),
        )

    def submit(self, order: OrderIntent) -> None:
        if order.symbol != self._spec.symbol:
            raise KeyError(order.symbol)
        if order.quantity <= 0 or order.quantity % self._spec.lot_size:
            raise ValueError("quantity must be a positive lot multiple")
        self._pending.append(order)

    def process_bar(self, bar: MarketBar) -> None:
        self._mark_to_market(bar.close)
        eligible = [order for order in self._pending if order.signal_time < bar.timestamp]
        self._pending = [order for order in self._pending if order.signal_time >= bar.timestamp]
        for order in eligible:
            if self._is_limit_locked(bar):
                self._rejections.append(Rejection(order.side, order.quantity, "limit_locked", bar.timestamp))
                continue
            self._fill(order, bar)

    def _fill(self, order: OrderIntent, bar: MarketBar) -> None:
        price = self._fill_price(order.side, bar.open)
        notional = price * order.quantity * self._spec.contract_multiplier
        commission = self._commission(notional, order.quantity)
        match order.side:
            case OrderSide.OPEN_LONG:
                self._open(order.quantity, price, commission, direction=1)
            case OrderSide.OPEN_SHORT:
                self._open(order.quantity, price, commission, direction=-1)
            case OrderSide.CLOSE_LONG:
                self._close(order.quantity, price, commission, direction=1)
            case OrderSide.CLOSE_SHORT:
                self._close(order.quantity, price, commission, direction=-1)
        self._fills.append(Fill(order.side, order.quantity, price, commission, bar.timestamp))
        self._mark_to_market(bar.close)

    def _open(self, quantity: int, price: float, commission: float, direction: int) -> None:
        signed_quantity = quantity * direction
        if self._position.quantity not in (0, signed_quantity):
            raise RuntimeError("position scaling and reversal are not supported in this slice")
        required = price * quantity * self._spec.contract_multiplier * self._spec.initial_margin_rate
        if self._cash - self._margin_used < required + commission:
            raise RuntimeError("insufficient available equity")
        self._position = Position(signed_quantity, price)
        self._margin_used = required
        self._cash -= commission

    def _close(self, quantity: int, price: float, commission: float, direction: int) -> None:
        expected = quantity * direction
        if self._position.quantity != expected:
            raise RuntimeError("close quantity does not match open position")
        pnl = (price - self._position.average_price) * expected * self._spec.contract_multiplier
        self._realized_pnl += pnl
        self._cash += pnl - commission
        self._position = replace(self._position, quantity=0, average_price=0.0)
        self._margin_used = 0.0
        self._last_price = 0.0
        self._unrealized_pnl = 0.0

    def _commission(self, notional: float, quantity: int) -> float:
        if self._spec.commission_type == "fixed":
            return self._spec.commission_fixed * quantity
        return notional * self._spec.commission_rate

    def _mark_to_market(self, price: float) -> None:
        self._last_price = price
        if self._position.quantity:
            self._unrealized_pnl = (price - self._position.average_price) * self._position.quantity * self._spec.contract_multiplier
        else:
            self._unrealized_pnl = 0.0

    def _maintenance_margin(self) -> float:
        if not self._position.quantity:
            return 0.0
        return abs(self._position.quantity) * self._last_price * self._spec.contract_multiplier * self._spec.maintenance_margin_rate

    def _fill_price(self, side: OrderSide, open_price: float) -> float:
        ticks = self._config.slippage_ticks * self._spec.tick_size
        match side:
            case OrderSide.OPEN_LONG | OrderSide.CLOSE_SHORT:
                return open_price + ticks
            case OrderSide.CLOSE_LONG | OrderSide.OPEN_SHORT:
                return open_price - ticks

    @staticmethod
    def _is_limit_locked(bar: MarketBar) -> bool:
        if bar.volume > 0 or not (bar.open == bar.high == bar.low == bar.close):
            return False
        return bar.limit_up == bar.close or bar.limit_down == bar.close
