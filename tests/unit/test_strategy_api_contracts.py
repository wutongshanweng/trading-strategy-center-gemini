"""Strategy closed-loop API contract regression tests."""

import pandas as pd
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_strategies_pool_route_precedes_dynamic_name():
    from api.routes.strategy_routes import router as strategy_router

    get_paths = [
        route.path
        for route in strategy_router.routes
        if "GET" in getattr(route, "methods", set())
    ]

    assert get_paths.index("/api/v1/strategies/pool") < get_paths.index(
        "/api/v1/strategies/{name}"
    )


def test_evolve_kline_loader_uses_current_schema(monkeypatch):
    from api.routes import evolve_routes
    from data_center.storage import postgres_store

    class FakeStore:
        sql = ""
        params = ()

        def query(self, sql, params=None):
            self.sql = sql
            self.params = params or ()
            return pd.DataFrame(
                [
                    {
                        "datetime": "2026-07-15 09:00:00",
                        "open": 1.0,
                        "high": 2.0,
                        "low": 0.5,
                        "close": 1.5,
                        "volume": 100.0,
                    }
                ]
            )

    fake = FakeStore()
    monkeypatch.setattr(postgres_store, "get_store", lambda: fake)

    df = evolve_routes._load_kline("RB2610", "D1", 120)

    assert not df.empty
    assert "symbol_id" in fake.sql
    assert "timeframe" in fake.sql
    assert " symbol=" not in fake.sql
    assert " interval=" not in fake.sql
    assert fake.params == ("RB2610", "D1", 120)



def test_backtest_kline_loader_uses_asset_aware_symbol_query(monkeypatch):
    from api.routes import backtest_routes

    class FakeStore:
        sql = ""
        params = []

        def query(self, sql, params=None):
            self.sql = sql
            self.params = params or []
            return pd.DataFrame(
                [
                    {
                        "datetime": "2026-07-15 09:00:00",
                        "open": 1.0,
                        "high": 2.0,
                        "low": 0.5,
                        "close": 1.5,
                        "volume": 100.0,
                    }
                ]
            )

    fake = FakeStore()
    monkeypatch.setattr(backtest_routes, "get_store", lambda: fake)
    monkeypatch.setattr(
        backtest_routes,
        "_resolve_main_contract",
        lambda product: (_ for _ in ()).throw(AssertionError("stock must not resolve futures main contract")),
    )

    df = backtest_routes._load_kline("000001.SZ", "D1", 120, asset_type="stock")

    assert not df.empty
    assert "JOIN products" in fake.sql
    assert "p.asset_type=?" in fake.sql
    assert fake.params == ["000001.SZ", "D1", "stock", 120]


def test_trusted_backtest_route_and_instrument_spec_contract(monkeypatch):
    from api.routes import backtest_routes

    class FakeStore:
        def query(self, sql, params=None):
            assert "instrument_specifications" in sql
            assert params == ["RB2610", "RB", "RB2610"]
            return pd.DataFrame([{
                "symbol": "RB2610", "asset_type": "future", "exchange": "SHFE",
                "contract_multiplier": 10.0, "tick_size": 1.0, "lot_size": 1,
                "initial_margin_rate": 0.12, "maintenance_margin_rate": 0.1,
                "commission_rate": 0.0001,
            }])

    monkeypatch.setattr(backtest_routes, "get_store", lambda: FakeStore())
    spec = backtest_routes._load_instrument_spec("RB2610")
    paths = [route.path for route in backtest_routes.router.routes]

    assert "/api/v1/backtest/trusted" in paths
    assert spec.contract_multiplier == 10.0


