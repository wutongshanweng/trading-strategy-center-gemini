"""策略中心 API — 合并 strategy_routes + strategy_pool + strategy_builder。

统一前缀: /api/v1/strategies

职责拆分:
  - catalog: 策略目录浏览、执行
  - pool: 策略池生命周期（退役/激活/优化/降级跟踪）
  - builder: 用户策略创建/删除/导入导出
"""

from __future__ import annotations

import inspect
import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from loguru import logger
from pydantic import BaseModel

BJ_TZ = timezone(timedelta(hours=8))

router = APIRouter(prefix="/api/v1/strategies", tags=["strategies"])

# ─────────────────────────────────────────────────────────────────────────────
# 共享类型
# ─────────────────────────────────────────────────────────────────────────────


class ComputeRequest(BaseModel):
    symbol: str
    timeframe: str = "1d"
    strategy_names: Optional[list[str]] = None


class OptimizeRequest(BaseModel):
    strategy_name: str
    n_iter: int = 15
    product: str = "RB"


class SignalRule(BaseModel):
    type: str = "entry"
    indicator: str = ""
    condition: str = ">"
    value: float = 0
    value2: float = 0
    value3: float = 0


class StrategyDefinition(BaseModel):
    name: str
    display_name: str = ""
    strategy_type: str = "trend"
    description: str = ""
    fast_period: int = 5
    slow_period: int = 20
    stop_loss_pct: float = 2.0
    take_profit_pct: float = 10.0
    max_position_pct: float = 30.0
    allow_short: bool = False
    entry_rules: list[SignalRule] = []
    exit_rules: list[SignalRule] = []


class ExportRequest(BaseModel):
    strategy_names: list[str] = ["*"]


_USER_DIR = Path(__file__).resolve().parent.parent.parent / "signals" / "strategies" / "user"

INDICATOR_TEMPLATES = {
    "MA": "_sma(close, {value})",
    "RSI": "_rsi(close, {value})",
    "MACD": "_macd_hist(close, {fast}, {slow}, {signal})",
    "BOLL": "_bb_lower(close, {value})",
    "volume": "_sma(volume, {value})",
}


# ─────────────────────────────────────────────────────────────────────────────
# 辅助函数
# ─────────────────────────────────────────────────────────────────────────────


def _sanitize_name(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9_]", "_", name)
    name = re.sub(r"_+", "_", name)
    return name.strip("_").lower() or "custom_strategy"


def _find_strategy_source(name: str) -> Optional[str]:
    from signals.registry import get_strategy as _gs
    cls = _gs(name)
    if cls is None:
        return None
    try:
        return Path(inspect.getfile(cls)).read_text(encoding="utf-8")
    except (TypeError, OSError) as e:
        logger.warning(f"无法读取策略 {name} 源码: {e}")
        return None


