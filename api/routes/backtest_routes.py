from __future__ import annotations

import asyncio
import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from dataclasses import asdict
from fastapi import APIRouter, HTTPException, Query
from loguru import logger
from pydantic import BaseModel

from backtest.vectorized_engine import VectorizedBacktest
from backtest.execution_models import InstrumentSpec
from backtest.trusted_backtest import run_trusted_backtest
from data_center.storage.postgres_store import get_store
from signals.registry import get_strategy, get_all_strategies

# 触发 @register 所有策略自动加载
import signals.strategies  # noqa: F401

router = APIRouter(prefix="/api/v1/backtest", tags=["backtest"])
_MAX_RESULTS = 1000
_results: list = []


class BacktestRequest(BaseModel):
    symbol: str          # 品种代码如 RB / HC / CU — 自动解析主力合约
    strategy_name: str
    asset_type: str = "futures"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = 250      # 近 N 条 K 线
    initial_capital: float = 1_000_000.0
    # 严肃回测参数
    commission_pct: float = 0.0003   # 手续费率 (期货万三)
    slippage_pct: float = 0.0         # 滑点率 (默认0)
    leverage: float = 1.0             # 杠杆 (期货10, 股票1)
    margin_rate: float = 0.12         # 保证金率 (期货12%)
    position_pct: float = 0.1         # 单笔仓位比例


class TrustedBacktestRequest(BaseModel):
    symbol: str
    strategy_name: str
    asset_type: str = "futures"
    limit: int = 500
    initial_capital: float = 1_000_000.0


def _load_instrument_spec(symbol: str) -> InstrumentSpec:
    product = re.match(r"[A-Za-z]+", symbol)
    product_symbol = product.group(0).upper() if product else symbol.upper()
    row = get_store().query(
        """SELECT symbol, asset_type, exchange, contract_multiplier, tick_size, lot_size,
                  initial_margin_rate, maintenance_margin_rate, commission_rate,
                  commission_type, commission_fixed
           FROM instrument_specifications
           WHERE UPPER(symbol) IN (UPPER(%s), UPPER(%s)) AND is_active=true
           ORDER BY CASE WHEN UPPER(symbol)=UPPER(%s) THEN 0 ELSE 1 END,
                    effective_from DESC LIMIT 1""",
        [symbol, product_symbol, symbol],
    )
    if row is None or row.empty:
        raise HTTPException(status_code=422, detail=f"Missing active instrument specification for {symbol}")
    item = row.iloc[0]
    return InstrumentSpec(
        str(item["symbol"]), str(item["asset_type"]), str(item["exchange"]),
        float(item["contract_multiplier"]), float(item["tick_size"]), int(item["lot_size"]),
        float(item["initial_margin_rate"]), float(item["maintenance_margin_rate"]),
        float(item["commission_rate"]), str(item.get("commission_type", "ratio")),
        float(item.get("commission_fixed", 0.0)),
    )

_SUPPORTED_ASSET_TYPES = frozenset({"futures", "stock", "option"})


def _normalize_asset_type(asset_type: str) -> str:
    normalized = asset_type.strip().lower()
    if normalized not in _SUPPORTED_ASSET_TYPES:
        raise HTTPException(status_code=422, detail=f"Unsupported asset_type: {asset_type}")
    return normalized


def _load_kline(
    symbol: str,
    interval: str = "D1",
    limit: int = 250,
    asset_type: str = "futures",
) -> pd.DataFrame:
    """Load OHLCV from PostgreSQL with asset-aware symbol resolution."""
    normalized_asset_type = _normalize_asset_type(asset_type)
    store = get_store()
    contract = (
        _resolve_main_contract(symbol.upper())
        if normalized_asset_type == "futures"
        else symbol.upper()
    )
    df = store.query(
        """SELECT k.datetime, k.open, k.high, k.low, k.close, k.volume
           FROM kline k
           JOIN symbols sy ON k.symbol_id=sy.symbol_id
           JOIN products p ON sy.product_id=p.product_id
           WHERE sy.code=? AND k.timeframe=? AND p.asset_type=?
           ORDER BY k.datetime DESC LIMIT ?""",
        [contract.upper(), interval, normalized_asset_type, limit],
    )
    if df is None or df.empty:
        return pd.DataFrame()
    df = df.sort_values("datetime").reset_index(drop=True)
    df = df.set_index("datetime")
    return df


