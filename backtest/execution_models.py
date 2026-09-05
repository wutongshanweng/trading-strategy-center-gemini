from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class OrderSide(str, Enum):
    OPEN_LONG = "open_long"
    CLOSE_LONG = "close_long"
    OPEN_SHORT = "open_short"
    CLOSE_SHORT = "close_short"


@dataclass(frozen=True, slots=True)
class InstrumentSpec:
    symbol: str
    asset_type: str
    exchange: str
    contract_multiplier: float
    tick_size: float
    lot_size: int
    initial_margin_rate: float
    maintenance_margin_rate: float
    commission_rate: float
    commission_type: str = "ratio"
    commission_fixed: float = 0.0


@dataclass(frozen=True, slots=True)
class ExecutionConfig:
    initial_equity: float
    slippage_ticks: int = 1


@dataclass(frozen=True, slots=True)
class MarketBar:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    limit_up: float | None = None
    limit_down: float | None = None


@dataclass(frozen=True, slots=True)
class OrderIntent:
    symbol: str
    side: OrderSide
    quantity: int
    signal_time: datetime


@dataclass(frozen=True, slots=True)
class Fill:
    side: OrderSide
    quantity: int
    fill_price: float
    commission: float
    timestamp: datetime


@dataclass(frozen=True, slots=True)
class Rejection:
    side: OrderSide
    quantity: int
    reason: str
    timestamp: datetime


@dataclass(frozen=True, slots=True)
class Position:
    quantity: int = 0
    average_price: float = 0.0


@dataclass(frozen=True, slots=True)
class AccountSnapshot:
    cash: float
    realized_pnl: float
    margin_used: float
    available_equity: float
    unrealized_pnl: float = 0.0
    equity: float = 0.0
    maintenance_call: bool = False