def _generate_strategy_code(defn: StrategyDefinition) -> str:
    safe = _sanitize_name(defn.name)
    display = defn.display_name or safe
    stype = defn.strategy_type

    type_prefix = {
        "trend": "trend_", "momentum": "momentum_", "breakout": "breakout_",
        "mean_reversion": "meanrev_", "arbitrage": "arb_",
    }.get(stype, "custom_")
    if not safe.startswith(type_prefix):
        safe = type_prefix + safe

    sl_pct = defn.stop_loss_pct / 100.0
    tp_pct = defn.take_profit_pct / 100.0
    safe_literal = repr(safe)
    display_literal = repr(display)

    code = f'''"""Auto-generated user strategy."""
from __future__ import annotations
from typing import Optional
import numpy as np
import pandas as pd
from signals.base import BaseStrategy, Direction, Signal
from signals.registry import register


def _sma(arr, w):
    out = np.full(len(arr), np.nan)
    if len(arr) >= w:
        cs = np.cumsum(np.insert(arr, 0, 0.0))
        out[w - 1:] = (cs[w:] - cs[:-w]) / w
    return out


def _rsi(close, period=14):
    diff = np.diff(close, prepend=close[0])
    gain = np.where(diff > 0, diff, 0)
    loss = np.where(diff < 0, -diff, 0)
    avg_gain = np.full(len(close), np.nan)
    avg_loss = np.full(len(close), np.nan)
    alpha = 1.0 / period
    avg_gain[period - 1] = np.mean(gain[:period])
    avg_loss[period - 1] = np.mean(loss[:period])
    for i in range(period, len(close)):
        avg_gain[i] = alpha * gain[i] + (1 - alpha) * avg_gain[i - 1]
        avg_loss[i] = alpha * loss[i] + (1 - alpha) * avg_loss[i - 1]
    rs = avg_gain / (avg_loss + 1e-10)
    return 100.0 - 100.0 / (1.0 + rs)


@register
class {safe.replace('_', ' ').title().replace(' ', '')}(BaseStrategy):
    name = {safe_literal}
    description = {display_literal}
    timeframes = ["1d"]
    params = {{
        "fast_period": {defn.fast_period},
        "slow_period": {defn.slow_period},
        "stop_loss_pct": {defn.stop_loss_pct},
        "take_profit_pct": {defn.take_profit_pct},
    }}

    def compute(self, df, symbol=""):
        p = self.params
        if len(df) < max(p["slow_period"], 30) + 10:
            return None
        close = df["close"].values.astype(float)
        fast_ma = _sma(close, p["fast_period"])
        slow_ma = _sma(close, p["slow_period"])
        last_fast, last_slow = fast_ma[-1], slow_ma[-1]
        prev_fast, prev_slow = fast_ma[-2], slow_ma[-2]
        cross_up = prev_fast <= prev_slow and last_fast > last_slow
        cross_down = prev_fast >= prev_slow and last_fast < last_slow
        price = float(close[-1])
        if cross_up:
            return Signal(
                symbol=symbol, direction=Direction.BUY, confidence=0.7,
                price=price, stop_loss=round(price * (1 - {sl_pct}), 2),
                take_profit=round(price * (1 + {tp_pct}), 2),
                reason=f"{{safe}}: 金叉", strategy_name=self.name, timeframe=self.timeframes[0],
            )
        elif cross_down:
            return Signal(
                symbol=symbol, direction=Direction.SELL, confidence=0.7,
                price=price, stop_loss=round(price * (1 + {sl_pct}), 2),
                take_profit=round(price * (1 - {tp_pct}), 2),
                reason=f"{{safe}}: 死叉", strategy_name=self.name, timeframe=self.timeframes[0],
            )
        elif last_fast > last_slow:
            return Signal(symbol=symbol, direction=Direction.BUY, confidence=0.4,
                          price=price, reason=f"{{safe}}: 多头排列",
                          strategy_name=self.name, timeframe=self.timeframes[0])
        elif last_fast < last_slow:
            return Signal(symbol=symbol, direction=Direction.SELL, confidence=0.4,
                          price=price, reason=f"{{safe}}: 空头排列",
                          strategy_name=self.name, timeframe=self.timeframes[0])
        return None
'''
    return code


# ─────────────────────────────────────────────────────────────────────────────
# CATALOG — 策略目录浏览、执行
# ─────────────────────────────────────────────────────────────────────────────


@router.get("")
async def list_all_strategies():
    from signals.registry import list_strategies
    return {"strategies": list_strategies()}


@router.get("/catalog")
async def strategy_catalog(
    regime: Optional[str] = None,
    strategy_type: Optional[str] = None,
    symbol: Optional[str] = None,
    top_k: int = 200,
):
    from signals.catalog import get_catalog
    cat = get_catalog()
    results = cat.query(regime=regime, strategy_type=strategy_type,
                        symbol=symbol, top_k=top_k, active_only=False)
    return {"total": len(results), "strategies": [s.to_dict() for s in results]}