def test_data_kline_query_compatibility_route_reads_postgres(monkeypatch):
    from api.routes import data_routes
    from data_center.storage import postgres_store

    class FakeStore:
        def query(self, sql, params=None):
            text = " ".join(sql.split())
            if "FROM symbols" in text and "UPPER(code)" in text:
                if params == ("RB2610",):
                    return pd.DataFrame([{"symbol_id": 7, "code": "RB2610"}])
                return pd.DataFrame()
            if "FROM main_contracts" in text:
                return pd.DataFrame([{"symbol_id": 7, "code": "RB2610"}])
            if "FROM kline" in text:
                assert params == (7, "D1", 2)
                return pd.DataFrame(
                    [
                        {
                            "datetime": "2026-07-15 09:05:00",
                            "open": 2.0,
                            "high": 3.0,
                            "low": 1.0,
                            "close": 2.5,
                            "volume": 20.0,
                        },
                        {
                            "datetime": "2026-07-15 09:00:00",
                            "open": 1.0,
                            "high": 2.0,
                            "low": 0.5,
                            "close": 1.5,
                            "volume": 10.0,
                        },
                    ]
                )
            raise AssertionError(f"unexpected query: {text}")

    from data_center.knowledge import main_contract_resolver

    monkeypatch.setattr(postgres_store, "get_store", lambda: FakeStore())
    monkeypatch.setattr(main_contract_resolver, "main_contract", lambda symbol: "RB2610")
    app = FastAPI()
    app.include_router(data_routes.router)

    resp = TestClient(app).get("/api/v1/data/kline?symbol=RB&period=1d&limit=2")

    assert resp.status_code == 200
    body = resp.json()
    assert body["symbol"] == "RB2610"
    assert body["requested_symbol"] == "RB"
    assert body["timeframe"] == "D1"
    assert body["total"] == 2
    assert [row["close"] for row in body["klines"]] == [1.5, 2.5]


def _sample_ohlcv_rows(count=80):
    rows = []
    price = 100.0
    for i in range(count):
        price += 0.2 if i < count - 10 else -0.1
        rows.append({
            "open": price - 0.3,
            "high": price + 0.8,
            "low": price - 0.8,
            "close": price,
            "volume": 1000 + i * 5,
            "open_interest": 5000 + i,
        })
    return rows


def test_scoring_routes_are_json_serializable_and_resonance_uses_ohlcv():
    from api.routes.scoring_routes import router as scoring_router

    app = FastAPI()
    app.include_router(scoring_router)
    client = TestClient(app)
    rows = _sample_ohlcv_rows()

    market = client.post("/api/v1/scoring/market-state?symbol=RB", json=rows)
    assert market.status_code == 200
    assert isinstance(market.json()["multi_timeframe_alignment"], bool)

    resonance = client.post(
        "/api/v1/scoring/resonance",
        json={"symbol": "RB", "ohlcv": rows},
    )
    assert resonance.status_code == 200
    assert "final_score" in resonance.json()



def test_scoring_resonance_rejects_empty_ohlcv():
    from api.routes.scoring_routes import router as scoring_router

    app = FastAPI()
    app.include_router(scoring_router)
    client = TestClient(app)

    response = client.post(
        "/api/v1/scoring/resonance",
        json={"symbol": "RB", "ohlcv": []},
    )
    assert response.status_code == 422


def test_tournament_promote_honors_query_lists(monkeypatch):
    from api.routes import tournament_routes
    from core.adaptive import champion_challenger, promotion_gate

    captured = {}

    class FakeGate:
        def evaluate_candidates(self, strategies, products=None):
            captured["strategies"] = strategies
            captured["products"] = products
            return {
                "evaluated": 1,
                "promoted": [],
                "rejected": [
                    {
                        "strategy_name": strategies[0],
                        "contract": products[0],
                        "passed": False,
                        "mean_oos_sharpe": 0.0,
                        "regime": "UNKNOWN",
                    }
                ],
                "champions_by_regime": {},
            }

    class FakeRegistry:
        def ingest_promotion_verdicts(self, verdicts):
            captured["verdicts"] = verdicts
            return {"evaluations_recorded": len(verdicts)}

    monkeypatch.setattr(promotion_gate, "get_gate", lambda: FakeGate())
    monkeypatch.setattr(champion_challenger, "get_registry", lambda: FakeRegistry())

    app = FastAPI()
    app.include_router(tournament_routes.router)
    resp = TestClient(app).post(
        "/api/v1/tournament/promote?strategies=trend_ma_cross&products=RB&top_n=1"
    )

    assert resp.status_code == 200
    assert captured["strategies"] == ["trend_ma_cross"]
    assert captured["products"] == ["RB"]
    assert resp.json()["champion_challenger"] == {"evaluations_recorded": 1}


def test_iteration_overview_reports_real_automation_config(monkeypatch):
    import asyncio

    from api.routes import intelligence_routes
    from core.adaptive import auto_iteration, champion_challenger

    monkeypatch.setattr(
        auto_iteration,
        "get_config",
        lambda: {"enabled": True, "interval_hours": 6, "last_run": "2026-07-15T09:00:00"},
    )
    monkeypatch.setattr(auto_iteration, "get_log", lambda limit=20: [{"trigger": "test"}])
    monkeypatch.setattr(
        champion_challenger,
        "get_registry",
        lambda: type(
            "FakeRegistry",
            (),
            {"list_all": lambda self: {"champions": [], "challengers": [], "retired": []}},
        )(),
    )

    body = asyncio.run(intelligence_routes.iteration_overview())

    assert body["automation"]["enabled"] is True
    assert body["automation"]["interval_hours"] == 6
    assert body["automation"]["last_run"] == "2026-07-15T09:00:00"
    assert body["automation"]["recent_log"] == [{"trigger": "test"}]


