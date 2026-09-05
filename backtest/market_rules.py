from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time


@dataclass(frozen=True, slots=True)
class MarketRuleContext:
    asset_type: str
    side: str
    timestamp: datetime
    acquired_date: date | None = None
    session_windows: tuple[tuple[str, str], ...] = ()
    suspended: bool = False


@dataclass(frozen=True, slots=True)
class MarketRuleDecision:
    allowed: bool
    reason: str = ""


class ChinaMarketRules:
    def evaluate(self, context: MarketRuleContext) -> MarketRuleDecision:
        if context.suspended:
            return MarketRuleDecision(False, "suspended")
        if (
            context.asset_type == "stock"
            and context.side == "sell"
            and context.acquired_date == context.timestamp.date()
        ):
            return MarketRuleDecision(False, "stock_t_plus_one")
        if context.session_windows and not self._in_session(context.timestamp.time(), context.session_windows):
            return MarketRuleDecision(False, "outside_trading_session")
        return MarketRuleDecision(True)

    @staticmethod
    def _in_session(current: time, windows: tuple[tuple[str, str], ...]) -> bool:
        for start_text, end_text in windows:
            start = time.fromisoformat(start_text)
            end = time.fromisoformat(end_text)
            if start <= end and start <= current <= end:
                return True
            if start > end and (current >= start or current <= end):
                return True
        return False