@router.get("/catalog/grouped")
async def strategy_catalog_grouped():
    from signals.catalog import get_catalog
    cat = get_catalog()
    grouped = cat.list_by_type()
    out = {}
    for stype, metas in grouped.items():
        active = sum(1 for m in metas if m.is_active)
        out[stype] = {
            "count": len(metas), "active": active, "inactive": len(metas) - active,
            "strategies": [m.to_dict() for m in metas],
        }
    return {"types": out, "total": sum(len(m) for m in grouped.values())}


@router.post("/compute")
async def compute_signals(req: ComputeRequest):
    from signals.engine import StrategyEngine
    from api.routes.data_routes import get_data_manager
    dm = get_data_manager()
    feed = await dm.get_data_feed(req.symbol, req.timeframe)
    engine = StrategyEngine()
    engine.load_all()
    signals = engine.compute_all(feed.df, req.symbol, req.strategy_names)
    return {
        "symbol": req.symbol,
        "timeframe": req.timeframe,
        "signals": [
            {
                "strategy": s.strategy_name,
                "direction": s.direction.value,
                "confidence": s.confidence,
                "price": s.price,
                "reason": s.reason,
            }
            for s in signals
        ],
        "total": len(signals),
    }


# ─────────────────────────────────────────────────────────────────────────────
# POOL — 策略池生命周期
# ─────────────────────────────────────────────────────────────────────────────


@router.get("/pool")
async def list_pool():
    """列出优化池中的策略 (retired + low-performance challenger)。"""
    from core.adaptive.champion_challenger import get_registry
    from signals.catalog import get_catalog
    reg = get_registry()
    catalog = get_catalog()
    all_lc = reg.list_all()

    def enrich(entries):
        out = []
        for e in entries:
            meta = catalog.get(e["name"])
            out.append({
                **e,
                "sharpe": round(meta.sharpe, 4) if meta else 0,
                "win_rate": round(meta.win_rate, 4) if meta else 0,
                "max_drawdown": round(meta.max_drawdown, 4) if meta else 0,
                "total_trades": meta.total_trades if meta else 0,
                "chinese_name": meta.chinese_name if meta else e["name"],
                "strategy_type": meta.strategy_type.value if meta else "other",
            })
        return out

    return {
        "retired": enrich(all_lc.get("retired", [])),
        "challengers": enrich(all_lc.get("challengers", [])),
        "champions": enrich(all_lc.get("champions", [])),
    }


@router.post("/pool/optimize")
async def optimize_strategy(req: OptimizeRequest):
    """对指定策略运行参数重优化。"""
    from core.adaptive.retrain_orchestrator import get_orchestrator
    orch = get_orchestrator()
    try:
        results = orch.optimize_params([req.strategy_name], [req.product], req.n_iter)
    except Exception as e:
        logger.error(f"优化 {req.strategy_name} 失败: {e}")
        raise HTTPException(500, f"优化失败: {e}")

    if not results:
        return {"ok": False, "reason": "优化未产出结果", "strategy_name": req.strategy_name}

    best = results[0]
    return {
        "ok": True,
        "strategy_name": req.strategy_name,
        "best_score": best.get("best_score", 0),
        "best_params": best.get("best_params", {}),
        "details": results,
    }


@router.post("/pool/{name}/retire")
async def retire_strategy(name: str):
    """将策略移入优化池 (标记为 retired)。"""
    from core.adaptive.champion_challenger import get_registry
    reg = get_registry()
    result = reg.retire(name)
    if not result["ok"]:
        raise HTTPException(400, result["reason"])
    return result


@router.post("/pool/{name}/reactivate")
async def reactivate_strategy(name: str):
    """将退役策略重新激活为 challenger。"""
    from core.adaptive.champion_challenger import get_registry
    reg = get_registry()
    rec = reg._records.get(name)
    if rec is None:
        raise HTTPException(404, f"策略 {name} 不在生命周期管理中")
    if rec.status != "retired":
        raise HTTPException(400, f"策略 {name} 当前状态为 {rec.status}, 只能 reactivate retired 策略")
    rec.status = "challenger"
    rec.evals = []
    reg._save()
    return {"ok": True, "name": name, "status": "challenger"}