def test_auto_iteration_safe_cycle_runs_promotion_and_champion_ingest(monkeypatch, tmp_path):
    import asyncio
    from types import SimpleNamespace

    from core.adaptive import auto_iteration, champion_challenger, promotion_gate, retrain_orchestrator
    from signals import catalog as catalog_module
    from tournament import tournament_runner

    captured = {}

    class FakeRunner:
        async def run_and_feedback(self, products=None):
            captured["runner_products"] = products
            return {
                "strategies_with_trades": 1,
                "top_strategy": "trend_ichimoku",
                "top_sharpe": 1.1,
                "retired": [],
            }

    class FakeManager:
        async def get_leaderboard(self, top_n):
            return [SimpleNamespace(name="trend_ichimoku", current_score=42.0, trades=12)]

    class FakeCatalog:
        def all(self):
            strategy_type = SimpleNamespace(value="trend")
            return [SimpleNamespace(name="trend_ichimoku", strategy_type=strategy_type)]

    class FakeOrchestrator:
        def run_cycle(self, strategy_names, param_n_iter):
            captured["retrain"] = (strategy_names, param_n_iter)
            return SimpleNamespace(param_optimized=["trend_ichimoku"] )

    class FakeGate:
        def evaluate_candidates(self, strategy_names, products=None):
            captured["promotion"] = (strategy_names, products)
            return {
                "evaluated": 1,
                "promoted": [
                    {
                        "strategy_name": "trend_ichimoku",
                        "passed": True,
                        "mean_oos_sharpe": 0.6,
                        "regime": "TRENDING",
                    }
                ],
                "rejected": [],
                "champions_by_regime": {"TRENDING": {"strategy_name": "trend_ichimoku"}},
            }

    class FakeRegistry:
        def ingest_promotion_verdicts(self, verdicts):
            captured["cc"] = verdicts
            return {"evaluations_recorded": len(verdicts)}

    monkeypatch.setattr(auto_iteration, "get_config", lambda: {
        "top_n_for_param": 3,
        "param_n_iter": 2,
        "promotion_top_n": 1,
        "promotion_products": ["RB"],
    })
    monkeypatch.setattr(auto_iteration, "_append_log", lambda entry: captured.setdefault("log", entry))
    monkeypatch.setattr(auto_iteration, "_CONFIG_FILE", tmp_path / "test_auto_config.json")
    monkeypatch.setattr(tournament_runner, "get_runner", lambda: FakeRunner())
    import api.routes.tournament_routes as tournament_routes
    monkeypatch.setattr(tournament_routes, "_manager", FakeManager())
    monkeypatch.setattr(catalog_module, "get_catalog", lambda: FakeCatalog())
    monkeypatch.setattr(retrain_orchestrator, "get_orchestrator", lambda: FakeOrchestrator())
    monkeypatch.setattr(promotion_gate, "get_gate", lambda: FakeGate())
    monkeypatch.setattr(champion_challenger, "get_registry", lambda: FakeRegistry())

    summary = asyncio.run(auto_iteration.run_safe_cycle(trigger="test"))

    assert captured["promotion"] == (["trend_ichimoku"], ["RB"])
    assert captured["cc"] == summary["promotion"]["verdicts"]
    assert summary["promotion"]["evaluated"] == 1
    assert summary["promotion"]["champion_challenger"] == {"evaluations_recorded": 1}


def test_backtest_batch_results_convert_to_closed_loop_contract():
    from api.routes import backtest_routes

    rows = [
        {
            "strategy": "trend_ma_cross",
            "sharpe_ratio": 1.25,
            "win_rate": 0.56,
            "max_drawdown": -0.08,
            "total_trades": 14,
            "total_return": 0.18,
            "profit_factor": 1.9,
        }
    ]

    payload = backtest_routes._to_tournament_results("RB", rows)

    assert payload["id"].startswith("batch_RB_")
    assert payload["source"] == "backtest_batch"
    assert payload["strategies"] == [
        {
            "name": "trend_ma_cross",
            "symbol": "RB",
            "sharpe": 1.25,
            "win_rate": 0.56,
            "max_drawdown": -0.08,
            "total_trades": 14,
            "total_return": 0.18,
            "profit_factor": 1.9,
        }
    ]