def _resolve_main_contract(product: str) -> str:
    """品种代码 → 主力合约代码。"""
    from data_center.knowledge.main_contract_resolver import main_contract
    try:
        return main_contract(product)
    except Exception:
        # 回退: 已经是完整合约号或无法解析, 原样返回
        return product


@router.post("/run")
async def run_backtest(req: BacktestRequest):
    strategy_cls = get_strategy(req.strategy_name)
    if strategy_cls is None:
        raise HTTPException(status_code=404, detail=f"Strategy '{req.strategy_name}' not found")
    if req.initial_capital <= 0:
        raise HTTPException(status_code=400, detail="initial_capital must be positive")
    strategy = strategy_cls()
    df = await asyncio.to_thread(_load_kline, req.symbol, "D1", req.limit, req.asset_type)
    if df.empty or len(df) < 50:
        raise HTTPException(status_code=400, detail=f"Not enough kline data for {req.symbol}")
    bt = VectorizedBacktest(
        initial_capital=req.initial_capital,
        commission_pct=req.commission_pct,
        slippage_pct=req.slippage_pct,
        leverage=req.leverage,
        margin_rate=req.margin_rate,
        position_pct=req.position_pct,
    )
    result = await asyncio.to_thread(bt.run, df, strategy, req.symbol)
    _results.append(result)
    if len(_results) > _MAX_RESULTS:
        _results[:] = _results[-_MAX_RESULTS:]
    return {
        "strategy": result.strategy_name,
        "symbol": result.symbol,
        "start_date": result.start_date,
        "end_date": result.end_date,
        "total_return": _sanitize_float(result.total_return),
        "annualized_return": _sanitize_float(result.annualized_return),
        "sharpe_ratio": _sanitize_float(result.sharpe_ratio),
        "max_drawdown": _sanitize_float(result.max_drawdown),
        "win_rate": _sanitize_float(result.win_rate),
        "total_trades": result.total_trades,
        "profit_factor": _sanitize_float(result.profit_factor),
        "equity_curve": result.equity_curve[::20] if result.equity_curve else [],
        # 严肃回测成本
        "total_commission": result.total_commission,
        "total_slippage": result.total_slippage,
        "turnover": result.turnover,
    }


@router.post("/trusted")
async def run_trusted(req: TrustedBacktestRequest):
    strategy_cls = get_strategy(req.strategy_name)
    if strategy_cls is None:
        raise HTTPException(status_code=404, detail=f"Strategy '{req.strategy_name}' not found")
    frame = await asyncio.to_thread(_load_kline, req.symbol, "D1", req.limit, req.asset_type)
    if frame.empty or len(frame) < 50:
        raise HTTPException(status_code=400, detail=f"Not enough kline data for {req.symbol}")
    contract = _resolve_main_contract(req.symbol.upper()) if req.asset_type == "futures" else req.symbol.upper()
    spec = await asyncio.to_thread(_load_instrument_spec, contract)
    result = await asyncio.to_thread(run_trusted_backtest, frame, strategy_cls(), spec, req.initial_capital)
    return {
        "strategy": result.strategy_name, "symbol": result.symbol,
        "execution_mode": result.execution_mode, "net_pnl": result.net_pnl,
        "net_return": result.net_return, "total_commission": result.total_commission,
        "cost_scenarios": result.cost_scenarios,
        "trades": [asdict(trade) for trade in result.trades],
        "tradable_under_stress": result.cost_scenarios["stress"] > 0,
    }
@router.get("/results")
async def list_results():
    return {"results": [
        {"strategy": r.strategy_name, "symbol": r.symbol,
         "total_return": r.total_return, "sharpe": r.sharpe_ratio}
        for r in _results[-20:]
    ]}