@router.get("/pool/degradation")
async def get_degradation():
    """查看策略降级跟踪状态。"""
    from core.adaptive.degradation_tracker import get_tracker
    return get_tracker().get_status()


@router.get("/{name}")
async def get_strategy_detail(name: str):
    from signals.registry import get_strategy
    cls = get_strategy(name)
    if cls is None:
        raise HTTPException(status_code=404, detail=f"Strategy {name} not found")
    inst = cls()
    return {
        "name": inst.name,
        "description": inst.description,
        "timeframes": inst.timeframes,
        "params": inst.params,
    }


# ─────────────────────────────────────────────────────────────────────────────
# BUILDER — 用户策略创建/删除/导入导出
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/create")
async def create_strategy(defn: StrategyDefinition):
    """从前端 StrategyBuilder 创建策略，自动生成文件并注册。"""
    import importlib
    from signals.catalog import get_catalog, StrategyMeta, RegimeFit, _infer_type, _TYPE_REGIME, _CN_NAMES

    safe = _sanitize_name(defn.name)
    if not safe or len(safe) < 3:
        raise HTTPException(400, "策略名太短，至少3个字符")

    _USER_DIR.mkdir(parents=True, exist_ok=True)
    init_file = _USER_DIR / "__init__.py"
    if not init_file.exists():
        init_file.write_text("# Auto-generated user strategies\n", encoding="utf-8")

    file_path = _USER_DIR / f"{safe}.py"
    if file_path.exists():
        raise HTTPException(409, f"策略 {safe} 已存在，请修改名称")

    code = _generate_strategy_code(defn)
    file_path.write_text(code, encoding="utf-8")

    try:
        importlib.import_module(f"signals.strategies.user.{safe}")
    except Exception as e:
        logger.warning(f"策略 {safe} 导入失败: {e}")

    stype = _infer_type(safe)
    catalog = get_catalog()
    catalog.register(StrategyMeta(
        name=safe, strategy_type=stype,
        chinese_name=_CN_NAMES.get(safe, defn.display_name or safe),
        description=defn.description or "",
        regime_fit=list(_TYPE_REGIME.get(stype, [RegimeFit.ALL])),
        timeframes=["1d"],
        params={
            "fast_period": defn.fast_period, "slow_period": defn.slow_period,
            "stop_loss_pct": defn.stop_loss_pct, "take_profit_pct": defn.take_profit_pct,
        },
    ))
    catalog.build_from_registry()

    return {
        "success": True,
        "strategy_name": safe,
        "file": str(file_path.relative_to(file_path.parents[3])),
        "message": f"策略 {safe} 创建成功",
    }


@router.get("/user/list")
async def list_user_strategies():
    """列出用户自建的策略。"""
    if not _USER_DIR.exists():
        return {"strategies": [], "count": 0}
    files = sorted(_USER_DIR.glob("*.py"))
    names = [f.stem for f in files if f.stem != "__init__"]
    return {"strategies": names, "count": len(names)}


@router.delete("/user/{name}")
async def delete_user_strategy(name: str):
    """删除用户自建策略。"""
    safe = _sanitize_name(name)
    file_path = _USER_DIR / f"{safe}.py"
    if not file_path.exists():
        raise HTTPException(404, f"策略 {safe} 不存在")
    file_path.unlink()
    return {"deleted": safe, "success": True}