def test_backtest_batch_applies_tournament_feedback_and_degradation_updates():
    import asyncio
    from types import SimpleNamespace

    from api.routes import backtest_routes

    rows = [
        {
            "strategy": "s1",
            "sharpe_ratio": 0.7,
            "win_rate": 0.52,
            "max_drawdown": -0.04,
            "total_trades": 6,
            "total_return": 0.09,
            "profit_factor": 1.4,
        },
        {
            "strategy": "silent",
            "sharpe_ratio": 0.0,
            "win_rate": 0.0,
            "max_drawdown": 0.0,
            "total_trades": 0,
            "total_return": 0.0,
            "profit_factor": 0.0,
        },
    ]
    calls = {"records": [], "score_updates": 0, "feedback": None, "degradation": None}

    class FakeManager:
        async def record_result(self, **kwargs):
            calls["records"].append(kwargs)

        async def update_scores(self):
            calls["score_updates"] += 1

    class FakeFeedback:
        def process_tournament_results(self, payload):
            calls["feedback"] = payload
            return SimpleNamespace(
                top_strategy="s1",
                top_sharpe=0.7,
                strategies_retired=[],
                strategies_starred=[],
            )

    class FakeDegradation:
        def update(self, payload):
            calls["degradation"] = payload
            return {"retired": [], "degraded": ["silent"], "total_tracked": 2}

    meta = asyncio.run(
        backtest_routes._apply_closed_loop_updates(
            "RB",
            rows,
            manager=FakeManager(),
            feedback_loop=FakeFeedback(),
            degradation_tracker=FakeDegradation(),
        )
    )

    assert meta["closed_loop"] is True
    assert meta["tournament_updated"] == 2
    assert meta["feedback"]["top_strategy"] == "s1"
    assert meta["degradation"]["degraded"] == ["silent"]
    assert calls["score_updates"] == 1
    assert [record["name"] for record in calls["records"]] == ["s1", "silent"]
    assert calls["feedback"]["strategies"][0]["name"] == "s1"
    assert calls["degradation"] == {"RB": rows}



def test_backtest_closed_loop_replaces_stale_tournament_entries(tmp_path, monkeypatch):
    import asyncio
    from types import SimpleNamespace

    from api.routes import backtest_routes
    from tournament import tournament_manager

    monkeypatch.setattr(tournament_manager, "_STATE_FILE", tmp_path / "tournament_state.json")
    manager = tournament_manager.TournamentManager()

    rows = [
        {
            "strategy": "fresh",
            "sharpe_ratio": 0.8,
            "win_rate": 0.55,
            "max_drawdown": -0.03,
            "total_trades": 8,
            "total_return": 0.11,
            "profit_factor": 1.6,
        }
    ]

    class FakeFeedback:
        def process_tournament_results(self, payload):
            return SimpleNamespace(
                top_strategy="fresh",
                top_sharpe=0.8,
                strategies_retired=[],
                strategies_starred=[],
            )

    class FakeDegradation:
        def update(self, payload):
            return {"retired": [], "degraded": [], "total_tracked": 1}

    async def run():
        await manager.record_result(
            "stale",
            sharpe=9.0,
            win_rate=1.0,
            profit_factor=9.0,
            max_drawdown=0.0,
            total_trades=99,
            total_return=9.0,
        )
        await backtest_routes._apply_closed_loop_updates(
            "RB",
            rows,
            manager=manager,
            feedback_loop=FakeFeedback(),
            degradation_tracker=FakeDegradation(),
        )
        return await manager.get_leaderboard(10)

    board = asyncio.run(run())

    assert [entry.name for entry in board] == ["fresh"]



def test_daily_batch_backtest_reuses_safe_closed_loop(monkeypatch):
    """Scheduled daily batch must reuse the same closed-loop automation path as UI run-now."""
    from core.adaptive import auto_iteration
    from tasks.scheduled_tasks import daily_batch_backtest

    captured = {}

    async def fake_run_safe_cycle(trigger="auto"):
        captured["trigger"] = trigger
        return {
            "tournament": {"strategies_with_trades": 2, "top_strategy": "trend_ma_cross"},
            "promotion": {"promoted": 1, "rejected": 1},
        }

    monkeypatch.setattr(auto_iteration, "run_safe_cycle", fake_run_safe_cycle)

    daily_batch_backtest.run()

    assert captured["trigger"] == "daily_batch_backtest"