@router.get("/quick")
async def quick_backtest(
    symbol: str = Query(..., description="品种代码如 RB / HC"),
    strategy_name: str = Query("trend_ma_cross"),
    limit: int = Query(250, ge=50, le=500, description="近 N 条日线 (默认250≈1年)"),
    commission_pct: float = Query(0.0003, ge=0, le=0.01, description="手续费率"),
    slippage_pct: float = Query(0.0, ge=0, le=0.01, description="滑点率"),
    leverage: float = Query(1.0, ge=1, le=20, description="杠杆倍数"),
    asset_type: str = Query("futures", description="futures/stock/option"),
):
    """轻量回测 — 策略工坊一键调用, 支持期货参数。"""
    strategy_cls = get_strategy(strategy_name)
    if strategy_cls is None:
        raise HTTPException(status_code=404, detail=f"Strategy '{strategy_name}' not found")
    df = await asyncio.to_thread(_load_kline, symbol, "D1", limit, asset_type)
    if df.empty or len(df) < 30:
        raise HTTPException(status_code=400, detail=f"Not enough kline data for {symbol}")
    strategy = strategy_cls()
    bt = VectorizedBacktest(
        initial_capital=1_000_000,
        commission_pct=commission_pct,
        slippage_pct=slippage_pct,
        leverage=leverage,
        margin_rate=0.12,
        position_pct=0.1,
    )
    result = await asyncio.to_thread(bt.run, df, strategy, symbol)
    return {
        "strategy": result.strategy_name,
        "symbol": result.symbol,
        "start_date": result.start_date,
        "end_date": result.end_date,
        "total_return": _sanitize_float(result.total_return),
        "sharpe_ratio": _sanitize_float(result.sharpe_ratio),
        "max_drawdown": _sanitize_float(result.max_drawdown),
        "win_rate": _sanitize_float(result.win_rate),
        "total_trades": result.total_trades,
        "profit_factor": _sanitize_float(result.profit_factor),
        "equity_curve": result.equity_curve[::10] if result.equity_curve else [],
        "total_commission": result.total_commission,
        "total_slippage": result.total_slippage,
        "turnover": result.turnover,
    }


_BT_RESULTS_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "backtest_results.json"


def _to_tournament_results(symbol: str, results: list) -> dict:
    """Convert /backtest/batch rows into the feedback/tournament contract."""
    strategies = []
    for row in results:
        name = str(row.get("strategy", ""))
        if not name:
            continue
        strategies.append({
            "name": name,
            "symbol": symbol,
            "sharpe": _sanitize_float(row.get("sharpe_ratio", 0.0)),
            "win_rate": _sanitize_float(row.get("win_rate", 0.0)),
            "max_drawdown": _sanitize_float(row.get("max_drawdown", 0.0)),
            "total_trades": int(row.get("total_trades", 0)),
            "total_return": _sanitize_float(row.get("total_return", 0.0)),
            "profit_factor": _sanitize_float(row.get("profit_factor", 0.0)),
        })
    now = datetime.now()
    return {
        "id": f"batch_{symbol}_{now:%Y%m%d%H%M%S}",
        "timestamp": now.isoformat(),
        "source": "backtest_batch",
        "symbol": symbol,
        "strategies": strategies,
    }


async def _apply_closed_loop_updates(
    symbol: str,
    results: list,
    manager=None,
    feedback_loop=None,
    degradation_tracker=None,
) -> dict:
    """Apply batch backtest output to feedback, tournament standings, and degradation."""
    if manager is None:
        from api.routes.tournament_routes import _manager as manager
    if feedback_loop is None:
        from core.feedback_loop import get_feedback_loop
        feedback_loop = get_feedback_loop()
    if degradation_tracker is None:
        from core.adaptive.degradation_tracker import get_tracker
        degradation_tracker = get_tracker()

    tournament_results = _to_tournament_results(symbol, results)
    entry = feedback_loop.process_tournament_results(tournament_results)

    replace_results = getattr(manager, "replace_results", None)
    if callable(replace_results):
        await replace_results(tournament_results["strategies"])
    else:
        for strategy in tournament_results["strategies"]:
            await manager.record_result(
                name=strategy["name"],
                sharpe=strategy["sharpe"],
                win_rate=strategy["win_rate"],
                profit_factor=strategy["profit_factor"],
                max_drawdown=strategy["max_drawdown"],
                total_trades=strategy["total_trades"],
                total_return=strategy["total_return"],
            )
    await manager.update_scores()
    save = getattr(manager, "_save", None)
    if callable(save):
        save()

    degradation = degradation_tracker.update({symbol: results})
    return {
        "closed_loop": True,
        "tournament_id": tournament_results["id"],
        "tournament_updated": len(tournament_results["strategies"]),
        "feedback": {
            "top_strategy": entry.top_strategy,
            "top_sharpe": entry.top_sharpe,
            "retired": entry.strategies_retired,
            "starred": entry.strategies_starred,
        },
        "degradation": degradation,
    }


