"""信号白名单管理 — 控制哪些策略参与 AlertAggregator 实时扫描。"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Set

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/signals", tags=["signals"])

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_WHITELIST_FILE = _DATA_DIR / "signal_whitelist.json"


def _load_whitelist() -> Set[str]:
    try:
        if _WHITELIST_FILE.exists():
            data = json.loads(_WHITELIST_FILE.read_text(encoding="utf-8"))
            return set(data.get("strategies", []))
    except Exception:
        pass
    return set()


def _save_whitelist(strategies: Set[str]):
    _WHITELIST_FILE.parent.mkdir(parents=True, exist_ok=True)
    _WHITELIST_FILE.write_text(
        json.dumps({"strategies": sorted(strategies)}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


class WhitelistUpdate(BaseModel):
    strategy_names: List[str]


@router.get("/whitelist")
async def get_whitelist():
    return {"strategies": sorted(_load_whitelist()), "count": len(_load_whitelist())}


@router.post("/whitelist")
async def add_to_whitelist(body: WhitelistUpdate):
    current = _load_whitelist()
    current.update(body.strategy_names)
    _save_whitelist(current)
    return {"strategies": sorted(current), "count": len(current), "added": body.strategy_names}


@router.delete("/whitelist/{name}")
async def remove_from_whitelist(name: str):
    current = _load_whitelist()
    if name not in current:
        raise HTTPException(404, f"策略 {name} 不在白名单中")
    current.discard(name)
    _save_whitelist(current)
    return {"removed": name, "count": len(current)}


def get_whitelist_strategies() -> Set[str]:
    """供 AlertAggregator 调用 — 有白名单时只扫白名单, 空则用 top-K。"""
    return _load_whitelist()
