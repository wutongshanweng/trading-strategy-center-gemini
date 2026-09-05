"""锦标赛回测编排层 — 让反馈变真 (阶段1)。

把"随机数模拟"替换为真实回测:
  策略目录 → 取 DuckDB 真实 kline → VectorizedBacktest → 真实绩效
  → feedback_loop (回填策略目录, 持久化) + TournamentManager (/standings 真数据)

行情统一从 PostgreSQL 读取，可由 API 或 worker 调用。
"""

from __future__ import annotations

import copy
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd
from loguru import logger

from backtest.vectorized_engine import VectorizedBacktest
from core.config.watchlist import DEFAULT_MAIN_CONTRACT, WATCHLIST_PRODUCTS
from signals.registry import get_strategy


def _resolve_contract(product: str) -> str:
    """Resolve a product code to the current main contract with legacy fallback."""
    code = product.upper()
    try:
        from data_center.knowledge.main_contract_resolver import main_contract
        return main_contract(code)
    except Exception:
        return DEFAULT_MAIN_CONTRACT.get(code, f"{code}2510")


def _load_kline(contract: str, interval: str = "D1", limit: int = 500) -> pd.DataFrame:
    """Load OHLCV from the current PostgreSQL kline schema."""
    from data_center.storage import postgres_store
    store = postgres_store.get_store()
    df = store.query(
        """SELECT k.datetime, k.open, k.high, k.low, k.close, k.volume FROM kline k
           JOIN symbols s ON s.symbol_id = k.symbol_id
           WHERE UPPER(s.code)=UPPER(?) AND k.timeframe=?
           ORDER BY k.datetime DESC LIMIT ?""",
        [contract.upper(), interval, limit],
    )
    if df is None or df.empty:
        return pd.DataFrame()
    return df.sort_values("datetime").reset_index(drop=True).set_index("datetime")


def _instantiate(strategy_name: str):
    """实例化策略类 (拷贝 params 避免共享可变类属性污染)。"""
    import signals.strategies  # noqa: F401  触发 @register 自动加载
    cls = get_strategy(strategy_name)
    if cls is None:
        return None
    inst = cls()
    # params 是类级可变 dict, 实例化后拷贝一份隔离
    inst.params = copy.deepcopy(type(inst).params)
    return inst


class TournamentRunner:
    """对策略目录跑真实回测, 产出标准 results dict 并驱动反馈/排名。"""

    def __init__(self, initial_capital: float = 1_000_000.0):
        self._engine = VectorizedBacktest(initial_capital=initial_capital)

    def backtest_strategy(self, strategy_name: str, contract: str,
                          timeframe: str = "D1") -> Optional[Dict]:
        """单策略单合约回测, 返回绩效 dict。数据不足返回 None。"""
        inst = _instantiate(strategy_name)
        if inst is None:
            return None
        df = _load_kline(contract, timeframe)
        if df.empty or len(df) < 60:
            return None
        res = self._engine.run(df, inst, symbol=contract)
        if res.total_trades == 0:
            return None
        perf = {
            "name": strategy_name, "symbol": contract,
            "sharpe": round(res.sharpe_ratio, 4),
            "win_rate": round(res.win_rate, 4),
            "max_drawdown": round(res.max_drawdown, 4),
            "total_trades": res.total_trades,
            "total_return": round(res.total_return, 4),
            "profit_factor": round(res.profit_factor, 4),
        }
        # 用 equity_curve 算 empyrical 全套风险调整指标 (Sortino/Calmar/Omega 等)
        try:
            from backtest.risk_metrics_ext import full_metrics, is_available
            if is_available() and len(res.equity_curve) > 2:
                eq = pd.Series(res.equity_curve)
                rets = eq.pct_change().dropna().tolist()
                m = full_metrics(rets)
                if m.get("available"):
                    perf["ext_metrics"] = {k: round(v, 4) for k, v in m.items()
                                           if isinstance(v, (int, float))}
        except Exception:
            pass
        return perf

    def run(self, products: Optional[List[str]] = None,
            timeframe: str = "D1") -> Dict:
        """对关注品种的全部目录策略跑回测, 取每策略跨品种最优, 产出 results dict。"""
        from signals.catalog import get_catalog
        products = products or WATCHLIST_PRODUCTS
        catalog = get_catalog()
        strategy_names = [m.name for m in catalog.all()]

        # 每个策略对每个品种主力合约回测, 取该策略最优表现
        best: Dict[str, Dict] = {}
        for sname in strategy_names:
            for p in products:
                contract = _resolve_contract(p)
                try:
                    perf = self.backtest_strategy(sname, contract, timeframe)
                except Exception as e:
                    logger.warning(f"[tournament] backtest {sname}/{contract} failed: {e}")
                    continue
                if perf is None:
                    continue
                cur = best.get(sname)
                if cur is None or perf["sharpe"] > cur["sharpe"]:
                    best[sname] = perf

        results = {
            "id": f"bt_{datetime.now():%Y%m%d%H%M%S}",
            "timestamp": datetime.now().isoformat(),
            "strategies": list(best.values()),
        }
        logger.info(f"[tournament] backtest done: {len(best)} strategies with trades "
                    f"(of {len(strategy_names)} scanned over {len(products)} products)")
        return results

    async def run_and_feedback(self, products: Optional[List[str]] = None) -> Dict:
        """跑回测 → 喂 feedback_loop (回填目录) + TournamentManager (排名)。"""
        results = self.run(products)
        strategies = results["strategies"]

        # 1. 反馈闭环: 回填策略目录 + 下线/加星 (持久化到 data/feedback_log.json)
        from core.feedback_loop import get_feedback_loop
        entry = get_feedback_loop().process_tournament_results(results)

        # 2. 锦标赛排名: 灌真实绩效 (供 /standings)
        from api.routes.tournament_routes import _manager
        replace_results = getattr(_manager, "replace_results", None)
        if callable(replace_results):
            await replace_results(strategies)
        else:
            for s in strategies:
                await _manager.record_result(
                    name=s["name"], sharpe=s["sharpe"], win_rate=s["win_rate"],
                    profit_factor=s["profit_factor"], max_drawdown=s["max_drawdown"],
                    total_trades=s["total_trades"], total_return=s["total_return"])
        await _manager.update_scores()

        return {
            "tournament_id": results["id"],
            "strategies_with_trades": len(strategies),
            "top_strategy": entry.top_strategy, "top_sharpe": entry.top_sharpe,
            "retired": entry.strategies_retired, "starred": entry.strategies_starred,
        }


_runner: Optional[TournamentRunner] = None


def get_runner() -> TournamentRunner:
    global _runner
    if _runner is None:
        _runner = TournamentRunner()
    return _runner