def _save_batch_results(results: list, symbol: str, closed_loop: Optional[dict] = None) -> str:
    """Persist batch backtest results and closed-loop metadata."""
    _BT_RESULTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated_at": datetime.now().isoformat(),
        "symbol": symbol,
        "total_strategies": len(results),
        "with_trades": sum(1 for r in results if r["total_trades"] > 0),
        "results": results,
    }
    if closed_loop is not None:
        payload["closed_loop"] = closed_loop
    _BT_RESULTS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info(f"batch backtest results saved: {_BT_RESULTS_FILE} ({payload['with_trades']}/{payload['total_strategies']} with trades)")
    return str(_BT_RESULTS_FILE)

def _sanitize_float(v):
    """替换 inf/nan 为 0, 确保 JSON 兼容。"""
    import math
    if isinstance(v, float) and (math.isinf(v) or math.isnan(v)):
        return 0.0
    return v


@router.post("/batch")
async def batch_backtest(
    symbol: str = Query("RB", description="品种代码"),
    limit: int = Query(250, ge=50, le=500),
    asset_type: str = Query("futures", description="futures/stock/option"),
):
    """批量回测全部已注册策略, 结果持久化到 data/backtest_results.json。"""
    all_s = get_all_strategies()
    if not all_s:
        raise HTTPException(400, "无已注册策略")

    df = await asyncio.to_thread(_load_kline, symbol, "D1", limit, asset_type)
    if df.empty or len(df) < 50:
        raise HTTPException(400, f"K线数据不足: {symbol}")

    bt = VectorizedBacktest(
        initial_capital=1_000_000,
        commission_pct=0.0003,
        slippage_pct=0.0,
        leverage=1.0,
        margin_rate=0.12,
        position_pct=0.1,
    )
    results = []
    for name, cls in all_s.items():
        try:
            inst = cls()
            r = await asyncio.to_thread(bt.run, df, inst, symbol)
            results.append({
                "strategy": name,
                "sharpe_ratio": _sanitize_float(r.sharpe_ratio),
                "total_return": _sanitize_float(r.total_return),
                "max_drawdown": _sanitize_float(r.max_drawdown),
                "win_rate": _sanitize_float(r.win_rate),
                "total_trades": r.total_trades,
                "profit_factor": _sanitize_float(r.profit_factor),
                "total_commission": r.total_commission,
                "total_slippage": r.total_slippage,
                "start_date": r.start_date,
                "end_date": r.end_date,
            })
        except Exception as e:
            logger.warning(f"策略 {name} 回测失败: {e}")
            results.append({
                "strategy": name, "sharpe_ratio": 0, "total_return": 0,
                "max_drawdown": 0, "win_rate": 0, "total_trades": 0,
                "profit_factor": 0, "error": str(e)[:100],
            })

    results.sort(key=lambda r: r["sharpe_ratio"], reverse=True)
    try:
        closed_loop = await _apply_closed_loop_updates(symbol, results)
    except Exception as e:
        logger.exception(f"batch backtest closed-loop update failed: {e}")
        closed_loop = {"closed_loop": False, "error": str(e)[:200]}
    _save_batch_results(results, symbol, closed_loop)

    top5 = results[:5]
    return {
        "symbol": symbol,
        "total": len(results),
        "with_trades": sum(1 for r in results if r["total_trades"] > 0),
        "top5": top5,
        "all": results,
        "closed_loop": closed_loop,
    }



@router.get("/batch/latest")
async def get_latest_batch():
    """获取最近一次批量回测结果。"""
    if not _BT_RESULTS_FILE.exists():
        raise HTTPException(404, "暂无批量回测结果, 请先 POST /batch")
    return json.loads(_BT_RESULTS_FILE.read_text(encoding="utf-8"))
