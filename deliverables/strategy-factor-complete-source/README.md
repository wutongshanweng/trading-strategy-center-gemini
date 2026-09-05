# 策略与因子完整源码包

本包保留 Trading Strategy Center 当前策略与因子实现的原始目录结构，用于迁移到其他系统。

## 实际注册数量

- 策略：90 个，运行 `signals.registry.list_strategies()` 得到。
- 缠论策略：`chan_bsp`，实现位于 `signals/strategies/chan_strategies.py`。
- 因子：483 个，运行 `FactorRegistry.list_all()` 得到。
  - WorldQuant/基础 Alpha：191 个。
  - GTJA Alpha：191 个。
  - Enhanced Alpha：101 个。
- 特征元数据：98 个，位于 `core/features/feature_store.py`。
- ML 计算特征：26 个，位于 `ml/features/`。

页面曾显示“584 个因子”，但当前运行时因子注册器真实结果为 483。完整源码包不会虚构 584 个注册项，也不会把 98 个特征元数据和 26 个 ML 特征重复计入因子数。

## 包含内容

- `signals/strategies/`：全部策略算法源码。
- `signals/base.py`、`registry.py`、`indicators.py`、`catalog.py`、`engine.py`：策略运行基础设施。
- `cross_symbol/`：配对交易策略的协整和价差分析依赖。
- `analysis/chan_pro.py`、`vendor/chanpy/`：缠论适配器与 vendored Chan 引擎。
- `core/alpha/`：全部因子、注册器、算子、评估、组合、挖掘和管理源码。
- `core/features/`、`ml/features/`：特征元数据与 ML 特征计算。
- `research/factor_lab/`：IC、分层回测等研究工具。
- `api/routes/`：策略、因子、回测、赛马和白名单 API。
- `frontend/src/`：策略库与因子库页面、客户端和类型。
- `tests/`：相关策略、缠论和因子测试。

## Python 依赖

最低运行依赖见 `requirements-algorithms.txt`。完整 API 页面还需要主项目已有的 FastAPI、Pydantic、React、Ant Design 和 PostgreSQL 环境。

## 验证

在解压目录执行：

```bash
python verify_counts.py
```

期望输出：

```text
strategy_count=90
chan_strategy_present=True
factor_count=483
factor_families={'alpha': 191, 'gtja_alpha': 191, 'alpha_en': 101}
feature_metadata_count=98
```

## 数据库边界

生产环境只使用 PostgreSQL。完整因子分析通过项目数据仓库读取真实行情，无数据时应返回错误，不得把 mock 结果用于交易。

## 安全边界

本包不包含 `.env`、数据库、API Key、Token、缓存、运行时简报、模型文件或用户交易数据。研究信号不得自动连接实盘。