@router.post("/export")
async def export_strategies(req: ExportRequest):
    """导出策略为 .strategy-pack.json。"""
    from signals.registry import get_all_strategies as _gas, get_strategy as _gs
    from signals.catalog import get_catalog

    all_names = list(_gas().keys())
    if req.strategy_names == ["*"]:
        names = all_names
    else:
        names = [n for n in req.strategy_names if n in all_names]

    if not names:
        raise HTTPException(400, "没有可导出的策略")

    catalog = get_catalog()
    strategies = []

    for name in names:
        cls = _gs(name)
        source_code = _find_strategy_source(name)
        meta = catalog._strategies.get(name)
        entry: dict = {
            "meta": {
                "name": name,
                "chinese_name": getattr(meta, "chinese_name", name) if meta else name,
                "strategy_type": meta.strategy_type.value if meta and meta.strategy_type else "other",
                "description": cls.description if cls else "",
                "regime_fit": [r.value for r in meta.regime_fit] if meta and meta.regime_fit else ["all"],
                "timeframes": getattr(cls, "timeframes", ["1d"]) if cls else ["1d"],
                "params": dict(getattr(cls, "params", {})) if cls else {},
            },
            "performance": {
                "sharpe": round(meta.sharpe, 4) if meta else 0.0,
                "win_rate": round(meta.win_rate, 4) if meta else 0.0,
                "max_drawdown": round(meta.max_drawdown, 4) if meta else 0.0,
                "total_trades": meta.total_trades if meta else 0,
            },
            "source_code": source_code or "",
        }
        strategies.append(entry)

    package = {
        "format": "tsc-strategy-pack",
        "version": "1.0",
        "exported_at": datetime.now(BJ_TZ).isoformat(),
        "source": "trading-strategy-center",
        "strategies": strategies,
    }
    return package


@router.post("/import")
async def import_strategies(file: UploadFile = File(...)):
    """导入 .strategy-pack.json。"""
    import importlib
    from signals.catalog import get_catalog, StrategyMeta, RegimeFit, _infer_type

    if not file.filename or not file.filename.endswith(".strategy-pack.json"):
        raise HTTPException(400, "请上传 .strategy-pack.json 文件")

    raw = await file.read()
    try:
        package = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(400, "文件格式无效")

    if package.get("format") != "tsc-strategy-pack":
        raise HTTPException(400, f"不支持的文件格式: {package.get('format', '未知')}")

    strategies = package.get("strategies", [])
    if not strategies:
        raise HTTPException(400, "策略包为空")

    _USER_DIR.mkdir(parents=True, exist_ok=True)
    init_file = _USER_DIR / "__init__.py"
    if not init_file.exists():
        init_file.write_text("# Auto-generated user strategies\n", encoding="utf-8")

    imported, skipped, failed = [], [], []

    for s in strategies:
        meta = s.get("meta", {})
        name = meta.get("name", "")
        if not name:
            failed.append({"name": "未知", "reason": "缺少策略名"})
            continue

        safe = _sanitize_name(name)
        code = s.get("source_code", "")
        if not code:
            failed.append({"name": name, "reason": "缺少源码"})
            continue

        file_path = _USER_DIR / f"{safe}.py"
        if file_path.exists():
            skipped.append({"name": safe, "reason": "策略文件已存在"})
            continue

        file_path.write_text(code, encoding="utf-8")

        try:
            importlib.import_module(f"signals.strategies.user.{safe}")
        except Exception as e:
            logger.warning(f"导入策略 {safe} 失败: {e}")
            file_path.unlink(missing_ok=True)
            failed.append({"name": safe, "reason": f"导入失败: {e}"})
            continue

        try:
            catalog = get_catalog()
            perf = s.get("performance", {})
            stype = _infer_type(safe)
            catalog.register(StrategyMeta(
                name=safe,
                strategy_type=stype,
                chinese_name=meta.get("chinese_name", safe),
                description=meta.get("description", ""),
                regime_fit=[RegimeFit(r) for r in meta.get("regime_fit", ["all"])],
                timeframes=meta.get("timeframes", ["1d"]),
                params=meta.get("params", {}),
                sharpe=perf.get("sharpe", 0.0),
                win_rate=perf.get("win_rate", 0.0),
                max_drawdown=perf.get("max_drawdown", 0.0),
                total_trades=perf.get("total_trades", 0),
            ))
            catalog.build_from_registry()
        except Exception as e:
            logger.warning(f"策略 {safe} catalog 注册失败: {e}")

        imported.append(safe)

    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "failed": failed,
        "total": len(strategies),
    }