def test_automation_config_accepts_promotion_options(monkeypatch):
    """Automation config API should persist promotion settings used by safe cycle."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from api.routes import intelligence_routes
    from core.adaptive import auto_iteration

    captured = {}

    def fake_update_config(patch):
        captured.update(patch)
        return patch

    monkeypatch.setattr(auto_iteration, "update_config", fake_update_config)
    app = FastAPI()
    app.include_router(intelligence_routes.router)
    client = TestClient(app)

    response = client.post("/api/v1/intelligence/automation/config", json={
        "enabled": True,
        "promotion_top_n": 2,
        "promotion_products": ["RB", "CU"],
    })

    assert response.status_code == 200
    assert captured["enabled"] is True
    assert captured["promotion_top_n"] == 2
    assert captured["promotion_products"] == ["RB", "CU"]


def test_automation_config_can_clear_promotion_products(monkeypatch):
    """Explicit null promotion_products should clear a previous product restriction."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from api.routes import intelligence_routes
    from core.adaptive import auto_iteration

    captured = {}

    def fake_update_config(patch):
        captured.update(patch)
        return patch

    monkeypatch.setattr(auto_iteration, "update_config", fake_update_config)
    app = FastAPI()
    app.include_router(intelligence_routes.router)
    client = TestClient(app)

    response = client.post("/api/v1/intelligence/automation/config", json={
        "enabled": True,
        "promotion_products": None,
    })

    assert response.status_code == 200
    assert captured["enabled"] is True
    assert "promotion_products" in captured
    assert captured["promotion_products"] is None


def test_update_config_persists_cleared_promotion_products(tmp_path, monkeypatch):
    """Config storage should treat promotion_products=None as an explicit global scope."""
    import json
    from core.adaptive import auto_iteration

    cfg_path = tmp_path / "automation_config.json"
    cfg_path.write_text(json.dumps({"enabled": True, "promotion_products": ["RB"]}), encoding="utf-8")
    monkeypatch.setattr(auto_iteration, "_CONFIG_FILE", cfg_path)

    cfg = auto_iteration.update_config({"promotion_products": None})

    assert cfg["promotion_products"] is None
    saved = json.loads(cfg_path.read_text(encoding="utf-8"))
    assert saved["promotion_products"] is None


