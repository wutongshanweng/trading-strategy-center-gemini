"""API routes for Strategy Tournament — rankings, scoring, and elimination."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from tournament.tournament_manager import TournamentManager

router = APIRouter(prefix="/api/v1/tournament", tags=["tournament"])
_manager = TournamentManager()


class RegisterRequest(BaseModel):
    name: str


class RecordTradeRequest(BaseModel):
    name: str
    pnl: float


class EliminationResponse(BaseModel):
    message: str
    eliminated: int
    remaining: int


class LeaderboardEntry(BaseModel):
    rank: int
    strategy_name: str
    score: float
    sharpe: float
    win_rate: float
    profit_factor: float
    max_drawdown: float
    total_return: float
    trades: int


@router.get("/standings")
async def get_standings(top_n: int = Query(default=10, ge=1, le=100)):
    """Get tournament leaderboard."""
    entries = await _manager.get_leaderboard(top_n)
    return [
        LeaderboardEntry(
            rank=e.rank,
            strategy_name=e.name,
            score=e.current_score,
            sharpe=e.sharpe,
            win_rate=e.win_rate,
            profit_factor=e.profit_factor if e.profit_factor != float("inf") else 0.0,
            max_drawdown=e.max_drawdown,
            total_return=e.total_return or (sum(e.pnls) if e.pnls else 0.0),
            trades=e.trades,
        )
        for e in entries
    ]


@router.post("/register")
async def register_strategy(req: RegisterRequest):
    """Register a strategy for the tournament."""
    await _manager.register_strategy(req.name)
    return {"status": "registered", "name": req.name}


@router.post("/trade")
async def record_trade(req: RecordTradeRequest):
    """Record a trade result for a strategy."""
    await _manager.register_strategy(req.name)
    await _manager.record_trade(req.name, req.pnl)
    leaderboard = await _manager.get_leaderboard(100)
    entry = next((e for e in leaderboard if e.name == req.name), None)
    return {"status": "recorded", "name": req.name, "trades": entry.trades if entry else 0}


@router.post("/update-scores")
async def update_scores():
    """Recalculate all scores."""
    await _manager.update_scores()
    return {"status": "scores_updated"}


@router.post("/eliminate")
async def eliminate_bottom(pct: float = Query(default=0.1, ge=0.01, le=0.5)):
    """Eliminate the bottom percentage of strategies."""
    before = len(_manager._entries)
    await _manager.eliminate_bottom(pct)
    after = len(_manager._entries)
    return EliminationResponse(
        message=f"Eliminated {before - after} strategies",
        eliminated=before - after,
        remaining=after,
    )


def _normalize_query_list(values: Optional[List[str]], uppercase: bool = False) -> Optional[List[str]]:
    """Normalize repeated or comma-separated query parameters."""
    if not values:
        return None
    normalized: list[str] = []
    for value in values:
        normalized.extend((part.strip().upper() if uppercase else part.strip()) for part in value.split(",") if part.strip())
    return normalized or None


@router.post("/run-backtest")
async def run_backtest(products: Optional[List[str]] = Query(default=None)):
    """对策略目录跑真实回测 → 回填目录 + 排名 (阶段1 真反馈)。

    products 省略时默认扫关注品种列表。同步执行 (54 策略 × N 品种, 可能数十秒)。
    """
    from tournament.tournament_runner import get_runner
    summary = await get_runner().run_and_feedback(_normalize_query_list(products, uppercase=True))
    return summary


@router.get("/research-challengers")
async def get_research_challengers(asset_type: Optional[str] = Query(default=None)):
    """Expose backtested research/model challengers that are safe for tournament flow."""
    from api.routes.research_candidate_routes import AssetType, list_research_challenger_payloads

    try:
        parsed_asset_type = AssetType(asset_type) if asset_type else None
    except ValueError as exc:
        allowed = ", ".join(item.value for item in AssetType)
        raise HTTPException(status_code=422, detail=f"asset_type must be one of: {allowed}") from exc
    challengers = list_research_challenger_payloads(parsed_asset_type)
    return {
        "count": len(challengers),
        "challengers": challengers,
        "safety_note": "Only status=challenger, promoted_strategy present, and skip_downstream=false are eligible.",
    }


@router.post("/promote")
async def promote_candidates(strategies: Optional[List[str]] = Query(default=None),
                            products: Optional[List[str]] = Query(default=None),
                            top_n: int = Query(default=8, ge=1, le=54)):
    """晋升闸门 (阶段2): 对候选策略跑 walk-forward 样本外验证, 返回晋级名单+按市态分组冠军。

    strategies 省略时取当前排行榜前 top_n。同步执行, 较慢 (每策略多窗口优化)。
    """
    from core.adaptive.promotion_gate import get_gate
    strategies = _normalize_query_list(strategies)
    products = _normalize_query_list(products, uppercase=True)
    if not strategies:
        board = await _manager.get_leaderboard(top_n)
        strategies = [e.name for e in board]
    # 过滤无效策略名并补漏 - 与 retrain 一致
    import signals.strategies  # noqa: F401
    from signals.catalog import get_catalog
    catalog = get_catalog()
    valid_names = {m.name for m in catalog.all()}
    strategies = [s for s in strategies if s in valid_names]
    if not strategies:
        # 从最新参数优化结果中取 top-N 策略名
        from core.adaptive.parameter_store import ParameterStore
        store = ParameterStore()
        ranked = sorted(store.list_strategies(),
                       key=lambda s: max((v.score for v in store.list_versions(s)), default=-999.0),
                       reverse=True)
        strategies = ranked[:top_n]
    if not strategies:
        return {"evaluated": 0, "promoted": [], "rejected": [], "champions_by_regime": {},
                "note": "无候选策略, 请先 /retrain/cycle 再 /run-backtest"}
    result = get_gate().evaluate_candidates(strategies, products)
    # 阶段4: 把验证结果灌入 champion/challenger 考察记录
    from core.adaptive.champion_challenger import get_registry
    all_verdicts = result.get("promoted", []) + result.get("rejected", [])
    cc = get_registry().ingest_promotion_verdicts(all_verdicts)
    result["champion_challenger"] = cc
    return result


class GraduateRequest(BaseModel):
    name: str
    approved_by: str
    allocation: float = 0.1


@router.get("/lifecycle")
async def get_lifecycle():
    """Champion/Challenger 全名单 (阶段4)。"""
    from core.adaptive.champion_challenger import get_registry
    return get_registry().list_all()


@router.post("/graduate")
async def graduate_strategy(req: GraduateRequest):
    """人工批准 challenger 毕业为 champion (安全闸门)。"""
    from core.adaptive.champion_challenger import get_registry
    return get_registry().graduate(req.name, req.approved_by, req.allocation)


@router.post("/retire-champion")
async def retire_champion(name: str = Query(...)):
    """下线一个 champion/challenger。"""
    from core.adaptive.champion_challenger import get_registry
    return get_registry().retire(name)


@router.get("/summary")
async def tournament_summary():
    """Get tournament summary statistics."""
    summary = await _manager.get_tournament_summary()
    return summary
