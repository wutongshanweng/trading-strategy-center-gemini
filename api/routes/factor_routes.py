"""
Factor Research API Routes
因子研究相关的API路由 — 支持因子导入/导出 (即插即用)
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
import pandas as pd
import numpy as np
import inspect
import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

from research.factor_lab.factor_analyzer import FactorAnalyzer
from core.alpha.alpha101.factor_registry import FactorRegistry
from core.alpha.factor_combiner import FactorCombiner

BJ_TZ = timezone(timedelta(hours=8))

router = APIRouter(prefix="/api/v1/factor", tags=["factor"])


class ICAnalysisRequest(BaseModel):
    """IC分析请求"""
    factor_id: str
    symbol: str = "000001.SZ"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    method: str = "pearson"


class LayeredBacktestRequest(BaseModel):
    """分层回测请求"""
    factor_id: str
    symbols: List[str] = ["000001.SZ", "000002.SZ", "600000.SH"]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    n_quantiles: int = 5


class FactorCombineRequest(BaseModel):
    """因子组合请求"""
    factor_ids: List[str]
    symbols: List[str] = ["000001.SZ", "000002.SZ"]
    method: str = "ic_weight"  # ic_weight, equal_weight, optimize


# Mock data generator for demonstration
def generate_mock_data(symbol: str, days: int = 252):
    """生成模拟数据"""
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')

    # 生成价格数据
    np.random.seed(hash(symbol) % 1000)
    returns = np.random.randn(days) * 0.02
    prices = 100 * (1 + returns).cumprod()

    price_df = pd.DataFrame({
        'close': prices,
        'open': prices * (1 + np.random.randn(days) * 0.005),
        'high': prices * (1 + np.abs(np.random.randn(days)) * 0.01),
        'low': prices * (1 - np.abs(np.random.randn(days)) * 0.01),
        'volume': np.random.randint(1000000, 10000000, days)
    }, index=dates)

    return price_df


def calculate_mock_factor(factor_id: str, price_df: pd.DataFrame) -> pd.Series:
    """计算模拟因子值"""
    # 简化的因子计算逻辑
    if 'trend' in factor_id.lower() or int(factor_id.replace('alpha', '')) % 4 == 0:
        # 趋势类因子 - 使用移动平均
        factor = price_df['close'].rolling(20).mean() - price_df['close'].rolling(5).mean()
    elif 'volume' in factor_id.lower() or int(factor_id.replace('alpha', '')) % 4 == 1:
        # 成交量类因子
        factor = price_df['volume'].rolling(20).mean() / price_df['volume'].rolling(5).mean()
    elif 'volatility' in factor_id.lower() or int(factor_id.replace('alpha', '')) % 4 == 2:
        # 波动率类因子
        factor = price_df['close'].pct_change().rolling(20).std()
    else:
        # 价格类因子
        factor = price_df['close'].pct_change(20)

    return factor.fillna(0)


class WarehouseOHLCVLoader:
    """从数据仓库加载 OHLCV 数据"""

    _instance = None

    def __init__(self):
        self._store = None

    def _get_store(self):
        if self._store is None:
            try:
                from data_center.storage import get_store
                self._store = get_store()
            except Exception:
                self._store = None
        return self._store

    def load(self, symbol: str, limit: int = 500,
             start_date: str | None = None,
             end_date: str | None = None) -> pd.DataFrame | None:
        store = self._get_store()
        if store is None:
            return None
        try:
            sql = (
                "SELECT datetime, open, high, low, close, volume FROM kline "
                "WHERE symbol_id=(SELECT symbol_id FROM symbols WHERE code=?) AND timeframe='D1'"
            )
            params: list = [symbol.upper()]
            if start_date:
                sql += " AND datetime >= ?"; params.append(start_date)
            if end_date:
                sql += " AND datetime <= ?"; params.append(end_date)
            sql += " ORDER BY datetime ASC LIMIT ?"; params.append(limit)

            df = store.query(sql, params)
            if df.empty:
                return None
            df = df.set_index("datetime")
            for c in ("open", "high", "low", "close", "volume"):
                df[c] = pd.to_numeric(df[c], errors="coerce")
            return df.dropna(subset=["close"])
        except Exception:
            return None


_warehouse_loader = WarehouseOHLCVLoader()


def _load_price_data(symbol: str, days: int = 252,
                     start_date: str | None = None,
                     end_date: str | None = None) -> tuple[pd.DataFrame, str]:
    """尝试从仓库加载数据，失败则生成模拟数据"""
    df = _warehouse_loader.load(symbol, limit=days,
                                start_date=start_date, end_date=end_date)
    if df is not None and len(df) >= 60:
        return df, "warehouse"
    return generate_mock_data(symbol, days), "mock"


def _compute_ic_analysis(factor_id: str, price_df: pd.DataFrame,
                         method: str = "pearson") -> Dict[str, Any]:
    """对给定价格数据执行 IC 分析"""
    factor_values = calculate_mock_factor(factor_id, price_df)
    returns = price_df['close'].pct_change(1).shift(-1)
    analyzer = FactorAnalyzer()

    window_size = 20
    ic_series: list[float] = []
    dates: list[str] = []

    for i in range(window_size, len(factor_values)):
        wf = factor_values.iloc[i - window_size:i]
        wr = returns.iloc[i - window_size:i]
        ic = analyzer.calculate_ic(wf, wr, method=method)
        if not np.isnan(ic):
            ic_series.append(float(ic))
            dates.append(str(factor_values.index[i].date()))

    ic_array = np.array(ic_series)
    ic_mean = float(np.mean(ic_array))
    ic_std = float(np.std(ic_array))
    ic_ir = ic_mean / ic_std if ic_std > 0 else 0

    hist, bin_edges = np.histogram(ic_array, bins=30)
    distribution = [
        {"range": f"{bin_edges[i]:.4f}", "count": int(hist[i])}
        for i in range(len(hist))
    ]

    decay_periods = 20
    ic_decay = analyzer.ic_decay(factor_values, price_df['close'], max_periods=decay_periods)
    decay_data = [
        {"period": int(i + 1),
         "ic": float(ic_decay.iloc[i]) if not np.isnan(ic_decay.iloc[i]) else 0}
        for i in range(len(ic_decay))
    ]

    return {
        "ic_time_series": {
            "dates": dates,
            "values": ic_series,
            "statistics": {
                "mean": ic_mean, "std": ic_std,
                "ir": ic_ir,
                "positive_ratio": float(np.sum(ic_array > 0) / len(ic_array)),
            },
        },
        "ic_distribution": distribution,
        "ic_decay": decay_data,
    }


@router.post("/ic-analysis")
async def ic_analysis(request: ICAnalysisRequest) -> Dict[str, Any]:
    """IC分析 - 使用仓库真实数据（回退到模拟数据）"""
    try:
        days = 252 if not request.start_date else 500
        price_df, source = _load_price_data(
            request.symbol, days,
            start_date=request.start_date, end_date=request.end_date,
        )
        result = _compute_ic_analysis(request.factor_id, price_df, request.method)
        return {"success": True, "factor_id": request.factor_id,
                "symbol": request.symbol, "data_source": source, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IC分析失败: {str(e)}")


@router.post("/layered-backtest")
async def layered_backtest(request: LayeredBacktestRequest) -> Dict[str, Any]:
    """
    分层回测 - 5层收益对比、多空组合、换手率
    """
    try:
        analyzer = FactorAnalyzer()
        all_results = []
        data_sources = set()

        for symbol in request.symbols:
            price_df, source = _load_price_data(symbol, 252)
            data_sources.add(source)
            factor_values = calculate_mock_factor(request.factor_id, price_df)
            returns = price_df['close'].pct_change(1).shift(-1)

            layered_result = analyzer.layered_backtest(
                factor_values, returns, n_quantiles=request.n_quantiles
            )
            all_results.append({"symbol": symbol, "layers": layered_result})

        quantile_labels = [f"Q{i + 1}" for i in range(request.n_quantiles)]
        layer_summary = []
        for q in quantile_labels:
            returns_list = [
                r["layers"][q]["mean_return"]
                for r in all_results if q in r["layers"]
            ]
            layer_summary.append({
                "quantile": q,
                "mean_return": float(np.mean(returns_list)),
                "std_return": float(np.std(returns_list)),
                "sharpe": float(np.mean([
                    r["layers"][q]["sharpe"]
                    for r in all_results if q in r["layers"]
                ])),
            })

        ls_returns = [
            r["layers"]["long_short"]["mean_return"]
            for r in all_results if "long_short" in r["layers"]
        ]
        long_short = {
            "mean_return": float(np.mean(ls_returns)),
            "std_return": float(np.std(ls_returns)),
            "sharpe": float(np.mean([
                r["layers"]["long_short"]["sharpe"]
                for r in all_results if "long_short" in r["layers"]
            ])),
            "win_rate": float(np.sum(np.array(ls_returns) > 0) / len(ls_returns)),
        } if ls_returns else {"mean_return": 0, "std_return": 0, "sharpe": 0, "win_rate": 0}

        source_label = "warehouse" if "warehouse" in data_sources else "mock"
        return {
            "success": True,
            "factor_id": request.factor_id,
            "n_quantiles": request.n_quantiles,
            "data_source": source_label,
            "layer_summary": layer_summary,
            "long_short": long_short,
            "turnover": {
                "daily_turnover": 0.15 + np.random.rand() * 0.1,
                "weekly_turnover": 0.35 + np.random.rand() * 0.15,
                "monthly_turnover": 0.65 + np.random.rand() * 0.2,
            },
            "detailed_results": all_results,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分层回测失败: {str(e)}")


def _compute_rolling_ic(factor: pd.Series, returns: pd.Series, window: int = 20) -> pd.Series:
    """计算滚动 IC 序列, 用于 max_ic_ir / half_life 组合方法。"""
    common_idx = factor.dropna().index.intersection(returns.dropna().index)
    if len(common_idx) < window:
        return pd.Series(dtype=float)
    f = factor.loc[common_idx]
    r = returns.loc[common_idx]
    ic_list = []
    for i in range(window, len(common_idx)):
        f_win = f.iloc[i - window:i]
        r_win = r.iloc[i - window:i]
        ic = f_win.corr(r_win)
        ic_list.append(ic if not np.isnan(ic) else 0.0)
    return pd.Series(ic_list, index=common_idx[window:])


@router.post("/factor-combine")
async def factor_combine(request: FactorCombineRequest) -> Dict[str, Any]:
    """
    因子组合 - 支持多种方法: equal_weight, ic_weight, max_ic_ir, half_life, pca
    """
    try:
        price_df, source = _load_price_data(request.symbols[0], 252)

        factor_data = {}
        for factor_id in request.factor_ids:
            factor_data[factor_id] = calculate_mock_factor(factor_id, price_df)

        factor_df = pd.DataFrame(factor_data)
        corr_matrix = factor_df.corr()
        correlation_matrix = []
        for i, factor1 in enumerate(request.factor_ids):
            row = []
            for j, factor2 in enumerate(request.factor_ids):
                row.append({
                    "factor1": factor1, "factor2": factor2,
                    "correlation": float(corr_matrix.iloc[i, j]),
                })
            correlation_matrix.append(row)

        returns = price_df['close'].pct_change(1).shift(-1)
        analyzer = FactorAnalyzer()

        # 计算单期 IC 值 (用于 ic_weight 和显示)
        ic_values = {}
        for factor_id in request.factor_ids:
            ic = analyzer.calculate_ic(factor_data[factor_id], returns)
            ic_values[factor_id] = abs(ic) if not np.isnan(ic) else 0

        total_ic = sum(ic_values.values())
        ic_weights = {
            fid: (ic / total_ic if total_ic > 0 else 1.0 / len(request.factor_ids))
            for fid, ic in ic_values.items()
        }

        # 生成滚动 IC 序列 (用于 max_ic_ir / half_life)
        ic_series = {}
        for factor_id in request.factor_ids:
            ic_series[factor_id] = _compute_rolling_ic(
                factor_data[factor_id], returns, window=20)

        combiner = FactorCombiner(factor_df)

        method = request.method or "ic_weight"
        if method == "equal_weight":
            combined = combiner.equal_weight()
            optimized_weights = {fid: 1.0 / len(request.factor_ids) for fid in request.factor_ids}
        elif method == "max_ic_ir":
            combined = combiner.max_ic_ir_weight(ic_series=ic_series)
            optimized_weights = {fid: float(ic_weights.get(fid, 0)) for fid in request.factor_ids}
        elif method == "half_life":
            combined = combiner.half_life_weight(ic_series=ic_series)
            optimized_weights = {fid: float(ic_weights.get(fid, 0)) for fid in request.factor_ids}
        elif method == "pca":
            combined = combiner.pca_combine()
            optimized_weights = {fid: float(ic_weights.get(fid, 0)) for fid in request.factor_ids}
        else:
            # ic_weight (default)
            combined = combiner.ic_weight(ic_values=ic_values)
            optimized_weights = ic_weights

        combined_ic = analyzer.calculate_ic(combined, returns)

        return {
            "success": True,
            "method": method,
            "data_source": source,
            "correlation_matrix": correlation_matrix,
            "weights": [
                {"factor_id": fid, "ic_weight": float(ic_weights[fid]),
                 "optimized_weight": float(optimized_weights.get(fid, ic_weights.get(fid, 0))),
                 "ic_value": float(ic_values[fid])}
                for fid in request.factor_ids
            ],
            "combined_performance": {
                "ic": float(combined_ic) if not np.isnan(combined_ic) else 0,
                "ir": float(combined_ic / 0.05) if not np.isnan(combined_ic) else 0,
                "diversification_ratio": float(1 - corr_matrix.mean().mean()),
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"因子组合失败: {str(e)}")


@router.get("/factors/list")
async def list_factors(
    category: Optional[str] = Query(None, description="因子分类")
) -> Dict[str, Any]:
    """获取因子列表 — 从真实 FactorRegistry 读取。"""
    try:
        FactorRegistry.ensure_initialized()
        from core.alpha.alpha101.factor_descriptions import ALPHA101_DESCRIPTIONS

        factors = []
        for name in FactorRegistry.list_all():
            cls = FactorRegistry.get(name)
            if cls is None:
                continue
            inst = cls()
            cat = inst.category if hasattr(inst, 'category') else 'other'
            if category and cat != category:
                continue
            desc = ALPHA101_DESCRIPTIONS.get(name, {})
            factors.append({
                "id": name,
                "name": desc.get("chinese_name", name),
                "category": cat,
                "description": desc.get("formula", inst.description if hasattr(inst, 'description') else ""),
                "ic": 0.0,
                "ir": 0.0,
            })

        return {"success": True, "count": len(factors), "factors": factors}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取因子列表失败: {str(e)}")


# ════════════════════════════════════════════════════════════════
# Phase 2: 遗传挖掘 / 健康监控 / 行业中性化 / 研究报告 (接真实仓库数据)
# ════════════════════════════════════════════════════════════════

def _warehouse_ohlcv(symbol: str, limit: int = 500) -> Optional[pd.DataFrame]:
    """从 PostgreSQL 仓库取单标的 D1 OHLCV; 无数据返回 None。"""
    try:
        from data_center.storage.postgres_store import get_store
        store = get_store()
        df = store.query(
            "SELECT datetime, open, high, low, close, volume FROM kline "
            "WHERE symbol_id=(SELECT symbol_id FROM symbols WHERE code=?) AND timeframe='D1' ORDER BY datetime DESC LIMIT ?",
            [symbol.upper(), limit],
        )
        if df.empty:
            return None
        df = df.sort_values("datetime").set_index("datetime")
        for c in ("open", "high", "low", "close", "volume"):
            df[c] = pd.to_numeric(df[c], errors="coerce")
        return df.dropna(subset=["close"])
    except Exception:
        return None


def _get_ohlcv(symbol: str, days: int = 500) -> tuple[pd.DataFrame, str]:
    """优先真实仓库数据, 无则回退 mock。返回 (df, source)。"""
    real = _warehouse_ohlcv(symbol, days)
    if real is not None and len(real) >= 30:
        return real, "warehouse"
    return generate_mock_data(symbol, days), "mock"


class MineRequest(BaseModel):
    symbol: str = "600019.SH"
    n_factors: int = 10
    population_size: int = 40
    generations: int = 10
    days: int = 500


@router.post("/mine")
async def mine_factors(req: MineRequest) -> Dict[str, Any]:
    """遗传编程因子挖掘 (GeneticFactorMiner, 输出规范 MinedFactor)。"""
    try:
        from core.alpha.mining import GeneticFactorMiner, GeneticConfig
        df, source = _get_ohlcv(req.symbol, req.days)
        miner = GeneticFactorMiner(GeneticConfig(
            population_size=req.population_size, generations=req.generations, max_depth=3))
        factors = miner.mine(df, n_factors=req.n_factors, seed=42)
        out = [{
            "name": f.name, "expression": f.expression, "fitness": f.fitness,
            "ic": f.ic_mean, "icir": f.icir, "sharpe": f.sharpe, "turnover": f.turnover,
        } for f in factors]
        return {"success": True, "symbol": req.symbol, "data_source": source,
                "backend": miner.backend, "count": len(out), "factors": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"因子挖掘失败: {str(e)}")


@router.post("/health-check")
async def factor_health(req: ICAnalysisRequest) -> Dict[str, Any]:
    """因子健康检测 (三态: HEALTHY/WARNING/DECAYED)。"""
    try:
        from core.alpha.management import FactorDecayDetector
        df, source = _get_ohlcv(req.symbol)
        factor = calculate_mock_factor(req.factor_id, df)
        fwd = df["close"].pct_change().shift(-1)
        ic_series = factor.rolling(20, min_periods=10).corr(fwd)
        rep = FactorDecayDetector().check(req.factor_id, ic_series, factor, fwd)
        return {"success": True, "data_source": source,
                "factor_id": req.factor_id, "health": rep.health.value,
                "current_ic": rep.current_ic, "ic_trend": rep.ic_trend,
                "ic_mean_short": rep.ic_mean_short, "ic_mean_long": rep.ic_mean_long,
                "icir": rep.icir, "monotonicity": rep.monotonicity,
                "alert_level": rep.alert_level, "reasons": rep.reasons}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"健康检测失败: {str(e)}")


class ReportRequest(BaseModel):
    symbols: List[str] = ["600019.SH", "601899.SH", "600585.SH"]
    factor_ids: List[str] = ["alpha001", "alpha002", "alpha003", "alpha004"]
    top_n: int = 20


@router.post("/report")
async def factor_report(req: ReportRequest) -> Dict[str, Any]:
    """全因子研究报告: 排名 + 冗余 + 推荐组合 (用首个标的的多因子横截面近似时序)。"""
    try:
        from core.alpha.management import FactorReportGenerator
        symbol = req.symbols[0] if req.symbols else "600019.SH"
        df, source = _get_ohlcv(symbol)
        fwd = df["close"].pct_change().shift(-1)
        factors = {fid: calculate_mock_factor(fid, df) for fid in req.factor_ids}
        fdf = pd.DataFrame(factors).reindex(df.index)
        gen = FactorReportGenerator()
        rep = gen.generate(fdf, fwd, top_n=req.top_n)
        return {"success": True, "data_source": source, "report": gen.to_dict(rep)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"报告生成失败: {str(e)}")


class FullAnalysisRequest(BaseModel):
    symbol: str                       # 合约/股票/期权代码 如 RB2510 / 600019.SH
    top_n: int = 20
    n_quantiles: int = 5


def _safe(v) -> float:
    """NaN/Inf → 0.0, 否则 float (避免 JSON 序列化报 out-of-range)。"""
    try:
        f = float(v)
        return f if np.isfinite(f) else 0.0
    except (TypeError, ValueError):
        return 0.0


@router.post("/full-analysis")
async def full_analysis(req: FullAnalysisRequest) -> Dict[str, Any]:
    """一键完整分析: 取真实行情 → 全 101 Alpha 因子 → IC/健康/排名/推荐 → 头名因子分层。

    复用 factor_cli 的取数与因子计算 (不走 subprocess), 数据源仅真实仓库,
    无数据直接 404 (不回退 mock — 一键分析要么真要么报错)。
    """
    try:
        from core.alpha import factor_cli
        from core.alpha.management import FactorReportGenerator

        df = factor_cli._load_from_warehouse(req.symbol)
        if df is None or df.empty:
            raise HTTPException(404, f"{req.symbol} 无仓库数据 (先在数据中心采集)")
        if len(df) < 30:
            raise HTTPException(422, f"{req.symbol} 数据不足 ({len(df)} 条, 需 ≥30)")

        fwd = df["close"].pct_change().shift(-1)
        factors = factor_cli._alpha101_factors(df)
        if factors.empty:
            raise HTTPException(500, "无可用因子 (Alpha101 计算全部失败)")

        rep = FactorReportGenerator().generate(
            factors, fwd, top_n=req.top_n, n_quantiles=req.n_quantiles)

        # 头名因子分层 (Q1..Qn + 多空), 供前端柱状图
        layered: Dict[str, Any] = {"quantiles": [], "long_short_return": 0.0,
                                   "long_short_sharpe": 0.0, "factor": None}
        if rep.top_factors:
            top_name = rep.top_factors[0].name
            lb = FactorAnalyzer().layered_backtest(
                factors[top_name], fwd, req.n_quantiles)
            quantiles = [
                {"quantile": f"Q{i}",
                 "mean_return": _safe(lb.get(f"Q{i}", {}).get("mean_return")),
                 "sharpe": _safe(lb.get(f"Q{i}", {}).get("sharpe"))}
                for i in range(1, req.n_quantiles + 1) if f"Q{i}" in lb
            ]
            ls = lb.get("long_short", {})
            layered = {
                "factor": top_name,
                "quantiles": quantiles,
                "long_short_return": _safe(ls.get("mean_return")),
                "long_short_sharpe": _safe(ls.get("sharpe")),
            }

        top = rep.top_factors
        positive = sum(1 for f in top if f.ic_mean > 0)
        ic_mean = round(_safe(np.mean([f.ic_mean for f in top])), 4) if top else 0.0

        # 综合信号 (IC 加权) + 交易建议
        from core.alpha.factor_combiner import FactorCombiner
        from core.alpha.factor_advisor import FactorAdvisor
        ic_values = {f.name: f.ic_mean for f in top}
        combined_signal = FactorCombiner(factors).ic_weight(factors, ic_values)
        advice = FactorAdvisor().advise_from_report(req.symbol, rep, combined_signal)
        sig_tail = {str(k): _safe(v) for k, v in combined_signal.tail(10).items()}

        return {
            "success": True,
            "symbol": req.symbol,
            "data_source": "warehouse",
            "data_points": len(df),
            "ic_stats": {
                "mean": ic_mean,
                "positive_count": positive,
                "total": rep.total_factors,
            },
            "health_distribution": {
                "healthy": rep.healthy_count,
                "warning": rep.warning_count,
                "decayed": rep.decayed_count,
            },
            "top_factors": [
                {"rank": f.rank, "name": f.name, "ic": _safe(f.ic_mean),
                 "icir": _safe(f.icir), "sharpe": _safe(f.sharpe_q5q1),
                 "turnover": _safe(f.turnover),
                 "health": f.health, "recommended": f.is_recommended}
                for f in top
            ],
            "recommended": rep.recommended,
            "recommended_ic": _safe(rep.recommended_ic),
            "recommended_icir": _safe(rep.recommended_icir),
            "layered": layered,
            "advice": advice.to_dict(),
            "combined_signal": sig_tail,
        }
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"完整分析失败: {str(e)}")


@router.get("/factors/descriptions")
async def factor_descriptions() -> Dict[str, Any]:
    """返回所有因子的描述字典 (中文名/公式/值高低含义/适用场景)。

    包含:
    - Alpha101 因子: 完整中文描述 (从 factor_descriptions.py)
    - GTJA 因子: 使用英文公式作为描述
    - 其他因子: 动态获取基本信息
    """
    from core.alpha.alpha101.factor_descriptions import (
        ALPHA101_DESCRIPTIONS, CATEGORIES)
    from core.alpha.alpha101 import FactorRegistry

    # 合并: 静态中文描述 + 动态获取的因子
    all_descriptions = dict(ALPHA101_DESCRIPTIONS)

    # 确保因子库已初始化, 并动态添加所有因子
    FactorRegistry.ensure_initialized()
    for name in FactorRegistry.list_all():
        if name not in all_descriptions:
            cls = FactorRegistry.get(name)
            if cls:
                inst = cls()
                all_descriptions[name] = {
                    "chinese_name": getattr(inst, 'name', name),
                    "formula": getattr(inst, 'description', ''),
                    "interpretation": "",
                    "use_case": getattr(inst, 'category', ''),
                    "signal_logic": "",
                    "source": "dynamic",  # 标记为动态获取
                }

    return {"success": True, "count": len(all_descriptions),
            "descriptions": all_descriptions, "categories": CATEGORIES}


class NeutralizeRequest(BaseModel):
    values: Dict[str, float]          # {标的: 因子值}
    industries: Dict[str, str]        # {标的: 行业}
    method: str = "mean"              # mean / zscore / regression


@router.post("/neutralize")
async def neutralize_factor(req: NeutralizeRequest) -> Dict[str, Any]:
    """行业中性化 — 输入因子值 + 行业标签, 返回中性化后的值及暴露对比。"""
    try:
        from core.alpha.management import IndustryNeutralizer
        codes = list(req.values.keys())
        fv = pd.Series([req.values[c] for c in codes], index=codes)
        ind = pd.Series([req.industries.get(c, "未知") for c in codes], index=codes)
        n = IndustryNeutralizer()
        fn = {"mean": n.neutralize_by_mean, "zscore": n.neutralize_by_zscore,
              "regression": n.neutralize_by_regression}.get(req.method, n.neutralize_by_mean)
        neu = fn(fv, ind)
        return {"success": True, "method": req.method,
                "exposure_before": round(n.max_industry_exposure(fv, ind), 4),
                "exposure_after": round(n.max_industry_exposure(neu, ind), 4),
                "neutralized": {c: round(float(neu[c]), 6) for c in codes if pd.notna(neu[c])}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"行业中性化失败: {str(e)}")


# ─────────────────────────── 因子导入/导出 ───────────────────────────

_USER_FACTOR_DIR = Path(__file__).resolve().parent.parent.parent / "core" / "alpha" / "user"


def _sanitize_factor_name(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9_]", "_", name)
    name = re.sub(r"_+", "_", name)
    return name.strip("_").lower() or "custom_factor"


def _find_factor_source(name: str) -> str | None:
    """查找因子的 Python 源码文件路径, 返回源码字符串。"""
    cls = FactorRegistry.get(name)
    if cls is None:
        return None
    try:
        src_file = inspect.getfile(cls)
        return Path(src_file).read_text(encoding="utf-8")
    except (TypeError, OSError):
        return None


class FactorExportRequest(BaseModel):
    factor_names: list[str] = ["*"]


@router.post("/factors/export")
async def export_factors(req: FactorExportRequest):
    """导出因子为 .factor-pack.json — 便携式因子包, 可跨实例导入。"""
    FactorRegistry.ensure_initialized()
    all_names = FactorRegistry.list_all()

    if req.factor_names == ["*"]:
        names = all_names
    else:
        names = [n for n in req.factor_names if n in all_names]

    if not names:
        raise HTTPException(400, "没有可导出的因子")

    from core.alpha.alpha101.factor_descriptions import ALPHA101_DESCRIPTIONS

    factors = []
    for name in names:
        cls = FactorRegistry.get(name)
        source_code = _find_factor_source(name) or ""
        inst = cls() if cls else None
        desc = ALPHA101_DESCRIPTIONS.get(name, {})
        factors.append({
            "meta": {
                "name": name,
                "chinese_name": desc.get("chinese_name", name),
                "category": inst.category if inst and hasattr(inst, 'category') else "other",
                "description": inst.description if inst and hasattr(inst, 'description') else "",
            },
            "source_code": source_code,
        })

    return {
        "format": "tsc-factor-pack",
        "version": "1.0",
        "exported_at": datetime.now(BJ_TZ).isoformat(),
        "source": "trading-strategy-center",
        "factors": factors,
    }


@router.post("/factors/import")
async def import_factors(file: UploadFile = File(...)):
    """导入 .factor-pack.json — 将因子代码写入 core/alpha/user/ 并自动注册。"""
    if not file.filename or not file.filename.endswith(".factor-pack.json"):
        raise HTTPException(400, "请上传 .factor-pack.json 文件")

    raw = await file.read()
    try:
        package = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(400, "文件格式无效, 无法解析 JSON")

    if package.get("format") != "tsc-factor-pack":
        raise HTTPException(400, f"不支持的文件格式: {package.get('format', '未知')}")

    factor_list = package.get("factors", [])
    if not factor_list:
        raise HTTPException(400, "因子包为空")

    _USER_FACTOR_DIR.mkdir(parents=True, exist_ok=True)
    init_file = _USER_FACTOR_DIR / "__init__.py"
    if not init_file.exists():
        init_file.write_text("# Auto-generated user factors\nfrom pathlib import Path\nimport importlib\nimport pkgutil\n\n__all__: list[str] = []\nfor _m in pkgutil.iter_modules([str(Path(__file__).parent)]):\n    mod = importlib.import_module(f\"{__name__}.{_m.name}\")\n    if hasattr(mod, \"__all__\"):\n        __all__.extend(mod.__all__)\n", encoding="utf-8")

    imported = []
    skipped = []
    failed = []

    for f in factor_list:
        meta = f.get("meta", {})
        name = meta.get("name", "")
        if not name:
            failed.append({"name": "未知", "reason": "缺少因子名"})
            continue

        safe = _sanitize_factor_name(name)
        code = f.get("source_code", "")
        if not code:
            failed.append({"name": name, "reason": "缺少源码"})
            continue

        # 重写相对导入: from .base → from core.alpha.alpha101.base (兼容迁移)
        code = re.sub(
            r"from\s+\.(base|factor_registry|operators|factor_pipeline)\s+import",
            r"from core.alpha.alpha101.\1 import",
            code,
        )
        code = re.sub(
            r"from\s+\.factor_descriptions\s+import",
            r"from core.alpha.alpha101.factor_descriptions import",
            code,
        )

        file_path = _USER_FACTOR_DIR / f"{safe}.py"
        if file_path.exists():
            skipped.append({"name": safe, "reason": "因子文件已存在"})
            continue

        file_path.write_text(code, encoding="utf-8")

        # 导入新模块触发 @FactorRegistry.register
        try:
            import importlib
            importlib.import_module(f"core.alpha.user.{safe}")
        except Exception as e:
            failed.append({"name": safe, "reason": f"导入失败: {e}"})
            file_path.unlink(missing_ok=True)
            continue

        imported.append(safe)

    return {
        "success": True,
        "imported": imported,
        "skipped": skipped,
        "failed": failed,
        "total": len(factor_list),
    }