def test_automation_run_now_returns_background_status(monkeypatch):
    """Manual automation trigger should not await the heavy safe cycle HTTP request."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from api.routes import intelligence_routes
    from core.adaptive import auto_iteration

    captured = {}

    def fake_start_safe_cycle_background(trigger="manual"):
        captured["trigger"] = trigger
        return {"status": "started", "running": True, "trigger": trigger}

    monkeypatch.setattr(auto_iteration, "start_safe_cycle_background", fake_start_safe_cycle_background)
    app = FastAPI()
    app.include_router(intelligence_routes.router)
    client = TestClient(app)

    response = client.post("/api/v1/intelligence/automation/run-now")

    assert response.status_code == 200
    assert response.json()["status"] == "started"
    assert response.json()["running"] is True
    assert captured["trigger"] == "manual"

def test_china_finance_data_adapters_route_precedes_symbol_route():
    from api.routes.china_finance_routes import router as china_finance_router

    get_paths = [
        route.path
        for route in china_finance_router.routes
        if "GET" in getattr(route, "methods", set())
    ]

    assert get_paths.index("/api/v1/china-finance/data/adapters") < get_paths.index(
        "/api/v1/china-finance/data/{symbol}"
    )


def test_china_finance_data_adapters_returns_adapter_list():
    from api.routes.china_finance_routes import router as china_finance_router

    app = FastAPI()
    app.include_router(china_finance_router)

    response = TestClient(app).get("/api/v1/china-finance/data/adapters")

    assert response.status_code == 200
    body = response.json()
    assert body["adapters"][0]["name"] == "akshare"

def _research_candidate_payload(name="ml_factor_candidate_test"):
    return {
        "source": "factor_research",
        "asset_type": "futures",
        "symbols": ["RB2610"],
        "features": ["alpha001", "realized_vol_20"],
        "strategy_definition": {
            "name": name,
            "display_name": "ML因子候选策略",
            "strategy_type": "trend",
            "description": "由研究中心生成的候选策略",
            "fast_period": 5,
            "slow_period": 20,
        },
        "research_metrics": {"ic": 0.08},
        "data_coverage": {"d1_bars": 120},
    }


def test_generated_strategy_code_escapes_display_name_literals():
    import ast

    from api.routes.strategy_routes import StrategyDefinition, _generate_strategy_code

    payload = 'safe"\n    __import__("pathlib").Path("pwned").write_text("owned")\n    #'
    code = _generate_strategy_code(
        StrategyDefinition(name="candidate_escape_test", display_name=payload)
    )
    tree = ast.parse(code)
    injected_import_calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "__import__"
    ]

    assert injected_import_calls == []
    assert repr(payload) in code


def test_research_candidate_promote_escapes_untrusted_display_name(tmp_path, monkeypatch):
    import ast

    from api.routes import research_candidate_routes, strategy_routes

    store_file = tmp_path / "research_candidates.json"
    user_dir = tmp_path / "user_strategies"
    monkeypatch.setattr(research_candidate_routes, "_STORE_FILE", store_file)
    monkeypatch.setattr(strategy_routes, "_USER_DIR", user_dir)

    app = FastAPI()
    app.include_router(research_candidate_routes.router)
    client = TestClient(app)

    payload = _research_candidate_payload("research_escape_test")
    payload["strategy_definition"]["display_name"] = (
        'safe"\n    __import__("pathlib").Path("pwned").write_text("owned")\n    #'
    )
    created = client.post("/api/v1/research/candidates", json=payload).json()

    promoted = client.post(f"/api/v1/research/candidates/{created['id']}/promote-to-strategy")

    assert promoted.status_code == 200
    generated = user_dir / "research_escape_test.py"
    tree = ast.parse(generated.read_text(encoding="utf-8"))
    injected_import_calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "__import__"
    ]
    assert injected_import_calls == []


def test_research_candidate_create_list_and_promote(tmp_path, monkeypatch):
    from api.routes import research_candidate_routes

    store_file = tmp_path / "research_candidates.json"
    monkeypatch.setattr(research_candidate_routes, "_STORE_FILE", store_file)

    async def fake_create_strategy(defn):
        return {"success": True, "strategy_name": defn.name, "file": "signals/strategies/user/test.py"}

    monkeypatch.setattr(research_candidate_routes, "_create_strategy", fake_create_strategy)

    app = FastAPI()
    app.include_router(research_candidate_routes.router)
    client = TestClient(app)

    created = client.post("/api/v1/research/candidates", json=_research_candidate_payload())
    assert created.status_code == 200
    candidate = created.json()
    assert candidate["status"] == "draft"
    assert candidate["asset_type"] == "futures"
    assert candidate["symbols"] == ["RB2610"]

    listed = client.get("/api/v1/research/candidates?asset_type=futures")
    assert listed.status_code == 200
    assert listed.json()["count"] == 1

    promoted = client.post(f"/api/v1/research/candidates/{candidate['id']}/promote-to-strategy")
    assert promoted.status_code == 200
    promoted_body = promoted.json()
    assert promoted_body["status"] == "promoted"
    assert promoted_body["promoted_strategy"] == "ml_factor_candidate_test"


def test_research_candidate_run_backtest_uses_canonical_batch(tmp_path, monkeypatch):
    from api.routes import research_candidate_routes

    store_file = tmp_path / "research_candidates.json"
    monkeypatch.setattr(research_candidate_routes, "_STORE_FILE", store_file)

    async def fake_create_strategy(defn):
        return {"success": True, "strategy_name": defn.name}

    captured = {}

    async def fake_batch_backtest(symbol="RB", limit=250, asset_type=research_candidate_routes.AssetType.FUTURES):
        captured["symbol"] = symbol
        captured["limit"] = limit
        captured["asset_type"] = asset_type.value
        return {
            "symbol": symbol,
            "total": 1,
            "with_trades": 1,
            "top5": [{"strategy": "research_backtest_candidate", "sharpe_ratio": 1.2, "total_trades": 3}],
            "closed_loop": {"closed_loop": True, "tournament_updated": 1},
        }

    monkeypatch.setattr(research_candidate_routes, "_create_strategy", fake_create_strategy)
    monkeypatch.setattr(research_candidate_routes, "_batch_backtest", fake_batch_backtest)

    app = FastAPI()
    app.include_router(research_candidate_routes.router)
    client = TestClient(app)

    created = client.post(
        "/api/v1/research/candidates",
        json=_research_candidate_payload("research_backtest_candidate"),
    ).json()

    response = client.post(f"/api/v1/research/candidates/{created['id']}/run-backtest?limit=120")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "challenger"
    assert body["promoted_strategy"] == "research_backtest_candidate"
    assert captured == {"symbol": "RB", "limit": 120, "asset_type": "futures"}
    assert body["backtest_result"]["symbol"] == "RB"
    assert body["backtest_result"]["closed_loop"]["tournament_updated"] == 1
    assert body["research_metrics"]["candidate_quality_label"] == "strong_challenger"
    assert body["research_metrics"]["candidate_quality_score"] >= 75




def test_research_candidate_backtest_routes_stock_to_asset_adapter(tmp_path, monkeypatch):
    from api.routes import research_candidate_routes

    store_file = tmp_path / "research_candidates.json"
    monkeypatch.setattr(research_candidate_routes, "_STORE_FILE", store_file)

    async def fake_create_strategy(defn):
        return {"success": True, "strategy_name": defn.name}

    captured = {}

    async def fake_batch_backtest(
        symbol="RB",
        limit=250,
        asset_type=research_candidate_routes.AssetType.FUTURES,
    ):
        captured["symbol"] = symbol
        captured["limit"] = limit
        captured["asset_type"] = asset_type.value
        return {
            "symbol": symbol,
            "total": 1,
            "with_trades": 1,
            "top5": [{"strategy": "stock_candidate", "sharpe_ratio": 0.8, "total_trades": 4}],
            "closed_loop": {"closed_loop": True, "tournament_updated": 1},
        }

    monkeypatch.setattr(research_candidate_routes, "_create_strategy", fake_create_strategy)
    monkeypatch.setattr(research_candidate_routes, "_batch_backtest", fake_batch_backtest)

    app = FastAPI()
    app.include_router(research_candidate_routes.router)
    client = TestClient(app)

    payload = _research_candidate_payload("stock_candidate")
    payload["asset_type"] = "stock"
    payload["symbols"] = ["000001.SZ"]
    created = client.post("/api/v1/research/candidates", json=payload).json()

    response = client.post(f"/api/v1/research/candidates/{created['id']}/run-backtest?limit=120")

    assert response.status_code == 200
    assert captured == {"symbol": "000001.SZ", "limit": 120, "asset_type": "stock"}
    assert response.json()["status"] == "backtested"


def test_research_candidate_source_exception_is_marked_and_blocked(tmp_path, monkeypatch):
    from api.routes import research_candidate_routes

    store_file = tmp_path / "research_candidates.json"
    watchlist_file = tmp_path / "sync_watchlist.json"
    watchlist_file.write_text(
        '{"configs":[{"symbol":"ZC","status":"source_exception","reason":"no recent tradable data","skip_downstream":true}]}',
        encoding="utf-8",
    )
    monkeypatch.setattr(research_candidate_routes, "_STORE_FILE", store_file)
    monkeypatch.setattr(research_candidate_routes, "_WATCHLIST_FILE", watchlist_file)

    app = FastAPI()
    app.include_router(research_candidate_routes.router)
    client = TestClient(app)

    payload = _research_candidate_payload("zc_candidate")
    payload["symbols"] = ["ZC2212"]

    created = client.post("/api/v1/research/candidates", json=payload)
    assert created.status_code == 200
    body = created.json()
    assert body["data_coverage"]["skip_downstream"] is True
    assert body["data_coverage"]["watchlist_status"] == "source_exception"

    promoted = client.post(f"/api/v1/research/candidates/{body['id']}/promote-to-strategy")
    assert promoted.status_code == 409
    assert "no recent tradable data" in promoted.json()["detail"]

    backtested = client.post(f"/api/v1/research/candidates/{body['id']}/run-backtest")
    assert backtested.status_code == 409
    assert "no recent tradable data" in backtested.json()["detail"]


def test_research_candidate_retire_marks_skip_downstream(tmp_path, monkeypatch):
    from api.routes import research_candidate_routes

    store_file = tmp_path / "research_candidates.json"
    monkeypatch.setattr(research_candidate_routes, "_STORE_FILE", store_file)

    app = FastAPI()
    app.include_router(research_candidate_routes.router)
    client = TestClient(app)

    created = client.post("/api/v1/research/candidates", json=_research_candidate_payload("retire_candidate"))
    assert created.status_code == 200
    candidate_id = created.json()["id"]

    retired = client.post(
        f"/api/v1/research/candidates/{candidate_id}/retire",
        json={"reason": "回测样本不足"},
    )

    assert retired.status_code == 200
    body = retired.json()
    assert body["status"] == "retired"
    assert body["data_coverage"]["skip_downstream"] is True
    assert body["data_coverage"]["retired_reason"] == "回测样本不足"

    promoted = client.post(f"/api/v1/research/candidates/{candidate_id}/promote-to-strategy")
    assert promoted.status_code == 409
    assert "回测样本不足" in promoted.json()["detail"]



def test_research_candidate_weak_backtest_stays_backtested(tmp_path, monkeypatch):
    from api.routes import research_candidate_routes

    store_file = tmp_path / "research_candidates.json"
    monkeypatch.setattr(research_candidate_routes, "_STORE_FILE", store_file)

    async def fake_create_strategy(defn):
        return {"success": True, "strategy_name": defn.name}

    async def fake_batch_backtest(symbol="RB", limit=250, asset_type=research_candidate_routes.AssetType.FUTURES):
        return {
            "symbol": symbol,
            "total": 1,
            "with_trades": 1,
            "top5": [{"strategy": "weak_candidate", "sharpe_ratio": 0.1, "total_trades": 2}],
            "closed_loop": {"closed_loop": True, "tournament_updated": 1},
        }

    monkeypatch.setattr(research_candidate_routes, "_create_strategy", fake_create_strategy)
    monkeypatch.setattr(research_candidate_routes, "_batch_backtest", fake_batch_backtest)

    app = FastAPI()
    app.include_router(research_candidate_routes.router)
    client = TestClient(app)

    created = client.post(
        "/api/v1/research/candidates",
        json=_research_candidate_payload("weak_candidate"),
    ).json()

    response = client.post(f"/api/v1/research/candidates/{created['id']}/run-backtest?limit=120")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "backtested"
    assert body["research_metrics"]["candidate_quality_label"] == "needs_review"
    assert body["research_metrics"]["candidate_quality_score"] < 75


def test_tournament_research_challengers_exposes_only_safe_promoted_candidates(tmp_path, monkeypatch):
    import json
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from api.routes import research_candidate_routes, tournament_routes

    store_file = tmp_path / "research_candidates.json"
    monkeypatch.setattr(research_candidate_routes, "_STORE_FILE", store_file)
    monkeypatch.setattr(research_candidate_routes, "_WATCHLIST_FILE", tmp_path / "missing_watchlist.json")

    now = "2026-07-16T10:00:00+00:00"

    def candidate(candidate_id, status, promoted_strategy, skip_downstream=False):
        payload = _research_candidate_payload(candidate_id)
        return {
            "id": candidate_id,
            "source": payload["source"],
            "asset_type": payload["asset_type"],
            "symbols": payload["symbols"],
            "features": payload["features"],
            "strategy_definition": payload["strategy_definition"],
            "research_metrics": {
                "candidate_quality_label": "strong_challenger",
                "candidate_quality_score": 82.5,
                "candidate_quality_reason": "ok",
                "candidate_quality_sharpe": 1.2,
                "candidate_quality_trades": 6,
            },
            "data_coverage": {"skip_downstream": skip_downstream},
            "status": status,
            "promoted_strategy": promoted_strategy,
            "backtest_result": None,
            "created_at": now,
            "updated_at": now,
        }

    store_file.write_text(json.dumps([
        candidate("safe", "challenger", "safe_strategy"),
        candidate("draft", "draft", "draft_strategy"),
        candidate("blocked", "challenger", "blocked_strategy", skip_downstream=True),
        candidate("missing_strategy", "challenger", None),
    ]), encoding="utf-8")

    app = FastAPI()
    app.include_router(tournament_routes.router)
    response = TestClient(app).get("/api/v1/tournament/research-challengers")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["challengers"][0]["id"] == "safe"
    assert body["challengers"][0]["promoted_strategy"] == "safe_strategy"
    assert body["challengers"][0]["quality_label"] == "strong_challenger"

    invalid = TestClient(app).get("/api/v1/tournament/research-challengers?asset_type=crypto")
    assert invalid.status_code == 422
    assert "futures" in invalid.json()["detail"]


def test_db_kline_query_uses_postgres_warehouse_schema():
    source = Path("api/routes/db_routes.py").read_text(encoding="utf-8")

    assert "FROM kline k" in source
    assert "JOIN symbols s ON s.symbol_id = k.symbol_id" in source
    assert "k.timeframe = :period" in source
    assert "FROM klines" not in source
