# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-06-15

## User Preferences

- 2026-08-14: For the Agent/Vault migration, continue autonomously through implementation, evidence, commit, and push; do not wait for intermediate confirmation, but keep live trading disabled and never invent missing authoritative market metadata.

- User prefers to continue development and upgrades incrementally
- User values token efficiency and performance optimization
- User wants functional features over placeholders ("under development" warnings)
- User language: Chinese for documentation and UI, English for code

## Key Learnings

- 2026-08-19 **SHFE warehouse legacy numeric types**: historical `dailystock.dat` can encode `WRTWGHTS` and `WRTCHANGE` as numeric strings. Parse finite numeric strings explicitly; rejecting all strings discards valid official warehouse history.
- 2026-08-19 **Phase 27 continuous-chain rule**: strategy evaluation must consume `build_continuous_history` two-day OI confirmation with next-day switch effectiveness. Daily maximum-OI reselection changes returns and is not an acceptable substitute.
- 2026-08-19 **Spread strategy accounting**: term-structure and cross-product strategies must compute both legs' PnL and turnover costs. ZN-CU uses CU `TRADEFEERATIO / 1000` from the same official JS archive; single-leg accounting produced invalid candidate results.
- 2026-08-19 **Phase 29/30 observed result**: four candidates ran on 579 eligible dates; term-structure and warehouse shock qualified, relative value and volatility-state were rejected, six remained data-blocked. PBO/DSR correctly skipped because qualified count is two, while ZN one-lot margin 14,102 CNY passes the 20% capital gate.
- 2026-08-19 **Phase 29 stability gate correction**: requiring at least 60% positive walk-forward folds reduced the qualified set to warehouse shock only. A positive aggregate OOS return is insufficient when chronological folds are mostly non-positive.
- 2026-08-19 **Phase 26 daily panel contract**: eligible ZN rows must persist the five factor groups, a timezone-aware maximum information cutoff, ZN/CU/warehouse/member-position source hashes, and explicit same-day missingness. The 579-date panel has 41 member-position gaps and one initial-volatility gap; absence must not be forward-filled.
- 2026-08-19 **Read-only archive validation**: filter warehouse documents inside the canonical validator with `included_dates`; never write temporary indexes beside immutable or read-only official archives.

- 2026-08-19 **SHFE historical availability boundary**: historical KX raw files can be authentic official archives while their HTTP `Last-Modified` timestamps are years after the trading date. Such files prove historical values but not same-day knowledge. Phase 27 OOS must remain blocked unless a separate publication archive proves point-in-time availability; never coerce `trade_date` into `available_at`.
- 2026-08-19 **Phase 26 long-history result**: ZN/CU market and ZN specs each cover 1,210 dates; ZN positions cover 780 and warehouse receipts 1,207. Three warehouse dates are explicit gaps. Frozen strategy specifications do not count as qualified candidates.
- 2026-08-19 **Agent script test environment**: project script tests require Python 3.11+, dev extras, and `PYTHONPATH=src:.`; installing `-e .` alone omits pytest/Ruff, and the macOS host `python3` may be older than the package requirement.

- CZCE official daily archives use three-digit contract suffixes for MA as well as FG (for example `MA509`); validators must accept three or four digits and skip only fully zero OHLC inactive rows.
- CZCE publishes effective-dated `FutureDataClearParams.txt` beside each `FutureDataDaily.txt`; it carries settlement, margin, fee amount, fee mode, and close-today fee for MA/FG.
- CZCE turnover is in ten-thousand CNY and reflects actual trade prices, not settlement. Product multiplier cross-checks should infer average traded price and compare it with official daily low/high bounds across the contract panel, preserving exception counts.
- SHFE `kxYYYYMMDD.dat` and `jsYYYYMMDD.dat` are full-exchange snapshots, so one downloaded archive window can independently validate both ZN and RB from the original bytes. RB uses `TRADEFEERATIO / 1000` while ZN uses fixed `TRADEFEEUNIT` in the accepted window.

- Trusted walk-forward must retain training rows for strategy warmup and pass an explicit OOS boundary to the executor; passing only short test windows silently yields zero executed bars when the runner has a fixed warmup index.

- CSCV PBO must enumerate all `C(S, S/2)` half-splits; complementary halves are distinct in-sample selection cases and must not be deduplicated.

- The project PostgreSQL Docker service uses role `trading`; final `psql` audits must not assume a `postgres` role exists.

- 2026-08-15 **Phase 6 数据现状**: Legacy PostgreSQL 已有约百万级多周期 `kline` 行，但 `instrument_specifications`、`futures_main_switches`、`macro_data` 当前均为 0 行；研究数据包必须 fail-closed 标记缺少权威规格，并把主力切换/宏观日历缺失作为显式证据，不能以行情数量替代研究完整性。
- 2026-08-15 **Phase 6 JSON 边界**: PostgreSQL `TIMESTAMPTZ` 经 psycopg2 返回 `datetime`；供 CLI/MCP 使用的 Phase 6 repository 读取结果必须在仓储边界转换为 ISO 8601，不能把驱动原生对象传入通用 JSON envelope。
- 2026-08-15 **完整期货合约解析边界**: `BU2609` 等完整合约代码必须原样进入行情与规格查询；只有纯品种代码才调用 main-contract resolver，否则 resolver 可能产生带占位符的无效合约并误报行情不足。

- 2026-08-15 **目录数量不等于行为完整性**: Phase 4 definition parity requires deterministic execution gates over every registered factor and strategy; all-null/no-signal remains acceptable when authoritative optional fields are absent, but exceptions and output-shape mismatches fail acceptance.

- 2026-08-14: Native futures limit-lock handling must be side-aware: limit-up blocks buys and limit-down blocks sells; close intents must match the current position direction, and opening affordability must include commission.
- 2026-08-14: In this managed workspace, sibling Agent/Vault repositories and the Docker socket require scoped escalation even when the user authorizes project operations.
- 2026-08-14 **tsc-test-runner 工具边界**: 容器包含 Python 3.11、pytest、Ruff、PyYAML，但没有 Git；wheel/测试/YAML 在容器执行，`git diff --check` 与 staged secret scan 在宿主仓库执行。
- 2026-08-14 **Agent 测试环境隔离**: `system info` 的 deterministic 测试必须显式删除 `TAC_LEGACY_API_URL/TAC_VAULT_PATH`；真实联调环境变量不能隐式改变单测预期。
- 2026-08-14 **Agent CommandResult 等价验收**: CLI/MCP 每次调用都会生成独立 `request_id`；接口等价测试比较 `schema_version/command/status/data/evidence`，并分别验证 request ID 非空，不能要求两次调用 UUID 相同。
- 2026-08-14 **新仓库 Docker 验证权限**: `trading-agent-center` 的 Python 3.11 验证复用 `tsc-test-runner`；受管沙箱可能拒绝用户 Docker socket，遇到 permission denied 应对同一只读验证命令申请授权，不应改用宿主 Python 3.9。
- 2026-07-15: `/signals` and `/macro-news`?????? both consume `alertApi.list/refresh`; alert refresh currently scans `core.config.watchlist.WATCHLIST_PRODUCTS` (20 strategy watchlist products), while data-center realtime sync tracks 64 futures products separately.


- [2026-07-15] **Realtime scheduler lifecycle**: `data/sync_watchlist.json` can contain `auto_start=true`, but scheduler only resumes if `main.py` calls `_scheduler.autostart_if_enabled()` during lifespan. This must be independent of heavy background jobs (`ENABLE_BG_TASKS`) because data sync is core infrastructure for strategies/signals.
- [2026-07-15] **?????? gotcha**: `SyncScheduler` ????????????(IF/AP)???? `aggregate_symbol()` ?????(IF2608)?????????? with_minute ????????? product ??? M5 ? concrete symbols??????? M15/M30/H1/H4/W1/M1??? M5 ????????????????
- **Project:** trading-strategy-center - Enterprise Quantitative Trading Platform
- **Tech Stack:** 
  - Backend: Python 3.10+, FastAPI, PostgreSQL
  - Frontend: React 18 + TypeScript, Ant Design 5, Vite
  - Data: pandas, numpy, scipy for quant analysis
- **Architecture:** Full-stack with backend on :8000, frontend on :3000
- **Background tasks:** All periodic tasks run in Celery Worker (via Celery Beat), NOT in uvicorn workers. See tasks/scheduled_tasks.py for schedule.
- **Deployment requires:** PostgreSQL + Redis + Celery Worker + Celery Beat + uvicorn (web). deploy.sh supports bare-metal and Docker. On Windows: `choco install redis` or `winget install Redis.Redis`. `--workers 4` is safe now since background tasks are in Celery.
- **beat_schedule** (tasks/celery_app.py): refresh_news + scan_signals every 5min, vstock_scan every 30min, auto_iteration every hour at :00, daily_backtest at 7:00 AM, morning_briefing at 8:00 AM, verify_agent_accuracy at 9:00 AM. All times Asia/Shanghai.
- **时区 (CRITICAL)**: 所有数据采集、新闻抓取、交易信号均需按北京时间(UTC+8)运行。生产环境部署在海外服务器时必须设置 `TZ=Asia/Shanghai`。代码中已有模块级 `BJ_TZ = timezone(timedelta(hours=8))` 定义在 ~12 个文件: news/pipeline.py, signals/alert_aggregator.py, api/routes/macro_news_routes.py, api/routes/briefing_routes.py, api/routes/news_routes.py, api/routes/health_routes.py, news/multi_fetcher.py, news/morning_briefing.py, news/calendar.py, core/adaptive/agent_accuracy_tracker.py, data_center/knowledge/main_contract.py, data_center/collect/pipeline.py, data_center/api/warehouse.py, collect_now.py。Docker 中 app/celery_worker/celery_beat 均设置 `environment: { TZ: Asia/Shanghai }`。裸机部署时确保 `export TZ=Asia/Shanghai` 或 `timedatectl set-timezone Asia/Shanghai`。
- **Git:** Main branch is "main", remote is GitHub (wutongshanweng/trading-strategy-center)

- 2026-07-15T15:45:00+08:00 **策略/共振 K 线读取约定**：策略进化、共振、兼容 `/data/kline` 等消费者应优先用 `data_center.knowledge.main_contract_resolver.main_contract()` 动态解析主力，再落到最新活跃合约/legacy `main_contracts`；不要再直接按旧 `kline.symbol/interval` schema 查询。
- 2026-07-15T15:45:00+08:00 **Scoring API JSON 约定**：`MarketStateResult.to_dict()`、`StrategySignal.to_dict()` 等 FastAPI 响应边界必须把 numpy bool/int/float 标量转换为原生 Python 类型，否则 200 逻辑结果会在 JSON serialization 阶段变 500。
- [2026-07-16] **Stock 60m source-exception contract**: warehouse latest sync must probe the stock minute source before full-market 60m backfill; if Eastmoney/AKShare minute endpoints are unavailable, return `minute_status:"source_exception"`, `minute_reason`, and `minute_skipped`, then continue futures/options/D1 instead of blocking or creating half-finished state.
- [2026-07-16] **Stock latest force-mode gap contract**: force=true is not "recollect every stock D1". Select stock targets by D1 freshness/recent-row coverage and 60m freshness/recent-row coverage independently so current D1 symbols are skipped when only 60m is missing.
- [2026-07-16] **Stock batch threadpool contract**: never use unbounded `as_completed()` for network-heavy stock sync batches; use `wait(..., timeout=...)`, cancel/record pending symbols, set socket timeouts, and instantiate a collector per worker rather than sharing one `StocksCollector` across threads.
- [2026-07-16] **Research/model symbol contract**: research/model pages must not call `/warehouse/symbols` without `asset_type`; current default ordering can return option codes first. Add asset-class selector and prefer liquid stock/futures contracts with enough D1/M5 history.
- [2026-07-16] **Model/factor main-contract contract**: `/ml-options/analyze` and `/factor/full-analysis` require exact warehouse symbol codes today; product inputs like `RB` or stale examples like `RB2510` can 404. They should reuse the main-contract resolver used by tournament/signals and expose exact-code override.
- [2026-07-16] **Research-to-strategy closed-loop gap**: Vibe research factor/backtest pages are useful for exploration, but `_sim_backtest` is placeholder and does not enter canonical backtest/tournament/strategy-library/feedback. Upgrade should route research candidates through StrategyDefinition create/import, canonical backtest, tournament, then signals.
- [2026-07-16] **Asset compatibility labeling**: FeatureStore has `target_market`, but many builtins default to futures and research/model pages do not surface clear stock/futures/options availability; UI should show supported asset classes and disable/降权 unsupported feature/strategy paths.

## Production Deployment Runbook

当部署到新生产环境时，按以下顺序执行：

### 1. 依赖安装 (Ubuntu/Debian)

```bash
# PostgreSQL 16
sudo apt install -y postgresql-16 redis-server
sudo systemctl enable --now postgresql redis-server

# Python 3.10+ + Node 18+
sudo apt install -y python3 python3-pip nodejs npm

# 验证
pg_isready && redis-cli ping && python3 --version && node --version
```

### 1.5. 时区设置 (海外部署必做)

系统按北京时间采集数据和生成信号。海外服务器必须设置时区:

```bash
# 方法1: 系统级 (推荐, 对所有进程生效)
sudo timedatectl set-timezone Asia/Shanghai

# 方法2: 环境变量 (Docker/Bare-metal fallback)
export TZ=Asia/Shanghai

# 验证
date  # 应输出 CST 时间 (UTC+8)
python3 -c "from datetime import datetime; print(datetime.now())"  # 应输出北京时间
```

Docker 部署已在 docker-compose.yml 和 docker-compose.prod.yml 中为 app/celery_worker/celery_beat 设置了 `environment: { TZ: Asia/Shanghai }`。

### 2. 数据库初始化

```bash
sudo -u postgres psql -c "CREATE USER trading WITH PASSWORD 'trading_pass';"
sudo -u postgres psql -c "CREATE DATABASE trading_strategy_center OWNER trading;"
```

### 3. 部署代码

```bash
git clone https://github.com/wutongshanweng/trading-strategy-center.git /opt/trading-strategy-center
cd /opt/trading-strategy-center
cp .env.example .env   # 编辑 .env 填入 DB_HOST/DB_PASS/DB_PORT 等
./deploy.sh             # 裸机部署 (含 Redis + Celery + uvicorn)
# 或
./deploy.sh --docker    # Docker Compose 部署
```

### 4. 服务验证清单

| 检查项 | 命令 | 期望 |
|--------|------|------|
| PostgreSQL | `pg_isready` | accepting connections |
| Redis | `redis-cli ping` | PONG |
| Backend | `curl http://localhost:8000/health` | {"status":"ok"} |
| Frontend | `curl http://localhost:80` | 200 (含 index.html) |
| Celery Worker | `celery -A tasks.celery_app inspect registered` | 列出 7 个 tasks.scheduled_tasks.* |
| Celery Beat | `celery -A tasks.celery_app inspect stats` | OK + broker 信息 |

### 5. 常见问题排查

| 症状 | 可能原因 | 检查/修复 |
|------|----------|-----------|
| MacroNews 快讯不刷新 | Celery Worker 没启动或没监听 celery 队列 | `ps aux \| grep celery`；确保 `-Q celery,backtest,training` |
| 交易信号不产生 | kline 表无数据或 symbols 表缺条目 | `SELECT COUNT(*) FROM kline;`；检查 sync_scheduler 状态 `POST /api/v1/data-center/sync/start` |
| 简报为空 | Celery Beat 没运行或 8:00 调度未触发 | `celery -A tasks.celery_app beat --loglevel=info`；手动 `POST /api/v1/briefing/generate` |
| 多 worker 竞态 | 历史遗留问题，已修复 | uvicorn `--workers 4` 现在安全（后台任务在 Celery） |
| Redis 连接失败 | Redis 未启动或端口被占 | `sudo systemctl restart redis-server`；检查 `redis-cli ping` |
| Celery task 不执行 | Worker 没注册 task 或队列不匹配 | `celery -A tasks.celery_app inspect active`；清队列 `redis-cli FLUSHALL` |
- **Project Structure:**
  - Backend APIs in `api/routes/`
  - Frontend pages in `frontend/src/pages/`
  - Core quant logic in `core/alpha/`, `research/factor_lab/`
  - Factor analysis uses `FactorAnalyzer` from `research.factor_lab.factor_analyzer`
- **Development workflow:**
  - Backend changes trigger auto-reload (uvicorn with --reload)
  - Frontend uses Vite hot module replacement
  - Always test APIs with curl before committing
  - Commit messages follow conventional commits format

- 2026-07-15T15:53:00+08:00 **本机 UI QA 限制**：当前环境缺 Playwright Chromium，`npx playwright install chromium` 下载 183.6MiB 浏览器多次在约 10% 超时；没有浏览器缓存/系统 Chrome 时只能做 HTTP route smoke，真实登录后 UI 交互需等浏览器可用。
- [2026-07-16] **Research Candidate closed-loop contract**: research/model outputs enter `/api/v1/research/candidates` as draft candidates, then `promote-to-strategy` reuses `strategy_routes.create_strategy`, and `run-backtest` calls canonical `/backtest/batch` so tournament/feedback/degradation state is updated through the existing strategy loop.
- [2026-07-16] **Pydantic JsonValue gotcha**: do not hand-roll recursive `JsonValue` type aliases for FastAPI response models under Pydantic 2.5; use `pydantic.JsonValue` or schema generation can hit recursion depth during import.

## Do-Not-Repeat

- [2026-08-19] Do not evaluate a spread strategy with only the ZN leg or only ZN fees; include every traded leg and its official fee schedule.
- [2026-08-19] Do not replace the confirmed continuous contract chain with daily maximum open interest during research evaluation.
- [2026-08-19] Do not qualify a candidate from aggregate OOS return alone; require the declared chronological fold stability gate before Phase 30 selection statistics.

- [2026-08-19] Do not call historical SHFE `Last-Modified` an original publication time when it is later than the trading date; fail the point-in-time strategy gate instead.
- [2026-08-19] Do not run Agent script tests with only `pip install -e .`; use `pip install -e ".[dev]"` and `PYTHONPATH=src:.`.

- 2026-08-18: Do not assume `/private/tmp/tac-test-runtime` survives between sessions; verify the interpreter first and recreate the isolated dev environment when absent.
- 2026-08-18: Prefer the cached `python:3.11-slim` image for Agent quality gates on this device; it satisfies `requires-python >=3.11` and avoids unnecessary Docker Hub pulls.

- 2026-08-15: When adding a cross-cutting Agent feature, run Ruff over all touched source files before starting pytest; checking only the primary module misses import ordering in runtime/migration wiring.
- 2026-08-14: 旧仓库可能被其他任务并发 push；OpenWolf 记录提交 push 遇到 non-fast-forward 时必须 fetch + inspect + rebase，禁止 force push。
- 2026-08-14: Agent 与 Vault 是同级独立仓库；跨仓库补丁必须按各自 workdir 分开执行，不能在 Agent workdir 使用 Vault 相对路径。
- 2026-08-14: 新 `trading-agent-center` 是当前受管 writable root 的同级目录；新增子目录可能报 `Operation not permitted`，应对精确项目路径申请写权限，不要重复普通 `mkdir`。

- [2026-07-15] Do not assume writing code updates the running FastAPI process; this project runs `python main.py` without reload by default. Restart backend and verify `/api/v1/data-center/sync/status` after scheduler changes.
- [2026-07-15] ?? shell ? PowerShell ????? Bash heredoc `python - <<'PY'`??? `@'...'@ | python -`??????????
- [2026-06-15] Never commit node_modules to git - always add to .gitignore. Already fixed once, caused 19,284 tracked files bloat
- [2026-06-15] When adding new routes, must import and register in main.py (e.g., factor_router). Server needs restart to pick up new routes
- [2026-06-15] Windows paths in bash: use forward slashes or escape backslashes properly
- [2026-06-20] 装 Python 包必须用 `python -m pip install`（项目跑在 C:\Program Files\Python310），裸 `pip` 默认指向 Python314 会装错解释器，且会顺带升级 3.14 的 numpy/scipy。验证安装也要用项目的 python。
- [2026-06-20] **Spec 的"现状描述"可能严重过时,落地前必须核实真实文件**。Phase4 spec 声称 signals/strategies/ 全是 0 字节空文件需补齐,实际已有 54 个实现完整的策略——若照搬会覆盖大量已有代码。教训:对 spec 里"现状/缺口"类断言,先用 wc -c / grep / Explore 核实,再决定做什么。用户已确认"spec 只是参考,按实际情况发挥"。
- [2026-06-21] **Direction 是 `class Direction(str, Enum)` — `str(Direction.BUY)` 返回 "Direction.BUY" 不是 "BUY"**。比较要么直接 `s.direction == "BUY"`(继承 str 可行), 要么用 `s.direction.value`。signals/base.py。
- [2026-06-21] **akshare 新闻/实时接口在本环境会长时间挂起(2026 时钟+慢端点), 必须加超时**。news/fetchers/cls.py 用 ThreadPoolExecutor + future.result(timeout=12) 包每个数据源, 且 `ex.shutdown(wait=False)`(默认 wait=True 会等挂起调用, 抵消超时)。财联社 stock_info_global_cls 超时, 但东财 stock_info_global_em 能返回真实新闻。CLS 官网 nodeapi/updateTelegraphList 直连签名已失效(404)。
- [2026-06-21] **macro_data 真有数据**: DuckDB 里 CPI/PMI/M2/GDP/PPI/LPR1Y 各 221 月点(2008 起)。但 akshare 存的是原始指数/绝对值: CPI=101.2 表示同比+1.2%, GDP/M2 是绝对额(非百分比), PMI/LPR 才是直读值。展示时要注意语义(spec mock 里的干净百分比是理想化的)。查询走 `get_store().query` JOIN products ON product_id, 必须在 API 进程内(DuckDB 单进程独占锁)。
- [2026-06-21] **Windows 控制台 GBK 编码无法打印 emoji(🟢等)**, 测试脚本 print 含 emoji 会 UnicodeEncodeError。用 `PYTHONIOENCODING=utf-8 python -X utf8` 运行, 或测试里避免直接 print emoji。
- [2026-06-21] **pytest 全量约 2.5 分钟(1116 passed/5 skipped)**, 用 run_in_background + 长超时, 不要短轮询。
- [2026-06-21] **策略未自动加载的陷阱**: signals/registry.get_strategy 只在 `import signals.strategies` 触发 @register 后才有数据。独立调用方(tournament_runner/promotion_gate/retrain_orchestrator)和单测必须自己 `import signals.strategies`, 否则 get_strategy 返回 None(活服务器里因 StrategyEngine.load_all 已加载才偶然可用)。
- [2026-06-21] **BaseStrategy.params 是类级可变 dict, 多实例共享**。参数优化/回测实例化策略后必须 `inst.params = copy.deepcopy(type(inst).params)` 隔离, 否则不同参数组互相污染。
- [2026-06-21] **scoring.calculate_composite_score 把负夏普截断为 0 贡献** → 高胜率策略可盖过正夏普策略, 会"奖励实际亏钱的策略"。晋级决策不能只看 composite score, 必须叠加 walk-forward 样本外验证(promotion_gate)。
- [2026-06-21] **WalkForwardValidator.validate 不接受"跑回测的 callable", 而是 `objective(params, data_slice)->float` 评分函数**; 它内部用 optimizer_class(只传 param_space/objective/random_state) 自己建优化器跑 IS/OOS。回测要包装成"给参数+数据切片返回夏普"的评分函数。
- [2026-06-21] **OptimizationScheduler 无定时能力**(纯内存同步任务队列), 周期触发要外部循环驱动。HMMDetector.predict 返回 List[str] 需取 last 适配单标签; pct_change 产 inf 要 replace+dropna 再喂 HMM(见 buglog)。
- [2026-07-07] **akshare/yfinance 在此环境都不可靠**: akshare 连东方财富被 RemoteDisconnected(反爬封 IP), yfinance 全部返回 "possibly delisted"(Yahoo 被墙)。用 Sina(hq.sinajs.cn) + Tencent(qt.gtimg.cn) 直连 HTTP API 替代, 覆盖 CN+HK+US+UK 指数, 0.4s 完成 vs 原来 30+s 超时。DAX/N225/KOSPI/TWII/BSESN/DXY 无覆盖返回 null。
- [2026-07-05] **全量下载器写JSON checkpoint但year-status查DB checkpoint，导致month状态不一致**。run_full_options_year/run_full_futures_year写download_checkpoint.json，但/sync/year-status只读collect_checkpoints DB表。修复: ① full_downloader改用collect_month_with_ckpt(写DB); ② year-status增加JSON fallback兼容旧条目（option和futures都要加）。
- [2026-07-06] **morning_briefing 里要用绝对导入**。`news/morning_briefing.py` 的 `_latest_contract_price` 用了 `from ..data_center.storage.postgres_store import get_store`，但项目统一用 `from data_center.storage.postgres_store import get_store`（绝对导入）。相对导入在 news 包的运行时上下文中解析失败，被 except Exception 静默吞掉，导致期货行情数据全部为空。
- [2026-07-06] **kline 表期货代码查询要用 regex 而非 LIKE**。LIKE 'C%' 会同时匹配玉米(C2609)和棉花(CF2609)，`~ '^C[0-9]'` 确保只匹配代码后紧跟数字的合约。所有单字母品种代码（C/A/B/M/Y/P/J/I）都有这个问题。

- [2026-07-10] **uvicorn --workers > 1 时不能在 lifespan 里跑周期性后台任务**。每个 worker 是独立进程, 各自运行 lifespan → 多个 _background_loop 并发竞争写同一文件(data/news_cache.json, alert_signals.json, briefing_*.md), in-memory 单例(NewsPipeline, MorningBriefingCache, AlertAggregator) 不跨进程共享。症状: MacroNews 快讯不刷新、交易信号不产生、简报只在一个 worker 的缓存里。**正确做法**: 所有周期性后台任务用 Celery Beat 调度, web worker 只处理 HTTP 请求。已迁移: 新闻刷新(5min), 信号扫描(5min), 简报生成(8:00), 批量回测(7:00), Agent准确率(9:00), 自动迭代(每小时), VStock扫描(30min) → tasks/scheduled_tasks.py, beat_schedule 在 tasks/celery_app.py。
- [2026-07-10] **Celery Worker 必须监听 celery 默认队列**。beat_schedule 中未指定 routing_key 的任务进 celery 队列, 如果 worker 用 `-Q backtest,training` 启动而不含 celery, scheduled tasks 永远不会被执行。正确: `-Q celery,backtest,training`。
- [2026-07-10] **所有 datetime.now() 必须传 BJ_TZ**。海外服务器时区不是北京, 裸 `datetime.now()` 返回 UTC 或本地时间, 会导致: 主力合约月份计算错误、数据采集窗口错位、新闻缓存时间戳漂移、信号 ID 和 created_at 用错时区。正确做法: 文件头部定义 `BJ_TZ = timezone(timedelta(hours=8))`, 然后所有 `datetime.now()` → `datetime.now(BJ_TZ)`。已修复 12 个文件。collect_now.py 之前误用了 `BJ_TZ = timedelta(hours=8)`(缺少 timezone 包装), 会导致 TypeError。docker-compose 中也要设 `TZ: Asia/Shanghai`。

- [2026-07-09] **mootdx bars() 返回的 DataFrame 同时有 vol 和 volume 列**，rename(columns={"vol": "volume"}) 会产生重复列名，导致 `df["volume"]` 返回 DataFrame 而非 Series（.tolist() AttributeError）。正确做法：先 drop(columns=["vol"]) 再使用 volume 列。

- [2026-07-06] **AData 数据源集成**: py_mini_racer v0.6.0 移除了 `py_mini_racer` 导出 → 必须在 import adata 之前 monkey-patch `_pmr.py_mini_racer = _pmr.MiniRacer`。adata 未 pip 安装时通过 `Path(__file__).resolve().parent.parent.parent.parent / "adata-main"` 自动发现源码路径。晚间(22:40后)东方财富/新浪 API 限流导致 Connection aborted，本地 CSV 缓存仍可用(5532只股票代码表)。

- [2026-07-06] **外部项目集成 (ai_quant_trade + QuantDinger)**: 调研后确定集成策略: (1) 谐波形态(Gartley/Bat/Butterfly/Crab) — 我们完全没有, 新建 harmonic_strategies.py; (2) K线形态增强 — 从6种扩展到15种, 纯向量化无依赖; (3) 配对交易 — 将 cross_symbol/ 分析工具升级为注册策略 @register; (4) 波动率制度 — HV百分位检测作为新过滤器; (5) tournament 评分增强 — 借鉴 QuantDinger 7因子加权(收益22%+年化12%+夏普18%+盈亏比14%+胜率9%+回撤15%+稳定性10%)+交易次数惩罚+ABCDE等级; (6) 跳过量化的 RL/FinRL/vnpy/交易所连接器(我们已有对等或更强替代)。

- [2026-07-07] **catalog rebuild 必须先清除 sys.modules 中 user/ 子包缓存再 reload**。`build_from_registry()` 调用 `importlib.reload(_st)` → `_autoload()` → `pkgutil.iter_modules` 扫描目录 → `importlib.import_module`。但已缓存在 sys.modules 的 user 模块会直接返回缓存版本不触发 `@register`，导致新策略文件注册后 catalog 看不到。修复：在 reload 前 `del sys.modules[name]` 清除所有 `signals.strategies.user` 及子模块，然后 reload 触发全新 import → `@register` 执行。同时清空 `self._strategies` 字典以确保删除文件的策略也被移除。
- [2026-07-07] **优化池 (Phase 4) 落地**。后台 API: `api/routes/strategy_pool_routes.py` — GET pool (列出 retired/challenger/champion), POST optimize (调 RetrainOrchestrator 贝叶斯参数优化), POST {name}/retire, POST {name}/reactivate。复用已有 ChampionChallengerRegistry (生命周期) + RetrainOrchestrator (三层重训)。前端: StrategyLibrary 底部优化池面板, 退役策略可重优化/激活, 考察中策略可手动退役。
- [2026-07-07] **QuantsPlaybook 集成 (GitHub被封, 通过API分析)**: GitHub 从本机基本无法访问(HTTPS/SSH 均被阻断), 但 REST API (api.github.com) 可用。项目 613MB (83个PDF+238个py+63个ipynb)。集成: (1) HHT希尔伯特-黄变换择时策略 — EMD/VMD分解→Hilbert瞬时相位→方向判断, 依赖 PyEMD/vmdpy; (2) QRS低延迟择时 — std(high)/std(low)*corr 方向信号 (中金公司研报方法); (3) 因子合成增强 — 新增 max_ic_ir_weight (Ledoit-Wolf压缩协方差最大化IC_IR), pca_combine (PCA第一主成分), half_life_weight (半衰期衰减IC加权)。跳过: 筹码因子(需要筹码分布数据), 球队硬币因子(复杂横截面), C-VIX(期权数据), IPCA(过于专业)。
- [2026-07-16] **Do not use `$PID` as a local variable in PowerShell**: it is a read-only automatic variable. Use `$backendPid` or another name when restarting backend processes.
- [2026-07-16] **Do not use Bash heredoc syntax in PowerShell**: `python - <<'PY'` fails. Write a PowerShell here-string to a temporary `.py` file, run it, then remove it.
- [2026-07-16] **Do not assume `.wolf/cerebrum.md` is clean UTF-8**: existing mixed/mojibake bytes can raise `UnicodeDecodeError`; use `encoding='utf-8', errors='surrogateescape'` for surgical metadata updates.
- [2026-07-16] **Do not declare FastAPI static routes after conflicting dynamic routes**: `/china-finance/data/adapters` was shadowed by `/china-finance/data/{symbol}`. Put static routes first or make dynamic paths more specific.

## Decision Log

- 2026-08-19 **Eligible-subwindow policy**: retain all five-year official archives, but allow strategy research on the independently validated 579-date same-day-availability subset. Older late-metadata rows remain excluded rather than blocking all newer point-in-time evidence.

- 2026-08-19 **Phase 26-30 acceptance semantics**: engineering tasks may close with immutable blocked results when external evidence is unavailable. Research candidates, PBO/DSR, signal allowlists, promotion, and execution remain blocked; a frozen specification is not a successful strategy.

- 2026-08-18: Four product market-data strategies use distinct predeclared logic families and one fixed OOS qualification gate (positive net return, drawdown >= -10%, at least 10 position changes, at least 60 observations). FG/ZN pre-screen acceptance is not Phase 25 candidacy until product-specific observation gates pass; MA/RB failures remain immutable evidence.

- 2026-08-18 **Phase 21–25 顺序与完成定义**: Phase 21=MA、22=RB、23=FG、24=ZN、25=多品种组合终验。每阶段必须以真实官方数据、点时主力链、版本化成本、下一根开盘 OOS 和人工信号审批为完成证据；单元测试或文档只能证明代码能力，不能替代真实数据验收。
- 2026-08-18 **MA 现有数据边界**: Legacy PostgreSQL 的 MA/FG 行情虽然有时间覆盖，但 `verified=false` 且无 source URL/hash；只能视为采集观察，不能直接进入 Phase 21 因子、策略或信号研究。
- 2026-08-17 **Phase 20 独立选品**: 首个非上期所专项选择 M 豆粕，不因用户提到 MA/FG 就全部同意。依据是十万元资金适配、流动性、农业品分散和可研究因子空间；MA 次选，FG 后置。M 仅在官方 D1、主力切换、版本化规格和权威手续费全部验收后成为 signal_candidate，仍不自动开启信号。
- 2026-08-17 **DCE 来源不降级**: 现有 AkShare DCE 日行情使用 HTTP，官方 HTTPS 在宿主和容器均 TLS EOF，HTTP 实际请求被远端关闭。Phase 20 禁止把该 HTTP 路径或第三方新浪数据作为权威验收替代；当前必须显式 blocked。
- 2026-08-17 **十万元研究品种池**: 所有十个品种持续采集数据；仅 BU/RU 开启研究信号且单品种最多 1 手、组合最多同时 1 个信号仓位。RB/ZN 是下一批专属历史数据、因子和策略课题；HC 因与 RB 暴露重叠暂仅采集；AL/AG/SC/CU/AU 因一手保证金超过资金 20% 门槛仅采集。全局保持 research_only=true、execution_enabled=false。

- 2026-08-14 **Phase 4/5 evidence boundary**: Native execution, registry, candidate, scheduler-lock, DR, observability, and policy foundations may be delivered, but Phase 4 remains in progress until immutable old/new execution differentials and per-definition factor/strategy behavior parity pass. Phase 5 remains partial until external alert delivery and scenario-based agent evaluations pass. Catalog counts alone never authorize ownership takeover.
- 2026-08-14 **Phase 1 接受决定**: `trading-agent-center` 仅通过四个固定 legacy GET endpoint 和只读 Vault adapter 提供 CLI/MCP；真实验收为 health ok、579 factors、143 strategies、19/20 fresh、FU stale，mutation/domain ownership 仍留在 legacy。

- [2026-07-15] **Scheduler autostart decision**: realtime data sync now autostarts on every API boot when watchlist auto_start=true, while heavier news/reflection background tasks remain gated by `ENABLE_BG_TASKS=1`.
- [2026-07-15] **??????????**: UI force=true ???60???????????? D1 ??? 60m???? D1+M5????????????????????????????/??????????????

- [2026-06-21] **外部项目能力移植**: 用户提供 3 个 GitHub 项目 (chan.py-main/abu-master/ai_quant_trade)。决策: (1) **chan.py (MIT)** vendored 整个核心算法簇到 vendor/chanpy/, 写 DataFrame→CKLine_Unit 适配器 (vendor/chanpy/DataAPI/chan_df_api.py 经 data_src="custom:..." 加载) + analysis/chan_pro.py 包装, 产专业买卖点 (一/二/三买卖+盘整背驰), 接成 signals/strategies/chan_strategies.py 的 chan_bsp 策略 (第55个)。注意: chan.py 用 `from typing import Self` (3.11+), 3.10 需 try/except 回退 TypeVar; CKLine_Unit 严格校验 OHLC, 喂数据用 autofix=True; 买卖点取 `chan[0].bs_point_lst.getSortedBspList()` (get_bsp 已弃用)。(2) **abu (GPL v3)**: 用户选"只重写不拷代码"。UMP 裁判机制按思想全新实现于 core/ump/ (GMM 主裁标坏簇 + 相似度边裁投票, 交易级否决闸门, 叠加任意策略)。(3) **empyrical (Apache)**: 装上游而非从 abu 拷, numpy 2.0 需 shim (np.NINF 等已移除), 包装在 backtest/risk_metrics_ext.py。(4) **ai_quant_trade (Apache)**: 仅摘东财股吧舆情采集器到 news/fetchers/eastmoney_guba.py, 其余 DL/RL 比本系统弱。
- [2026-06-15] **Factor Research Module**: Implemented three complete modules (IC Analysis, Stratified Backtesting, Factor Combination) with backend APIs and SVG-based frontend visualizations. Used mock data for demonstration until real data pipeline is connected
- [2026-06-15] **Chart Strategy**: Used custom SVG charts instead of heavyweight chart libraries to keep bundle size small and maintain full control over rendering
- [2026-06-18] **Unified DuckDB Data Center**: Per 交易系统统一数据库设计.md, building a unified market-data warehouse in DuckDB (data_center/data_center.db). Design rules: store REAL contracts (RB2509), NOT synthetic continuous (RB0); two-layer products→symbols; single unified `kline` table keyed (datetime,symbol_id,timeframe). DuckDB chosen for columnar/vectorized cross-product correlation + multi-timeframe aggregation. Operational tables (signals/trades/positions/backtest) stay on existing SQLite/SQLAlchemy — DuckDB is market-data only.
- [2026-06-18] **DuckDB single-writer**: DuckDBStore serializes writes via threading.Lock; reads use conn.cursor(). upsert_df does DELETE-then-INSERT (no cross-version native UPSERT). The long bulk download and live API share the write lock.
- [2026-06-18] **Data sources chosen by user**: akshare (have) + port TDX/ChinaOptions from download_date/market_data_fetcher + add BaoStock (no key), Tushare Pro (token), TqSdk (account). TqSdk free=recent only → use Tushare/akshare for deep history, TqSdk for tick/realtime.
- [2026-06-18] **Network resilience required**: user's network maintenance causes API ECONNRESET interruptions — fetchers and download orchestrator must have retry/backoff and resumable checkpoints.
- [2026-06-18] **DuckDB is single-process exclusive-lock**: only ONE OS process can open data_center.db (even read-only is blocked while another holds the write lock). Implication: the bulk download script and the FastAPI server CANNOT both touch the DB simultaneously. Production pattern → run downloads as in-process background tasks inside the API server (one process owns the DB), OR take the warehouse API offline during the one-time bulk historical load. Discovered when a 2nd python proc hit `IO Error: File is already open in ... (PID)`.
- [2026-06-18 仓库接入] **期货下载改走 DuckDB 仓库采集器（不再是 Parquet）**。网页选 RB → /warehouse/contracts/discover 枚举真实子合约+主力判定（按持仓量）→ /warehouse/collect/product 后台任务采集入库。关键点：(1) main.py reload 改为 DEV_RELOAD 环境变量，默认单进程（双进程会和 DuckDB 独占锁冲突）。(2) 采集后台任务走 collect_jobs.py 单实例 + full_downloader.py（asyncio.to_thread 包同步采集），进度写 download_checkpoint.json。(3) 主力标注用独立表 main_contracts（不能 UPDATE symbols.is_main，DuckDB 禁止 UPDATE 被外键引用的行，见 buglog bug-014）。(4) 测试环境只下近1月：start_date 参数透传，collect_contract 用 _trim 按日期过滤（sina 日线接口不支持日期参数，只能下载后过滤）。预览走 /warehouse/preview（按合约代码）。SyncScheduler 之前的 bug：execute_task 不落盘 + result.status==\"completed\" 是枚举比字符串永远 False，已改为调 collector 写仓库。 `DataStore` already supports `market` dirs futures/stock/options. Threaded `market_type` through `DataSourceManager.get_kline`→`get_best_source`; akshare `get_kline` detects A-share codes (has '.' or 6-digit) → `get_stock_daily`; `ChinaOptionsFetcher.get_kline` routes by code prefix (IO/HO→index option, digits→ETF option). Frontend asset-class selector in download tab; stock/option use `/download/range?asset_type=`. Added `/preview`, `/data-files`, `/options/codes` endpoints (note: `/download/list` collides with `/download/{task_id}` dynamic route — used `/data-files` instead).
- [2026-06-19] **两套存储分工（重要）**：单股/单合约下载走 `/api/v1/data-center/download/range` → **Parquet 文件** (`data/market/{asset}/{code}/main/{interval}.parquet`)，前端"数据预览"卡片读这里。全市场/批量全量走 `/api/v1/warehouse/collect/full` → **DuckDB 仓库**，前端"仓库数据预览"读这里。两者并存，不要混用。
- [2026-06-19] **远程数据滞后系统时钟**：环境系统日期是 2026，但 akshare/DCE/东财远程数据只到现实当前日期。商品期权历史(option_hist_dce)、东财 Greeks 快照(option_risk_analysis_em)在 2026 日期下拉不到实盘数据。结论：涉及"当日/近期"实盘的功能无法端到端联调，必须用合成数据单测验证逻辑，实盘拉取在数据可用时自然生效。akshare 交易日历(tool_trade_date_hist_sina)本身覆盖到 2026-12-31。
- [2026-06-19] **商品期权 Greeks akshare 不直接提供** → 必须 Black76 自算。复用已有 options/pricing/black76.py + options/greeks/analytical_greeks.black76_greeks + options/volatility/iv_solver.implied_vol_newton(futures=True)。编排在 data_center/options_analytics.compute_option_greeks (纯函数) + OptionsCollector.collect_commodity_greeks。合约代码 m2608-C-2500 内嵌标的/类型/行权价，标的期货收盘取自仓库 kline。ETF/股指期权则用东财 option_risk_analysis_em 直接给 Greeks (collect_greeks_snapshot 已改为真正落库 options_daily)。
- [2026-06-19] **评分引擎已存在,勿重建**：用户知识库文档规划的 scoring_engine.py = 已有 resonance/engine.py + core/resonance/voter.py (confidence 加权投票,已按观山G/楚风C/听海T 分组)。文档规划的季节性/持仓情绪/跨市场/IV/技术指标/宏观采集模块在本仓库均已存在 (analysis/seasonality.py, analysis/oifactors.py, data_center/cross_market.py, options/volatility/, signals/indicators.py, macro_collector.py)。真缺口只有：合约知识库结构化字段(已扩 ContractDetail) + 股票知识库(已建 stock_knowledge.py 行业↔期货映射)。决策层 观山/楚风/听海/牧野 是站外 agent,利用本系统信号数据按自己思路跑。
- [2026-06-21] **新闻宏观仪表盘 (SPEC_MACRO_NEWS) 落地**。新增模块: news/(fetchers/cls.py 多源容错快讯采集, sentiment.py 改为中文词典法, calendar.py 规则化事件日历, pipeline.py 采集→标签→情绪→data/news_cache.json), macro/(aggregator.py 查 DuckDB macro_data 算最新值+趋势, regime_adapter.py 规则引擎联动/市态/展望), signals/alert_aggregator.py (查 DuckDB kline→StrategyEngine.compute_all→ResonanceEngineV2→AlertSignal, 存 data/alert_signals.json), simulation/simulated_trading.py (持仓/历史/关注 JSON 持久化), data_center/realtime_quote.py (akshare→warehouse 最新收盘兜底)。API: api/routes/{macro_news,alert,simulated_trading}_routes.py。前端: pages/{MacroNews,SignalDetail}.tsx + Trading.tsx 改 4 Tab, services/macroNewsApi.ts。main.py lifespan 加 daemon 后台线程(新闻30min/信号15min)。关键约束/经验见 Do-Not-Repeat 与 Decision Log 同日条目。
- [2026-06-21] **ML 自我迭代闭环四阶段落地 (锦标赛→反馈→重训→晋级)**。核心洞察: 所有积木(锦标赛评分/反馈闭环/回测引擎/walk-forward/调度器/模型监控/市态检测/策略目录)早已存在且各自可用, 缺的只是"编排层"。**两个锦标赛系统**: core/tournament/tournament_system.py(np.random 假数据)是**死代码未注册**; tournament/tournament_manager.py(TournamentManager, 真评分)才是 /standings 背后的活路由——之前误判过, 务必看活的那个。阶段1: tournament/tournament_runner.py 对目录策略取真实 kline 跑 VectorizedBacktest→喂 feedback_loop(回填目录)+TournamentManager.record_result(新增方法, 接受聚合绩效, JSON 持久化 data/tournament_state.json)。阶段2: core/adaptive/promotion_gate.py 用 WalkForwardValidator 样本外验证 + detect_overfitting 决定晋级(纠偏 composite score 把负夏普截断为0的问题), HMMDetector 按市态分组冠军。阶段3: core/adaptive/retrain_orchestrator.py 触发式三层重训(参数层 OptimizationScheduler 贝叶斯再优化真 kline / 因子层 FactorDecayDetector / 模型层 ModelMonitor→AutoMLPipeline), 缺输入则跳过该层。阶段4: core/adaptive/champion_challenger.py 生命周期 challenger→champion→retired, 毕业需 ≥3 次评估+通过率≥67%+平均OOS夏普≥0.3+人工批准(安全闸门, data/champion_challenger.json)。API 端点: /tournament/{run-backtest,promote,lifecycle,graduate,retire-champion}, /intelligence/retrain/cycle。前端 Tournament.tsx 加"跑真实回测/晋升验证"按钮 + 生命周期面板 + 毕业弹窗。新增 42 个单测(全量 1158 passed)。
- [2026-06-19] **用户协作偏好**：架构扩充而非重复堆叠 — 提需求时若已实现,告知即可不重做。边测边改 (本地 :3000/:8000 常驻)。文档式需求 (futures_knowledge.md) 是讨论稿,可整合/出更优方案。
- [2026-07-09] **A股 K 线数据源切换到 mootdx TCP 优先 + akshare Sina HTTP 降级**。移除 baostock/adata 依赖链, StacksCollector 重写: collect_kline 用 mootdx D1 (frequency=9, offset=5000) → akshare Sina stock_zh_a_hist(前复权) 降级; collect_minute_kline 用 mootdx M1/M5/M15/M30/M60 → akshare stock_zh_a_hist_min_em 降级。mootdx 返回不复权原始价格, 跨除权除息日回测需自行复权。新增 _store_kline_df 统一入库逻辑。sync_scheduler source 默认值 baostock → mootdx。注意: mootdx 同时返回 vol 和 volume 列, 入库前需 drop vol 避免重复列名导致 DataFrame.tolist() AttributeError。TCP 7709 在此环境不稳定(WinError 10054 远程强制关闭), 但 Sina HTTP 降级正常工作(D1 8387条入库验证通过)。

- [2026-07-09] **kline 表列名标准化迁移 (symbol→symbol_id, interval→timeframe)**。PostgreSQL kline 表 237 万行已完成迁移: (1) ALTER TABLE ADD symbol_id INT → UPDATE 从 symbols.code 回填 → NOT NULL + FK; (2) RENAME interval→timeframe; (3) DROP symbol, DROP contract; (4) ADD settlement, pre_settlement; (5) 新 UNIQUE(symbol_id, timeframe, datetime)。所有 SQL 查询模式: 直查用 `WHERE symbol_id=(SELECT symbol_id FROM symbols WHERE code=?) AND timeframe=?`; JOIN 用 `ON k.symbol_id = sy.symbol_id`。迁移脚本: `data_center/db/migrate_kline_columns.py`。涉及约 25 个文件修改 (采集器、API 路由、信号策略、自适应引擎等)。测试验证通过 (subquery/JOIN/SymbolRegistry/主力合约解析器)。

- [2026-07-09] **Horizon AI 新闻整合**。从 Horizon-main 移植了完整 AI 新闻增强管线到 news/ai/ 和 news/scrapers/:
  - `news/ai/client.py`: OpenAI 兼容多提供商链式回退 (DeepSeek/Ali/Doubao/MiniMax/Ollama), 从 `AI_NEWS_ENABLED` + `DEEPSEEK_API_KEY` / `AI_API_KEY` 环境变量创建, 未配置时 create_ai_client() 返回 None 优雅降级
  - `news/ai/analyzer.py`: 0-10 市场影响力评分, 用 CONTENT_ANALYSIS prompts, tenacity 指数退避重试
  - `news/ai/enricher.py`: 高分新闻双语背景丰富 (概念提取 → web搜索 → AI分析), web搜索默认关闭 (大陆DuckDuckGo不可用), `AI_NEWS_WEB_SEARCH_ENABLED=true` 开启
  - `news/ai/summarizer.py`: AI 简报增强 (市场摘要 + 重要度排序关注), generate_ai_summary + enhance_briefing
  - `news/ai/prompts.py`: 中文金融场景提示词 (评分/去重/双语分析/简报摘要)
  - `news/ai/utils.py`: AI 返回 JSON 5 层降级解析
  - `news/scrapers/gdelt.py`: GDELT 2.0 DOC API 无密钥全球新闻, max 250条
  - `news/scrapers/google_news.py`: Google News RSS 无密钥, 大陆被墙
  - `news/pipeline.py`: _enrich 新增 ai_score/ai_summary/ai_tags/ai_reason 占位字段 (均为 0.0/""/[]), _init_ai_if_needed 懒加载, _ai_score 用 asyncio.new_event_loop 桥接异步评分
  - `news/morning_briefing.py`: generate_morning_briefing 新增 ai 参数, _enhance_with_ai 注入市场摘要 + AI 排序关注
  - API: GET /api/v1/macro-news/news/ai-status (检查 AI 可用), GET /api/v1/macro-news/news/ai-scored?min_score=N (AI 评分过滤), POST /api/v1/briefing/generate?ai=true (AI 增强简报)
  - 前端: NewsItem 接口新增 ai_score/ai_summary/ai_tags/ai_reason, Timeline/Table 显示 AI 分数标签, Popover 展示 AI 摘要+理由, 新增 "AI重要度" 排序按钮
  - 关键设计: AI 字段全部 additive/optional, AI 不可用时空值传递不影响现有功能, 0 token 浪费

- [2026-07-15] **?60? D1/M5 ????**????? stock ??? D1?????? 60m?????????? futures ?? `with_minute=true`?stock/option ? false?`start_days=60`?`force=true`?
- [2026-07-15] **TL ???? gotcha**?AkShare `futures_zh_realtime` ? TDX `get_contract_list` ????? CFFEX TL???? `futures_zh_daily_sina/minute_sina` ? TL ???????TDX collector ?? CFFEX ?????? + D1 ?????
- [2026-07-15] **???? gotcha**?`PostgresStore.upsert_df()` ? `ON CONFLICT DO NOTHING`??????? M15/M30/H1/H4/W1/M1 ????? `upsert_df_on_conflict`??????????????
- [2026-07-15] **ZC 期货 M5 质量校验例外**：当前 products 中 ZC 仅有历史 ZC2212 D1（latest 2022-11-28）；TDX 实时发现 ZC2608/ZC2609/ZC2610，但 AkShare/Sina `futures_zh_daily_sina` 与 `futures_zh_minute_sina(period="5")` 对这些合约直接返回空数据并抛 Length mismatch。近60天全市场 M5 非空检查应将 ZC 作为产品状态/数据源专项，而不要误判为本轮18个映射修复失败。

- 2026-07-15T08:23:13+08:00 User expects Data Center realtime Start to mean: force backfill last 60 days for futures, stock, option; futures must be exactly 64 products and include D1/M5 plus aggregates; then keep realtime sync running.
- 2026-07-15T08:23:13+08:00 Warehouse /sync/latest responses must expose top-level status/job/detail because the React DataCenter page gates polling and realtime start from data.status. Keep legacy assets.status only as compatibility, not the primary UI contract.

- 2026-07-15T12:26:45+08:00 **Alert signal universe**: `/signals` and `/macro-news` trading signal reminders now use `signals.alert_aggregator.list_signal_products()`, which reads all futures products from `products.asset_type='futures'` (64 in current DB) and only falls back to `WATCHLIST_PRODUCTS` when the store is unavailable. API verification after refresh returned 64 signals; freshness total=64 with ZC stale due known data-source exception.

- 2026-07-15T13:05:00+08:00 **�쳣��Լ����Լ��**�������ź�ɨ������ freshness ��ͨ����Ʒ�֣���ǰ���� ZC����������Ϊ ZC??? �� latest=2022-11-28��ʱ������ kline/����/����/Agent �������̣����� direction=WATCH��signal_status/status=blocked��source=data-quality-gate��detail.data_quality_status=stale��skip_downstream=true������������/��������ֱ��������

- [2026-07-15] **策略闭环审计结论**：`/strategies/pool` 当前被 `/{name}` 动态路由抢先匹配导致 404；`/evolve/regime` 仍用旧 kline.symbol/interval schema 导致 500；`/resonance` 前端调用旧 `/data/kline` 导致 Not Found；自动迭代配置默认关闭，`/intelligence/iteration/overview` 仍提示手动触发。策略闭环升级应先修 API 契约和数据读取，再统一回测→赛马→反馈→信号权重事实源。

- 2026-07-15T17:45:00+08:00 **策略闭环路径约定**：现有 Tournament 页面启动路径仍是 `/api/v1/backtest/batch`；为保持 UI 合约，该端点必须同步写入 feedback history、tournament standings、degradation tracker，并在完整批次后替换旧 standings，避免 `s1` 等历史假数据残留。
- 2026-07-15T17:45:00+08:00 **晋升/赛马数据源约定**：`tournament_runner` 与 `promotion_gate` 读取K线时必须使用 PostgreSQL 当前 schema（`symbols.symbol_id` + `kline.timeframe`）并优先 `main_contract_resolver.main_contract()` 动态解析主力合约。
- 2026-07-15T17:45:00+08:00 **反馈排名质量约定**：零交易策略可以被记录进 catalog/degradation，但不能作为 feedback `top_strategy`/`worst_strategy`/star 候选；否则 0 Sharpe 会压过真实但亏损的交易策略。
- 2026-07-15T17:55:00+08:00 **Tournament UI 数据源约定**：`frontend/src/pages/Tournament.tsx` 排行榜应优先读取 `/api/v1/tournament/standings` 的后端 canonical score/rank；`/backtest/batch/latest` 只作为 standings 为空时的兼容回退。

- [2026-07-15] **Strategy closed-loop signal quality**: alert signals should expose `strategy_quality` in both top-level payload and detail; prefer positive-score tournament standings with trades/sharpe, otherwise fall back to catalog/all strategies so zero-score tournaments do not degrade signals.
- [2026-07-15] **Automation run-now contract**: `/api/v1/intelligence/automation/run-now` must start `run_safe_cycle` in a background daemon thread and return `{status,running,trigger}` immediately; expose `run_state` in automation config/overview because full safe cycle can exceed HTTP timeouts.
- [2026-07-15] **Automation promotion scope clearing**: use explicit `promotion_products:null` to clear product restrictions. Route must not use `exclude_none` blindly for fields where null means global scope.
- [2026-07-15] **Warehouse stats schema**: after kline migration, stats queries must use `kline.timeframe` and `kline.symbol_id`; legacy `interval`/`symbol` columns cause `/api/v1/warehouse/stats` 500.

- [2026-07-15] **Scoring resonance validation contract**: `/api/v1/scoring/resonance` must reject empty `ohlcv` at request validation with Pydantic `Field(..., min_length=1)`; otherwise downstream pandas feature code can raise `KeyError: 'close'` and return 500.
- [2026-07-15] **PowerShell encoding gotcha**: avoid rewriting mojibake-heavy Python files with raw `Set-Content`; use Python `Path.write_text(..., encoding='utf-8')` or a temp script so route files do not get syntax/encoding corruption.
- [2026-07-15] **Evolve automation UI contract**: because `/intelligence/automation/run-now` returns immediately in background mode, frontend must read `run_state` from `/automation/config`, show RUNNING/IDLE, and poll config/log while running instead of expecting `duration_sec` in the run-now response.
- [2026-07-15] **Macro-news light-mode freshness**: when only FastAPI is running and Celery beat/worker are absent, `/macro-news/dashboard` can serve old `data/news_cache.json`; `NewsPipeline.get_cached()` should mark stale caches and trigger a daemon background refresh so the page self-heals without requiring Celery.
- [2026-07-15] **PowerShell SQL one-liner gotcha**: avoid inline Python/SQL containing `>` in PowerShell commands; put the query in a temp `.py` file because PowerShell can parse `>` as output redirection before Python sees it.

- [2026-07-15] **Signals light-mode freshness**: `/api/v1/alerts` must expose `cache_status` and self-heal stale `data/alert_signals.json` with a guarded daemon refresh; TTL is 300s so FastAPI-only runtime does not depend on Celery/manual refresh for current signals.
- [2026-07-15] **Kline schema QA convention**: asset-class filters must join `kline -> symbols -> products` and use `products.asset_type`; `symbols` has no `asset_type` column. For psycopg2 queries containing `%`, pass it as a parameter (e.g. `LIKE %s`, `["ZC%"]`) instead of embedding `ZC%` in SQL.
- [2026-07-15] **PowerShell pipeline gotcha**: do not pipe directly after statement-form `foreach { ... }`; assign to `$results` first or use `ForEach-Object`, otherwise PowerShell can raise "An empty pipe element is not allowed."
- [2026-07-15] **Macro-news manual refresh contract**: `POST /api/v1/macro-news/news/refresh` should use `NewsPipeline.refresh_singleflight()` and atomic temp-file replace for `data/news_cache.json`; duplicate refreshes return `running:true` with cached count instead of starting another heavy fetch.
- [2026-07-15] **/data latest stock minute contract**: warehouse latest sync with `with_minute=true` must collect stock D1 plus stock `60m` over the same `start_days` window; UI force mode scans all stock symbols for both D1 and 60m, not D1-only.
- [2026-07-15] **/data latest option window contract**: option latest sync passes the 60-day `start` as `since` into `OptionsCollector.collect_month(..., since=start)` and onward to ETF/index option D1 collectors, so current listed option D1 rows are filtered/backfilled to the requested window.
- [2026-07-15] **ZC source-exception contract**: keep ZC in the 64-futures universe but mark `status:"source_exception"`, `skip_downstream:true`, and a human reason in `data/sync_watchlist.json`; realtime and warehouse latest sync skip it while other 63 products continue.

- [2026-07-16] **Research/model asset gating UI convention**: Research pages that load warehouse symbols should expose an explicit `asset_type` selector and call `/api/v1/warehouse/symbols?asset_type=<futures|stock|option>`; futures defaults should prefer current/main contracts (e.g. RB2610/SC2608) instead of trusting raw code ordering, which can start with expired contracts.
- [2026-07-16] **Volatility research data-source convention**: VolatilityAnalysis must use real warehouse K-line closes (`/api/v1/warehouse/kline?code=<symbol>&timeframe=D1&limit=120`) and reject insufficient samples; mock/random closes are not acceptable for strategy/signal research pages.
- [2026-07-16] **ML API helper contract**: frontend `listMLModels` maps to `/api/v1/models`; training maps to `/api/v1/models/{name}/train` with `{symbol,timeframe,params}` rather than legacy `/ml/train`.

- [2026-07-16] **Mojibake-heavy TSX patching convention**: for pages like `frontend/src/pages/Phase3.tsx`, patch by stable TypeScript/JS structural anchors (imports, function names, JSX component boundaries) instead of Chinese UI text markers; exact Chinese-marker matching can fail under existing encoding corruption.

- [2026-07-16] **Research Candidate downstream safety gate**: candidate promote/backtest must call the same downstream gate used by data sync health; if `data/sync_watchlist.json` marks a product `skip_downstream:true` (e.g. ZC source_exception), create/list may annotate it but promote/backtest must return HTTP 409 and UI must show it as 跳过.

- [2026-07-16] **Research Candidate challenger promotion contract**: `run-backtest` grades the top backtest row into `research_metrics.candidate_quality_*`; Sharpe >= 1.0 plus at least 3 trades and score >= 75 becomes `status:challenger`, weaker results stay `backtested` with `watch_candidate`/`needs_review` labels.

- [2026-07-16] **Research challenger signal quality contract**: only `status=challenger` + `promoted_strategy` + `skip_downstream!=true` may feed tournament/signals; the signal boost is capped, and Champion/live allocation graduation remains manual.
- [2026-07-16] **Generated strategy code safety contract**: strategy-builder/research-candidate text fields used in generated Python must be emitted with Python literal escaping (`repr`/equivalent) and a fixed module docstring; never interpolate user/model text directly into source code before import.
- [2026-07-16] **Research candidate backtest symbol contract**: frontend/research pages may create futures candidates with concrete contracts like `RB2610`, but `backtest_routes.batch_backtest` expects product codes; normalize futures candidates with `_product_code()` before backtest. Stock/option candidates stay in the pool and return 409 until asset-specific backtest adapters are wired.
- [2026-07-16] **News multi-source timeout contract**: `ThreadPoolExecutor` timeout + `shutdown(wait=False)` can leave non-daemon source threads alive and break pytest/loguru shutdown; news fetch timeouts should use daemon threads or a cancellable workflow.

- [2026-07-16] **Backtest asset-aware adapter contract**: /api/v1/backtest/run, /quick, and /batch accept sset_type=futures|stock|option; futures symbols still resolve main contracts, while stock/option symbols are queried directly with products.asset_type joins so research candidates can route cross-asset backtests without futures resolver contamination.

- [2026-07-16] **PowerShell temp-script import gotcha**: when a Python verification script is written under %TEMP%, add the workspace root to sys.path before importing project modules; workdir alone does not control Python's script directory import path.

- [2026-07-16] **Agent weight invariant**: `signals.agents.AGENT_WEIGHTS` must sum to ~1.0, while `fundamental` stays exactly 0.25 for the fundamental-agent contract; balance the total through other agents (currently technical=0.30).
- [2026-07-16] **RL compatibility contract**: PPO defaults may use torch when installed, but save must still emit `model.npz`/`config.json` and expose NumPy-style parameter views for legacy tests/tools; DQNTrainer accepts both `(env, state_dim, action_dim)` and legacy `(env, net, replay_buffer)`.
- [2026-07-16] **Watchlist shape contract**: realtime sync watchlist lives in `data/sync_watchlist.json` under `configs`; verification scripts should read `configs` first and remember products table uses `code`, kline uses `datetime`.

- [2026-07-16] **Simulated trading account contract**: /api/v1/simulated/account is the source of truth for paper-account display; default initial cash is 100000 CNY unless data/simulated_account.json overrides initial_cash; total equity = initial cash + realized history PnL + open-position unrealized PnL, while available cash = initial cash + realized PnL - frozen margin. AG2608 closed-trade pnl therefore increases cash/equity immediately.

- [2026-07-16] **MacroNews briefing freshness contract**: `/api/v1/briefing/` GET now treats missing/placeholder or `generated_at` older than 2h as stale and attempts auto-generation under an async single-flight lock; file-backed briefings must preserve file mtime via `MorningBriefingCache.set(..., generated_at=...)` so API restarts do not make old files look fresh. Celery Beat schedules `tasks.scheduled_tasks.morning_briefing` every 7200s for unattended refresh, while the UI polling interval remains 2h.
- [2026-07-16] **Briefing route prefix convention**: ����� API is registered singular as /api/v1/briefing and frontend riefingApi calls /briefing/; docs/menu-route-api.md still says plural /api/v1/briefings and should be treated as stale documentation until corrected.
- [2026-07-16] **快读简报内容质量约定**: 新闻摘要不能用 `...`/`…` 截断，宏观/AI/重点关注/期货相关新闻应输出短完整句并以 `。` 结束；全球指数抓取失败时不要展示硬编码旧值或伪装成 akshare 来源；期货行情行必须明确 `期货`、`现货`、`基差` 和规则短评，缺少可靠现货时标注“暂无可靠数据”而不是猜测。

- [2026-07-16] **LLM config security contract**: /api/v1/llm/providers is now the UI-managed runtime config source; API keys are write-only, stored server-side in data/llm_providers.json as protected ciphertext (Windows DPAPI when available, otherwise local secret fallback), and API responses may only expose has_api_key/api_key_preview. Custom providers are merged into LLMClient registry and use OpenAI Responses payloads against the configured /responses URL.
- [2026-07-16] **Verification cwd gotcha**: frontend TypeScript checks must run from frontend/ (
pm run tsc:check); running npm from repo root fails because the root has no package.json.

- [2026-07-16] **LLM route documentation contract**: docs/menu-route-api.md must list the full /api/v1/llm provider CRUD surface (GET/POST/PUT/DELETE/activate) and its login/admin requirement whenever /llm-config changes.

- [2026-07-16] **LLM config user preference**: 默认不要预置任何大模型供应商；`config/models.yaml` 保持空 provider，用户通过 `/llm-config` 自行新增并启用 OpenAI Responses-compatible provider。

- [2026-07-16] **LLM model discovery contract**: `/llm-config` uses `POST /api/v1/llm/providers/models` with admin auth plus temporary `api_url`/`api_key` to derive `/models` from Responses or Chat Completions URLs; the temporary key must never be persisted or echoed.

- 2026-07-16T22:33:49.458124+08:00 **MacroNews realtime field contract**: dashboard news items use `timestamp`/`label`/`products`/`content`, while aggregated NewsItem uses `published_at`/`sentiment_label`/`tags`/`summary`; never bypass normalization just because `sentiment_score` exists.
- 2026-07-16T22:33:49.458124+08:00 **Realtime flash brief contract**: `/macro-news` 实时快讯 must show visible HH:mm time and a 100-char-max complete Chinese brief ending with `。`; no `…`/`...`, and persisted `data/news_cache.json` items must be migrated with `summary` on read.
- 2026-07-16T22:33:49.458124+08:00 **Frontend TS target gotcha**: current frontend TypeScript target lacks `String.prototype.at`; use `charAt(length - 1)` in shared page helpers.
- 2026-07-16T22:43:17.527634+08:00 **Realtime flash brief length**: fallback briefs should target 50-100 Chinese chars, preserve complete sentences ending with `。`, and avoid UI ellipsis because users treat the realtime hover as a readable mini-brief rather than a truncated alert.
- 2026-07-17T08:06:39.875157+08:00 **Local restart contract**: `python main.py` currently listens on 127.0.0.1:8000, while the user-facing app URL `http://localhost:3000` is the frontend dev server; restart both backend.pid and frontend.pid for a full system restart.

- 2026-07-17T08:34:01.025310+08:00 **LLMConfig AutoComplete model-list gotcha**: ????????????????????????????????AntD AutoComplete ????? filterOption????????????? 1 ????????????? `filterOption={false}` ? Select ???

- 2026-07-17T08:34:43.899473+08:00 **LLMConfig AutoComplete model-list gotcha**: after model discovery, the form may auto-fill the first model, but the dropdown must still show every returned model. AntD AutoComplete local `filterOption` filters by the current input value, so model-discovery dropdowns should use `filterOption={false}` or a Select-style component.

- 2026-07-17T09:20:01+0800 **LLM use-case binding contract**: /llm-config now supports multiple text providers, model_type/use_cases metadata, per-use-case default provider bindings, provider smoke tests, and /api/v1/llm/tasks/run fallback execution; LLM remains analysis-only and cannot bypass backtest/tournament/risk gates.
- 2026-07-17T09:20:01+0800 **Do-Not-Repeat: large TSX shell edits**: avoid single huge here-doc rewrites for large TSX files in this Windows/Git Bash workspace; split into smaller chunks and keep workdir at repo root to prevent truncation/path errors.
- 2026-07-17T09:20:01+0800 **OpenWolf memory append gotcha**: .wolf/memory.md may contain legacy non-UTF-8 bytes; append in binary mode or use tolerant decoding instead of strict UTF-8 read-modify-write.

- 2026-07-17T09:35:11+08:00 **Do-Not-Repeat: PowerShell TSX encoding edits**: avoid `Get-Content ... -Raw | Set-Content` for UTF-8 TSX files with Chinese text in this Windows workspace; it can corrupt string literals through the console codepage. Use Python `Path.read_text/write_text(encoding="utf-8")` or targeted AST/text edits instead.

- 2026-07-17T10:22:26.432254+08:00 **LLMInsightCard page QA contract**: after adding shared AI analysis cards, verify every host page with authenticated Playwright and scan rendered text for literal `??` clusters; TypeScript can pass while mojibake/question-mark string literals still break UX.
- 2026-07-17T10:22:26.432254+08:00 **Signals alerts limit contract**: `api/routes/alert_routes.py` caps `GET /api/v1/alerts` `limit` at 100, so frontend signal pages must not request 120 or FastAPI will return 422.

- 2026-07-17T10:58:58+08:00 **快读简报期货质量规则**: 缺少可靠现货时不要输出“基差：暂缺”加泛化短评；应显示“基差：待现货确认”，明确暂不做升贴水判断，并按品种驱动因子（如贵金属看美元/实际利率、能化看原油/库存、黑色看需求/库存）给出观察建议；英文代码新闻匹配需用边界，避免 PP 误命中 APP。

- 2026-07-17T11:11:26+08:00 **快读简报新闻摘要完整句规则**: `【...记者/来源/编辑...】` 属于来源元信息要剥离，不可当正文输出；摘要应优先取原文完整句，禁止按字符数截成 `发布20。`、`其。` 这类伪完整句；没有可靠完整句时回退标题或留空。

- 2026-07-17T12:00:58+08:00 **MacroNews 仪表盘信号展示规则**: `/macro-news` 仪表盘右侧“交易信号提醒”只展示高质量活跃信号：`star_rating >= 3` 且 `confidence >= 0.30`；低星/低置信度信号可存在于后端但不应在该提醒卡片展示。

- 2026-07-17T12:20:00+08:00 **Dashboard real-data contract**: `/` 首页仪表盘不得使用随机权益曲线、硬编码资金或“模拟”假兜底；资金卡优先读取 `/api/v1/simulated/account`，权益曲线只能由 `/api/v1/simulated/history` 的真实成交盈亏和当前 `total_equity` 确定性生成，无真实轨迹时显示空态。
- 2026-07-17T12:20:00+08:00 **Homepage signal quality contract**: `/` 首页“交易信号”同 `/macro-news` 仪表盘，只展示 `star_rating >= 3` 且 `confidence >= 0.30` 的高质量信号；请求 `/alerts` 的 limit 不得超过后端上限 100。
- 2026-07-17T12:20:00+08:00 **Playwright local QA gotcha**: 如果 Playwright 包存在但浏览器缓存缺失，可用本机 Chrome `C:/Program Files/Google/Chrome/Application/chrome.exe` 作为 `executablePath` 做登录态烟测，避免阻塞验证。

- [2026-07-17T13:48:17+08:00] **Trading 持仓现价兜底约定**：`data_center.realtime_quote._from_warehouse` 必须走统一 `data_center.storage.get_store()` (PostgreSQL)，不能再导入空 DuckDB；持仓现价优先用最新 M5，再 M1/M15/M30/H1/60m/D1，并返回 `warehouse:<周期>`，否则前端会因 `quote_source=none` 把价格判为缺失。

- [2026-07-17T13:49:26+08:00] **Do-Not-Repeat**：读取 `.wolf/buglog.json` 时根对象是 `{"version":..., "bugs":[...]}`，不要用 `data[-1]`；应先取 `data.get("bugs", [])`。

- 2026-07-17T14:16:46+08:00 **System health overview contract**: `/api/v1/health/overview` is the homepage system-health source; it aggregates real kline freshness, high-quality alert counts, simulated trading quote/account state, and active LLM config. Dashboard should display this contract via `SystemOverviewCard` rather than inventing mock status.
- 2026-07-17T14:16:46+08:00 **Do-Not-Repeat: large Git Bash here-docs**: in this Windows workspace, long/nested here-doc commands can truncate before the delimiter and leave malformed files; prefer small Python `Path.write_text` edits or split appends into short verified chunks.

- 2026-07-17T14:45:25+08:00 **Signal trust contract**: alert signals now expose top-level `data_quality_status`, `data_quality_score`, `data_freshness` (D1/M5), `data_quality_factors/penalties`, and `confidence_explain/factors/penalties`; frontend Signals should display these gates and must not let LLM explanations override deterministic data/backtest/risk gates.
- 2026-07-17T14:45:25+08:00 **Do-Not-Repeat: TSX Chinese edits on Windows**: even Python scripts piped through PowerShell here-strings can corrupt newly inserted Chinese TSX literals into `??`; use ASCII `\uXXXX` string literals or write from a UTF-8 file/resource when adding CJK UI text.

- 2026-07-17T15:52:37+08:00 **Signal freshness encoding contract**: `check_data_freshness` user-facing D1 messages must be generated from structured fields with ASCII-safe Unicode escapes; alert route enrichment must also repair nested cached `data_freshness.D1.message`, not only top-level confidence/reason fields.
- 2026-07-17T15:52:37+08:00 **TSX Unicode escape gotcha**: JSX attributes like `title="\u505a..."` render literal backslash-u text; use expression attributes such as `title={"\u505a..."}` or text nodes wrapped in braces.
- 2026-07-17T15:52:37+08:00 **HTTP Unicode QA rule**: PowerShell/curl display can look mojibake even when JSON bytes are valid UTF-8; verify by decoding HTTP bytes in Python and checking `ascii(value)`, U+003F counts, and known mojibake markers before blaming the API.

- 2026-07-17T17:55:00+08:00 **Custom Responses provider stability contract**: some OpenAI-compatible custom providers return empty completed responses when the system prompt is too domain-heavy or the context payload is oversized; keep the system prompt short, move safety constraints into the user task, compact context to key fields, and retry once with a smaller context before falling back.
- 2026-07-17T17:55:00+08:00 **LLM analysis cleanup contract**: custom Responses payloads may echo structured `assistant: [...]` wrappers or visible `thinking process` text; the route layer should extract the final assistant text, strip think blocks, and remove visible reasoning prefixes before returning content to the UI.
- 2026-07-17T18:28:13+08:00 **Git push hygiene**: before committing multi-day workspace changes, run staged suspicious-file checks for pid/screenshots/.codex/.omo/temp_download/llm_providers/token-ledger/session files and keep runtime OpenWolf files unstaged.
- 2026-07-17T18:52:42+08:00 **Kline chart page contract**: /kline uses existing /api/v1/warehouse/kline + /api/v1/warehouse/symbols and overlays /alerts signals client-side; keep it read-only/visual first, with deterministic indicators and LLM only as explanatory layer.
- 2026-07-17T18:54:25+08:00 **Do-Not-Repeat: PowerShell Add-Content backticks**: do not put Markdown backtick paths inside double-quoted PowerShell Add-Content strings; backtick escapes can become control chars. Use Node/Python UTF-8 writes for OpenWolf records.

- 2026-07-17T19:05:00+08:00 **Kline formula contract**: `/kline` now supports a custom main-formula editor with saved templates and a TDX-style subset parser (MA/EMA/SMA/REF/HHV/LLV/IF/VALUEWHEN/CROSS/BARSLAST/DRAWTEXT/DRAWICON); unsupported drawing directives should be surfaced as warnings rather than blocking the chart.

- 2026-07-17T19:12:00+08:00 **Do-Not-Repeat: Chinese absolute paths in PowerShell here-strings**: when running Python maintenance scripts from this Windows workspace, prefer relative paths from the workspace; absolute paths containing `????` can mojibake to `????` in PowerShell/Python command transport.

- 2026-07-17T20:22:59+08:00 **Kline formula parser contract**: formula variable identifiers used inside expressions must stay ASCII (`BUY_SIG`, `SELL_SIG`) because the current tokenizer only recognizes `[A-Za-z_]`; Chinese should be used as DRAWTEXT labels, not expression identifiers.
- 2026-07-17T20:22:59+08:00 **Kline chart layer contract**: `STICKLINE/STICKLINE1` and `DRAWCOLORKLINE` are mapped to per-bar candle color overrides; `DRAWLINE/DRAWSL` render lightweight-charts line-series segments; formula BUY/SELL labels can create research candidates but still require backtest/tournament promotion before trading use.

- 2026-07-17T21:05:00+0800 **Warehouse D1 JSON contract**: /api/v1/warehouse/kline can fail on D1 because latest rows may carry NaN open_interest/amount; sanitize every payload with _clean_json (including pandas NA) before returning JSON, and restart the live uvicorn process after backend edits so the proxy sees the fix.

- [2026-07-19] **Deployment image size gotcha**: production compose builds app/celery_worker/celery_beat from the same Dockerfile; current Dockerfile installs dev+ml+signal extras (torch/tensorflow/etc.) and `COPY . .` includes large local artifacts unless ignored (data/history ~858MB, frontend/node_modules ~289MB, logs ~143MB locally). Large 12GB+ service image sizes indicate Docker image/context bloat, not codebase size.

- [2026-07-19] **Production Docker slim default**: Dockerfile now installs only base pyproject deps unless `INSTALL_EXTRAS` build arg is set (e.g. `signal` or `ml,signal`); `.dockerignore` excludes runtime data/history, logs, frontend node_modules/dist, .wolf/.agents; prod compose overrides container hosts to `postgres`/`redis` and DB port `5432`.

- [2026-07-19] **Deploy script compose choice**: `scripts/deploy.sh` now uses `docker-compose.prod.yml`; when changing production compose, remember the script previously used plain `docker-compose.yml`, which could silently ignore prod-only changes.

- [2026-07-19] **用户部署偏好**：本地部署和生产 Docker Compose 两种方式都保留；用户之前改本地化部署是为了避免磁盘重复占用，不是要删除生产 compose。解释部署体积时重点区分 Docker 共享层显示、build context、历史数据和 ML/dev 依赖。

- 2026-08-09: addyosmani/agent-skills exposes 24 installable Codex skills under repository path skills/*; bulk installation works with install-skill-from-github.py using repeated --path arguments.

- 2026-08-09: Project architecture is FastAPI + React/Vite with DuckDB/SQLAlchemy/Postgres/Redis/Celery dependencies, 73 test files (65 unit, 5 integration, 1 regression), and a CI workflow that runs Python matrix tests plus frontend build; README and several docs display mojibake in PowerShell output and should be checked for encoding.

- 2026-08-09: Realtime sync autostart must remain independent of ENABLE_BG_TASKS and occur once per FastAPI lifespan. Service shutdown must cancel its runtime task without clearing the persisted auto_start preference; only explicit /sync/stop disables restart.
- 2026-08-09: Current repository-wide Ruff baseline has substantial historical debt and Ruff 0.16.2 can panic while formatting it. CI uses targeted correctness rules (E9,F63,F7) until a dedicated cleanup establishes a passing baseline.

- 2026-08-09 **PG-only architecture (user-confirmed):** Runtime and tests must use PostgreSQL only. DuckDB is historical residue to remove, not a supported fallback or compatibility backend. Do not propose DuckDB schema fixes.

## Key Learnings
- 2026-08-09: Agent credentials use HMAC-SHA256 in PostgreSQL and JWT carries only key_id; production requires AGENT_JWT_SECRET and AGENT_API_KEY_PEPPER.
- 2026-08-09: Migration branches converge through merge_storage_heads and CI uses alembic upgrade head.
- 2026-08-09: Vibe backtest delegates to canonical backtest/run; unavailable research returns 501 rather than random simulation.
- 2026-08-09: ML deployment adds strategy to realtime signal whitelist and persists metadata; it does not submit real orders.
- 2026-08-09: axios 1.19, vite 7.3.6, react-router-dom 7.18.2 pass tsc, route, build, and npm audit.

## Do-Not-Repeat
- 2026-08-09: If Windows apply_patch returns Access is denied, switch to auditable Node/AST edits and run syntax tests immediately.

- 2026-08-09：前端 lint 将历史 any/unused/hooks 规则显式设为 off，真正 JSX key 保持 error；真实 Agent 平台须先完成系统边界设计，不能把现有 TradingCommittee 简单包装成 Agent 引擎。

## Decision Log
- 2026-08-09：用户将本轮定义为 Trading Strategy Center 3.0。3.0 的核心不是单一分析或聊天 Agent，而是面向中国期货、股票、期权市场的研究与策略进化智能中枢；Research Agent 必须联动数据同步、模型/特征库、策略共振、进化、赛马、回测、策略库、研究工作台、因子、波动率、游资、金融框架、宏观新闻情绪和指数数据。
- 2026-08-09：策略与因子需要持续创建、回测、赛马、降级、升级和参数优化；Agent 负责受控编排、证据链和持续闭环，不能只依赖单一指标，也不能绕过人工安全闸门直接实盘。

## User Preferences
- 2026-08-09：用户希望 3.0 呈现“更 AI、更综合、更智能”的产品形态，重点是跨模块联动形成多维交易信号，而不是继续堆叠彼此独立的页面和功能。
- 2026-08-09: Phase 0.1 warning cleanup must proceed by typed API/domain slices; Dashboard and macro/diagnostics pages can be made lint-clean without broad `unknown` state replacement, while DataCenter remains a dedicated final refactor.

- [2026-08-09] **Agent 3.0 Kernel boundary**: use independent /api/v3/agent routes and PostgreSQL gent_* tables; do not reuse the legacy /api/v1/agent simulated endpoints as production tools. AGENT_V3_ENABLED defaults to false, and sensitive actions remain approval-gated.
- [2026-08-09] **Agent Kernel timestamps**: ORM columns and Alembic migrations must both use timezone-aware timestamps; mixing aware Python datetimes with inferred TIMESTAMP WITHOUT TIME ZONE fails under asyncpg.


- 2026-08-09: Production Agent tools use a typed registry; every successful result must carry evidence, side-effect tools require approved AgentApproval, and placeholder tools are rejected at registration.

- [2026-08-09] **Agent candidate persistence boundary**: `api.routes.research_candidate_routes` still uses a JSON file store. Agent 3.0 strategy tools must not call its catalog helpers until candidates have a PostgreSQL repository.

- 2026-08-10: News pipeline sentiment uses [-1,1], while Agent evidence exposes [0,10]; normalize only at PostgreSQL persistence boundary and retain raw score in metadata.
- 2026-08-10: Agent news research must read `news_snapshots`; JSON/in-memory news caches are UI/cache concerns and cannot be production Agent evidence.
- 2026-08-10: 3.0 Research Agent now emits a deterministic `fused_signal` (direction, score, confidence, dimensions, blockers) after collecting module evidence; conflicts and real tool failures block actionable conclusions.
- 2026-08-10: Candidate generation is deterministic and bounded to three strategy families; proposals require backtest and walk-forward and are persisted as candidate artifacts without Champion auto-promotion.
- 2026-08-10: Candidate validation is an explicit registered tool requiring both backtest and walk-forward; only complete candidates persist tournament metrics, and the tool carries no allocation or Champion side effect.
- 2026-08-10: Tournament rounds keep at least 50% of validated candidates, rank by validated backtest score, mark lower tail eliminated, and classify survivors as Challenger; Champion always remains approval-gated.
- 2026-08-10: Tournament standings are read-only in the workbench; Challenger/eliminated state is visible, while Champion promotion remains a separate human approval action.
- 2026-08-10: Champion approval requests are task-scoped, require an active non-eliminated Challenger, create only a pending promote_champion approval, and never perform direct promotion or allocation.
- 2026-08-10: Human Champion reviewers must see linked research report, candidate backtest artifact, evidence records, and explicit release constraints before deciding approval.
- 2026-08-10: Approval context now includes prior promote_champion decisions, release_gate_evaluation artifacts, and strategy artifact versions so reviewers can assess history and regression before deciding.

- 2026-08-10: Legacy baseline alignment must create missing ORM core tables before stamping reconcile_legacy_core_tables; Alembic stamp alone skips migration upgrade logic. Template clone rehearsal validated agent head and release readiness.

- 2026-08-10 Do-Not-Repeat: Never pass a compound Alembic command as one subprocess argument; pass command tokens separately. Production baseline apply requires an explicit expected database name and a successful clone rehearsal first.

- 2026-08-10: PostgreSQL server is 18.3 while installed pg_dump is 16.14; never claim production backup or apply readiness until a matching pg_dump 18 client is available.

- 2026-08-10: Fresh-database Alembic upgrade and legacy-database baseline alignment are separate paths; never run raw upgrade head against a populated legacy clone.

- 2026-08-10 Decision: Agent 3.0 recommendations may promote only to Champion Candidate; Champion/live/capital actions remain human-approved and the unified decision pipeline always reports live_execution_allowed=false.

- 2026-08-10: Agent v3 supports two explicit principals: external Agent JWT/API-key credentials and verified web administrator tokens; never interpret one token format as the other, and keep permissions explicit.

- 2026-08-11: Agent 工作台中文文案必须以 UTF-8 保存并通过登录后 DOM 快照检查；终端代码页可能将中文补丁转成问号，优先使用 UTF-8 文件 API。

- 2026-08-11: Agent 计划在没有 LLM Provider 时必须走受控确定性工具计划；研究结果写入 PostgreSQL JSON 前必须通过 jsonable_encoder 处理 Decimal 等数值类型。

- 2026-08-11: Agent 规划统一通过 /llm-config 的 research 用途默认模型；Ant Design Modal 若 destroyOnClose，编辑表单回填应 forceRender 并在 modalOpen 后执行 resetFields/setFieldsValue。
- 2026-08-11 **LLM API Key 编辑偏好**: LLM 配置编辑必须回填已保存的完整 API Key 并允许直接修改；供应商列表仍只展示脱敏预览，完整 Key 只允许通过管理员鉴权编辑接口读取。
- 2026-08-11 **LLM 密钥读取边界**: 公共 `/api/v1/llm/providers` 不返回 `api_key`；管理员 `/api/v1/llm/providers/{id}/edit` 才解密回填完整 Key，避免为编辑体验扩大普通读取面的密钥暴露。
- 2026-08-11 **Do-Not-Repeat: 验证命令工作目录**: 不要在 `frontend` 目录运行项目根路径的 Python 测试或编译命令；后端与前端质量门禁按各自工作目录分开执行。
- 2026-08-11 **LLM API Key 编辑偏好**: LLM 配置编辑必须回填已保存的完整 API Key 并允许直接修改；供应商列表仍只展示脱敏预览，完整 Key 只允许通过管理员鉴权编辑接口读取。
- 2026-08-11 **LLM 密钥读取边界**: 公共 `/api/v1/llm/providers` 不返回 `api_key`；管理员 `/api/v1/llm/providers/{id}/edit` 才解密回填完整 Key，避免为编辑体验扩大普通读取面的密钥暴露。
- 2026-08-11 **Do-Not-Repeat: 验证命令工作目录**: 不要在 `frontend` 目录运行项目根路径的 Python 测试或编译命令；后端与前端质量门禁按各自工作目录分开执行。
- 2026-08-11 **交易信号审计基线**: 当前 alert_signals.json 运行样本为 64 条，其中 13 条 tradable、47 条 watch、4 条 blocked；可交易信号的宏观评分普遍为 0、基本面评分接近 0，且存在 D 级信号被标记为 tradable，说明下一阶段应先做信号分级/状态一致性、数据覆盖和历史校准，再追求增加信号数量。
- 2026-08-11 **交易质量四阶段实现**: 信号质量门禁、缺失维度动态归一、Beta 置信度校准、MFE/MAE 结果评估、PG signal_observations、数据源熔断健康、横截面组合筛选均已建立；grade D 不得 tradable，C 级默认人工确认。
- 2026-08-11 **海外数据部署边界**: 数据源健康状态统一存于 SourceResilienceRegistry；重试只对瞬时网络错误执行，熔断后 get_source 自动跳过不可用源，API 通过 /api/v1/data/sources/health 暴露成功率/延迟/最近错误。
- 2026-08-11 **交易质量四阶段实现**: 信号质量门禁、缺失维度动态归一、Beta 置信度校准、MFE/MAE 结果评估、PG signal_observations、数据源熔断健康、横截面组合筛选均已建立；grade D 不得 tradable，C 级默认人工确认。
- 2026-08-11 **海外数据部署边界**: 数据源健康状态统一存于 SourceResilienceRegistry；重试只对瞬时网络错误执行，熔断后 get_source 自动跳过不可用源，API 通过 /api/v1/data/sources/health 暴露成功率/延迟/最近错误。
- 2026-08-11: սǿŽʵиˣrelay / Token  401ȷ Token  200ȫ 1490 passed/5 skippedǰ lint/tsc/build ͨǰʹĿʵ·ɶ /health
- 2026-08-11 **ŻزִԼ**: ִ vectorized_engine أź T ʱֻںг¼ɽڻ PnL/֤ʹúԼ˫λǵͣڻŽ
- 2026-08-11 **ר֤**: trusted executionChinaMarketRulessignal economicscross-sectional alphapaper brokeroption volatilityrisk budgetevidence graph  21 ²ͨǨ head Ϊ add_trusted_trading_persistence

- 2026-08-11 **专家级交易闭环补强**：instrument_specifications 采用 commission_type/commission_fixed 区分固定每手与比例费；TrustedExecutionEngine 每根 bar 盯市并暴露 equity、maintenance_call；模拟盘通过 /fills/reconcile 和 /positions 完成成交持仓闭环；发布门禁 head 更新为 add_instrument_commission_model。

- 2026-08-11 **Agent 工作台本地运行开关**：代码默认 AGENT_V3_ENABLED=false 是发布安全边界；本地需要使用工作台时必须在 .env 显式设置 AGENT_V3_ENABLED=true，并在修改后重启后端，否则 Agent API 会按设计返回 404。

- 2026-08-11 **Agent 交易控制台边界**：Agent 工作台统一承载成本后信号质量、可信回测压力情景、PostgreSQL 点时横截面、限定风险期权评估与模拟盘；模拟成交只有在全部门禁通过时才能解锁，且永不连接实盘适配器。

- 2026-08-11 **Agent 工作台一键研究契约**: 新建任务后自动串联计划、多维研究、综合评估与交易验证；单个研究或验证数据源失败必须保留其他成功结果并显示门禁警告，模拟盘下单始终需要人工确认。LLM 计划非法或超过15秒时使用确定性安全计划。
- 2026-08-11 **Do-Not-Repeat: 非有限浮点 API 响应**: 空样本统计不得返回 Infinity/NaN；JSON API 的置信区间等数值必须使用有限值并通过显式阻断原因表达证据不足。

- 2026-08-11 **专家模式最终验收基线**: 后端全量1528 passed/5 skipped，前端 tsc/lint/build 通过，release readiness=true；PostgreSQL 仓库约139万K线/8272标的，642条观察中2条已成熟评估，其余由15分钟任务随10根D1后续行情继续闭环。

- 2026-08-12: User explicitly prefers retaining the current GitHub token for private-repository development and pushes on this device; do not alter the remote credential unless requested.

- 2026-08-12 **升级规划主线**：当前系统阶段性升级优先级应为事实基线与文档对齐、研究可复现/数据血缘、可信回测与统计验证、信号校准/组合治理、运行灾备、安全和 LLM 治理；在这些基础完成前不优先增加新策略、Agent、Provider 或大型基础设施。

- 2026-08-12 **本机 Python 命令**：当前 macOS 环境无 `python` 别名，仓库本地验证命令使用 `python3`；CI 是否继续使用 `python` 由 setup-python 环境决定。

- 2026-08-12 **本机完整部署前提**：Docker/Colima/Podman、PostgreSQL、Redis 都不存在且 `.env` 缺失；完整 Compose 部署必须先安装并启动 Docker Desktop，再从 `.env.example` 创建本地 `.env`。

- 2026-08-13 **Agent 认证核心依赖**：`api/routes/agent_routes.py` 运行时直接导入 PyJWT，因此 `PyJWT>=2.8` 必须属于 pyproject 核心依赖，不能仅依赖开发环境的间接安装。

- 2026-08-13 **ARM64 依赖解析**：Docker 首次成功构建使用 Pydantic 2.13.4；新增依赖后未锁定范围触发 pip 回溯并找不到可用 pydantic-core，因此锁定已验证的 Pydantic 版本以保证容器可复现。

- 2026-08-13 **ML 路由可选依赖边界**：基础 Docker 镜像不安装 `ml` extras 时，GARCH/ HMM 路由必须条件注册并仅在调用时返回 503，不能因 `arch`/`hmmlearn` 缺失阻断整个 API 启动。

- 2026-08-13 **健康检查规范路径**：FastAPI 健康端点为 `/api/v1/health`；Docker healthcheck 使用规范路径，Nginx 对外 `/health` 仅作为兼容代理。

- 2026-08-13 **ORM/Alembic 启动顺序兼容**：应用可能先通过 ORM `create_all` 建出最新表结构，Alembic 增量迁移必须在 create/add/drop 前检查现有表列，避免新库首次启动重复 DDL。

- 2026-08-13 **P0 仓库完整性**: `.gitignore` 第7行 `data/` 无锚定，吞掉了 `core/data/` 整个包（从未提交、本机磁盘也无）；`api/routes/data_routes.py:6` 导入它 ⇒ 全新克隆 `import main` 直接失败。生产在运行不在 Git 里的代码。修复见 EXPERT_UPGRADE_REVIEW TASK-0.1。
- 2026-08-13 **P0 CI 假绿**: workflow pytest 步骤 `| tail -50` 且无 pipefail ⇒ 测试退出码被吞，CI 绿不代表测试通过（main.yml:67,71）。
- 2026-08-13 **P0 回测双世界**: trusted_engine 语义正确但只服务 /backtest/trusted；决策闭环（tournament/promotion/evolve/run/quick/batch）用 vectorized_engine——同bar成交、平仓不返还本金、权益按12%保证金计值，数字不可用。升级方向是切换调用方而非修 vectorized。
- 2026-08-13 **P0 WFV 切分全同**: walk_forward_validator expanding 模式所有切分与 i 无关；overfit_ratio 恒 1/n 或 NaN；test_adaptive.py:333-341 固化了此 bug——修复时该测试断言也要改。
- 2026-08-13 **P0 因子未来函数**: alpha101 operators.rank 是全样本百分位（应为滚动/横截面）；factor_evaluator IC 是单值全样本相关。约500因子受染。
- 2026-08-13 **P0 合成回测污染**: tasks/backtest_tasks.py 每日 07:00 用 np.random 合成 OHLCV 跑回测写入 backtest_results（params=None 特征可识别）。
- 2026-08-13 **审查结论主文档**: docs/EXPERT_UPGRADE_REVIEW.md 是升级实施的唯一主计划（12节+prompt pack）；Phase 顺序改为 0止血→1回测可信→2血缘→3校准→4运维→5安全。
- 2026-08-13 **可信回测事实源**: tournament、promotion gate、experiment evolution 和 backtest API 的决策指标必须来自 `backtest.trusted_backtest`；`VectorizedBacktest` 只能作为显式对照或遗留工具，不能驱动晋升或排名。
- 2026-08-13 **Celery asyncpg 生命周期**: Agent Celery 入口通过 `asyncio.run` 创建独立事件循环，不能复用全局 asyncpg pool；每个入口完成后必须在同一循环内 dispose 并重置 SQLAlchemy async engine。
- 2026-08-13 **PostgreSQL 数值边界**: `NUMERIC` 查询结果是 `Decimal`，进入 pandas、信号或特征计算前必须显式转换为 float。
- 2026-08-13 **阶段验收证据**: 最终后端总套件 1546 passed/6 skipped；前端 tsc、route check、build、API/Nginx health 和 Agent release readiness 均通过。run manifest、点时血缘和 shadow loops 治理仍未完成。
- 2026-08-13 **最小运行清单契约**: trusted backtest 与 promotion verdict 必须包含 git revision、canonical config hash、显式 seed、数据范围/行数和最终 SHA-256 fingerprint；数据库通过 nullable `backtest_results.run_manifest` expand-only 字段保存，完整 ResearchRun/replay 留到 Phase 2。
- 2026-08-13 **迁移头同步**: 新增 Alembic 迁移后必须同步 `core.agents.release_readiness.EXPECTED_MIGRATION_HEAD` 及其测试，否则真实 release gate 会误报失败。
- 2026-08-13 **新闻点时契约**: `news_snapshots` 必须按 `(content_hash, fetched_at)` 追加保存，不能更新历史行；缺少发布时间时使用抓取时间并明确 `time_source=fetch`，as-of 查询按 `fetched_at <= as_of`。
- 2026-08-13 **宏观点时契约**: `macro_data.date` 是统计期，不代表系统已知时间；查询必须使用 `available_time <= as_of`。当前采集时刻仅作为 `available_time_estimated=true` 的保守估算，后续需按指标官方日历回填。
- 2026-08-13 **PostgresStore 数值出口**: psycopg2 的 NUMERIC 查询结果会以 `Decimal` 进入 DataFrame；共享 `PostgresStore.query()` 必须只转换含 Decimal 的列为 float，日期、整数、布尔、文本和 JSON 保持原类型，避免各消费者各自修补。
- 2026-08-13 **规格数据前置条件**: 当前本地数据库 `main_contracts` 与 active `instrument_specifications` 均为空；补齐合约规格前必须先完成主力合约和权威手续费/保证金数据导入，不得猜测费用参数。
- 2026-08-13 **规格同步止血**: 定时规格同步不得在空表时自动把内置知识库当作权威来源，也不得推导维护保证金；未完成权威数据导入时应返回 0 并保持回测门禁失败。
- 2026-08-13 **ResearchRun 重放契约**: trusted 定时回测持久化 immutable manifest 与指标到 `research_runs`；重放行必须记录 parent_id，return/sharpe 使用 1e-6 相对容差、交易数精确比较。
- 2026-08-13 **生产写鉴权边界**: production 环境的普通 API mutation 统一要求管理员 Bearer token；`/api/v1/agent/*` 与 `/api/v3/agent/*` 保留自己的 Agent JWT/API-key 认证，不由全局 middleware 抢占。
- 2026-08-13 **Legacy loops 治理**: Hermes/cron `loops/` 默认冻结，需显式 `LEGACY_LOOPS_ENABLED=1` 才能手工运行；运行态日志、STATE、state JSON 与 trading_journal 不进入 Git。
- 2026-08-13 **主力合约历史**: 每次 current main 变化必须在同一事务写 `futures_main_switches` 与 `main_contracts`；历史空档只能从权威档案回填，不能推测。
- 2026-08-13 **宏观官方日历导入契约**: 官方发布日历导入默认 dry-run，只更新已存在的 `(product code, observation period)` 宏观行；`available_time` 不得晚于来源抓取时间，写入必须原子保存 HTTPS URL、retrieved_at 与文档 SHA-256，不得把未命中行误报为已存在数据。
- 2026-08-13 **Do-Not-Repeat: 审批超时不代表补丁成功**: 合并编辑与 Docker 命令的升级请求超时后必须先检查目标文件存在性；本轮确认宏观导入器未落盘后才重新应用本地补丁。
- 2026-08-13 **Docker 迁移验收**: `docker compose up --build` 不会自动迁移已有 PostgreSQL volume；每次新增 Alembic revision 后必须在 app 容器使用其已配置连接执行 `alembic upgrade head`，再以 release readiness 核验，不能猜测数据库角色或输出凭据。
- 2026-08-13 **GitHub 推送策略**: 私有仓库远端 main 前进导致 non-fast-forward 时禁止 force push；先 fetch 审查远端提交，再把本地已验收提交 rebase 到最新 origin/main，复验后普通推送。
- 2026-08-13 **GitHub Actions 表达式边界**: `jobs.<job_id>.name` 不可引用顶层 `env` context；矩阵 job 使用 `matrix.*`，固定版本 job 名使用字面量，`env.*` 只留在支持该 context 的 step/action inputs。
- 2026-08-13 **Python flat-layout 打包契约**: 本仓库有多个顶层传统 Python package，setuptools 必须在 `pyproject.toml` 显式 find（`namespaces=false`、排除 tests）并声明顶层 `main` module；CI 用 `python -m build --sdist --wheel` 构建，再由 `twine check` 验证，不能使用不存在的 build `--check` 参数。
- 2026-08-13 **Python 3.12 风险指标依赖**: 原 `empyrical 0.5.5` 构建脚本依赖已移除的 `SafeConfigParser`；使用提供同名 `empyrical` API 的 `empyrical-reloaded 0.5.12`，并显式声明其遗漏的 `pytz` 运行依赖。安全 CI 审计前升级 `setuptools>=83`，避免审计 runner 自带旧版本。
- 2026-08-13 **基本面单测网络边界**: `DemandAnalyzer._fetch_macro` 会访问 AkShare，单元测试必须 mock 该边界并验证 seed fallback；真实网络采集只能放在显式外部集成验收，不能让默认 unit CI 依赖网络时延。
- 2026-08-13 **GitHub PostgreSQL 测试连接**: Actions service container 从 runner 进程通过映射端口和 `localhost` 访问，不使用 Compose DNS 名 `postgres`；integration tests 优先消费 workflow 的 `SQLALCHEMY_URL`，专用覆盖变量仅用于显式测试环境。
- 2026-08-13 **共享 runner 性能门禁**: Alpha101 101 因子/1000 行 wall-clock 是 smoke gate 而非受控 benchmark；本地连续基线约 2.9s，GitHub 共享 runner 可到 10.3s，门禁设 15s 以捕获严重退化，不用 10s 临界值制造基础设施假失败。
- 2026-08-13 **可选 ML 集成测试**: 基础 CI 安装 `.[dev]`，不包含大型 `ml` extra；所有直接或间接实例化 HMMDetector 的 6 项测试共用 `requires_hmmlearn` marker，其他 market-state/integration 覆盖必须照常运行。完整 ML 验收应另设安装 `.[ml,dev]` 的 job。
- 2026-08-13 **Docker CI 与发布边界**: main push 必须无凭据完成 Docker build 验证；DockerHub login/publish 仅在 `DOCKER_USERNAME` 与 `DOCKER_PASSWORD` 两个 secrets 同时存在时执行，缺少发布凭据不能让代码质量 CI 失败。
- 2026-08-13 **VPN 下 GitHub 克隆验收**: 普通 depth-1 pack 可能因 VPN 出现 curl 18/early EOF；重试使用 HTTP/1.1、`--filter=blob:none --single-branch --depth 1` 降低传输量，仍需核对 clone HEAD、关键文件与 `.env` 缺失。
- 2026-08-13 **可见升级收尾基线**: 因子排名/归一化与 IC 改为点时语义，信号 MFE/MAE 截止真实退出且跳空止损按开盘价；Agent 三次租约恢复后死信、审批 7 天过期、运行数/日预算由 Beat 对账，Celery worker-lost fail-safe，API request ID 与 LLM 外部内容边界已落地。PostgreSQL 完整套件 1592 passed/6 skipped，迁移头 `harden_agent_runtime`。
- 2026-08-13 **剩余 100% 边界**: 不得把代码全绿等同于外部依赖完成；品种成熟窗口需权威治理参数，LLM 月度费用熔断需价格/预算政策，外部告警需通知目标，均应在配置获批后实施，不能猜值。
- 2026-08-13 **成熟窗口与 LLM 熔断**: `SIGNAL_MATURITY_WINDOWS` 支持 symbol/product 级显式窗口并保留默认 10 bars；`LLM_MONTHLY_TOKEN_LIMIT` 未配置时不阻断，配置后按供应商返回的 prompt/completion tokens 月度持久化并 fail-closed。
- 2026-08-13 **运维与券商边界**: `ops_health_snapshots` 持久化备份年龄、K线新鲜度、采集失败、信号积压和 Celery 队列深度；MonitorAlert 有有限重试投递状态。`trading/broker_adapter.py` 仅提供幂等订单/对账/风控协议与 DisabledLiveBroker，真实券商 API 不启用。
- 2026-08-13 **可见任务最终验收**: 删除 `core/tasks` 双 Celery 源，所有采集 checkpoint 统一 PostgreSQL 且 overwrite 按 key 删除；Beat advisory lock 独占实时同步；Agent step 真正持久化完成状态；数据库 LLM usage ledger、ops snapshot、secret-read fail-closed audit 已落地。Alembic head `complete_ops_governance`，PostgreSQL 全套 `1604 passed/4 skipped`。
- 2026-08-13 **同步所有权表述**: `SyncScheduler.start/stop` 仅持久化 Celery Beat 启停偏好，不创建 API 本地循环；运维文档、日志和接口注释必须明确 Beat-owned，避免把兼容方法名误判为双调度器。
- 2026-08-13 **OpenWolf 日志编码**: `.wolf/memory.md` 曾含单行历史 GBK 字节，导致标准补丁工具拒绝读取；已将该行语义化重写为 UTF-8，后续日志必须统一 UTF-8。
- 2026-08-13 **Checkpoint 迁移契约**: `collect_checkpoints` 不能只由采集 helper 懒建；空库仅执行 Alembic 后，诊断和运维快照也必须立即可查询，因此表结构由 `add_collection_checkpoints` 迁移正式管理，helper 仅保留兼容幂等创建。
- 2026-08-14 **Ant Design Card API**: 当前前端依赖对 `bodyStyle` 输出弃用警告；所有 Card 内容样式使用 `styles={{ body: ... }}`，浏览器验收要求控制台无 error/warning。
- 2026-08-14 **最终可见任务证据**: 基础 `.[dev]` PostgreSQL 套件 `1600 passed/10 skipped/44 warnings`，6 个额外 skip 来自未安装重型 ML extra 的 HMM 测试；空白临时库完整迁移到 `add_collection_checkpoints`，API/Nginx/Worker/Beat 运行且浏览器登录页控制台为零 warning/error。
- 2026-08-14 **重型 ML CI 边界**: `.github/workflows/ml-validation.yml` 通过 `workflow_dispatch` 手动执行，安装 `.[ml,dev]` 并验证 Arch/HMM/TensorFlow/Torch 与对应测试；不放入每次 push 的基础矩阵，避免大依赖成本拖慢常规 CI。
- 2026-08-14 **Git 远端凭据检查**: 当前 `origin` URL 内嵌私有凭据；用户要求保留配置，因此不主动迁移，但所有状态报告必须使用 `git remote get-url` 后自行脱敏或完全省略 URL，禁止再直接输出 `git remote -v`。
- 2026-08-14 **因子策略扩充偏好**: 用户明确要求除计算定义完全相同外，其他公开因子和策略尽量全部纳入；近似但窗口、归一化、数据来源或经济含义不同的变体保留，并通过公式/逻辑指纹去重。
- 2026-08-14 **研究扩展注册契约**: 新增研究项使用声明式规格和规范化 SHA-256 公式/逻辑指纹；扩展数据缺失时因子全 NaN、策略 None，注册项统一标记 research-only，不能把注册数量当作盈利证据。
- 2026-08-14 **因子注册表完整性**: `FactorRegistry.ensure_initialized()` 不能以字典非空判断完整；直接导入子模块会产生部分注册，必须检查 legacy/GTJA/English/research 哨兵，不完整时清空并重载全部模块。
- 2026-08-14 **因子计算去重证据边界**: 多路径输出哈希只能比较能在统一输入契约上执行且产生有限值的定义；本轮覆盖 80 个新增纯 OHLCV 对 370 个旧因子且零碰撞，110 个旧 GTJA 解释器错误和 3 个全无有限输出必须单独披露，不能计入已比较覆盖。
- 2026-08-15 **Phase 7 权威数据边界**: SHFE/INE 官方日档可用于合约规格和主力切换证据；长历史采集必须逐交易日逐交易所完整、有限重试且重试耗尽整体失败。宏观 AKShare 值即使有 URL/检索时间/哈希，也不能替代官方发布时间，`available_time_estimated=true` 永远不能清除点时门禁。
- 2026-08-15 **主力切换证据模型**: 批次文档保留完整逐日证据清单，每条切换只引用两个确认日和生效日的 6 个证据；历史合约按严格 `PRODUCTYYMM` 校验后在同一事务中注册为 inactive，不能误标为可交易。
- 2026-08-15 **研究包宏观关联**: 期货 `product_id` 与宏观指标 `product_id` 不同，研究包必须通过 `MACRO_PRODUCT_LINKAGE` 按品种代码选择指标，并只返回 `available_time_estimated=false` 的发布记录。
- 2026-08-15 **宏观事件覆盖与交易权重分离**: Phase 7 研究包的官方发布时间覆盖不能依赖带权重的交易相关性映射；10 个目标品种统一接收六类官方宏观事件，而 `MACRO_PRODUCT_LINKAGE` 继续只表达已有交易规则权重，禁止为通过门禁臆造相关系数。
- 2026-08-15 **批量因子失败边界**: 单个 Legacy 定义调用产生 `AgentCenterError` 时，Phase 6 因子批处理必须记录该因子的失败并继续其余因子；只有批次级前置条件失败才能中止整个命令。
- 2026-08-15 **可信回测契约**: Legacy 引擎成本场景权威定义为 `optimistic/base/stress`，每笔交易必须携带实际 Fill 的进出场时间；Agent 适配器不得另造 `severe` 场景或接受无时间账本。
- 2026-08-15 **期货滚动窗口**: 单一期货合约通常不足默认 252/63 三测试窗的 441 根历史；Agent 可显式传递训练/测试窗口，但 Legacy 底层仍强制 train>=100、test>=20 且至少三个独立测试窗，不能为验收绕过门槛。
- 2026-08-15 **Docker 只读测试缓存**: `tsc-test-runner` 将 Legacy 挂载到只读 `/workspace`，Ruff 必须使用 `RUFF_CACHE_DIR=/tmp/ruff-cache`，pytest 应禁用 cacheprovider；容器 PostgreSQL 集成测试必须使用 Compose 服务主机而非 localhost。
- 2026-08-15 **Legacy Ruff 验收范围**: `ruff check .` 会扫描既有 `.agents/`、`.claude/` 和 `vendor/`，产生大量与应用无关的基线违规；阶段验收只 lint 本阶段应用/测试文件，并单独披露全仓库基线，禁止为通过验收修改第三方或技能源码。
- 2026-08-15 **zsh 保留变量**: 临时 shell 脚本不可使用 `PATH` 或 `status` 作为变量名；前者破坏命令查找，后者在 zsh 中只读。
- 2026-08-15 **连续主力点时契约**: 连续 D1 每个交易日必须由当日已生效的审计切换选择真实合约；首个切换日前使用该切换的 old_contract，之后只使用最近已生效 new_contract，禁止回退当前主力或用其他合约填缺口。
- 2026-08-15 **连续窗口验证口径**: `limit=N` 先确定最近 N 个产品交易日，再在该窗口逐日验证 active-contract 唯一行和官方质量；请求窗口外档案缺口不能阻塞窗口内研究，但窗口内任何缺口必须失败。
- 2026-08-15 **主力链官方回填**: 缺失 active-contract 行只能从 SHFE/INE 官方日档回填；必须完整 dry-run 全窗口后才允许一次性事务 apply，不能用旁路行情、插值或替代合约。
- 2026-08-15 **研究指纹不可变性**: 连续 bundle 哈希不含当前检索时钟和未来未使用切换；campaign 指纹必须覆盖配置、输入 bundle 哈希和完整结果证据，避免相同配置不同结果共用 ID。
- 2026-08-15 **Phase 8 研究边界**: 跨 bundle 因子排名保留每窗 IC/Rank IC/ICIR、符号一致性和相关性去重；策略候选必须保留 trusted run/split fingerprint，默认 research_only，且无人工批准不得晋级。
- 2026-08-15 **Phase 11 独立候选边界**: 候选审计必须按逻辑指纹而非名称计数，父子/parameter_variant 不得增加独立样本；Legacy 应用容器缺 loguru 时只能使用测试运行时或只读依赖 stub 读取真实注册定义，禁止伪造候选元数据。
- 2026-08-15 **可信指标 JSON 边界**: `profit_factor` 在有盈利但无亏损时数学上未定义，可信 API 必须输出有限 sentinel `0.0`，不能返回 Infinity 或人为巨大值；所有外部数值证据必须通过严格 JSON 序列化。
- 2026-08-15 **Phase 11 完整失败账本**: 官方 OHLCV/OI 连续包可完整评估 82/96 研究因子；期限结构、库存、会员持仓、盘口与期权字段缺失导致 14 因子在 BU/RU 各产生一次显式失败。阶段可接受 partial campaign，但只能宣称 82 个已执行、62 个相关性筛选后候选，不能把缺字段因子记为零或成功。
- 2026-08-16 **扩展观测点时比较**: 日频扩展观测允许在 observation_date 当日带时区发布/可用，门禁应比较 `available_at.date() <= observation_date`，同时独立强制 `published_at <= available_at`；不能用当日 00:00 直接比较导致所有盘中发布被拒。
- 2026-08-16 **SHFE 曲线可用时间证据**: `https://www.shfe.com.cn/data/tradedata/future/dailydata/kxYYYYMMDD.dat` 返回可信 `Last-Modified`，可作为该日官方曲线观测 published/available_at；原始响应字节 SHA-256 必须保留，近/中/远合约按 DELIVERYMONTH 排序选择，不能使用当前抓取时钟替代发布时间。
- 2026-08-16 **历史曲线延迟发布边界**: SHFE 历史日档可能在交易日之后更新（本轮 2026-02-13 到 02-23、2026-08-07 到次日）；这些 bundle 必须拒绝当日点时研究，不能因面板缺口放宽。118 个通过日期已足够让 BU/RU 的 3 个 curve 因子各产生 118 个有限值。
- 2026-08-16 **SHFE 会员持仓口径**: `pmYYYYMMDD.dat` 的 `o_cursor` 同时含产品汇总行和合约排名行；Phase 12 只接受品种前缀匹配且 `RANK>0` 的合约行。`long_position/short_position` 汇总全部有效排名，`top_long/top_short` 仅汇总 `RANK<=5`，禁止纳入 `buall/ruall` 等汇总行造成重复计算。
- 2026-08-16 **psycopg2 日期数组绑定**: Python 字符串日期列表传给 PostgreSQL `ANY(%s)` 会推断成 `text[]`；与 `date` 列比较时必须显式写成 `ANY(%s::date[])`，避免 `date = text` 运算符错误。
- 2026-08-16 **SHFE 期权到期规则**: SHFE 官方期权产品标准页明确：最后交易日为标的期货合约交割月前第一月的倒数第五个交易日，交易所可按法定节假日调整；到期日同最后交易日。导入器必须由调用方显式提供已按官方交易日历解析的 expiry_date 与规则文档 SHA-256，禁止回退到交割月前月末近似。
- 2026-08-16 **期权标的到期一致性**: 期权档案的 `UNDERLYINGINSTRID` 与期货档案的 `DELIVERYMONTH` 必须先对齐；导入器还必须拒绝不在标的交割月前一月的 expiry_date，不能只检查 expiry_date 大于观测日。
- 2026-08-16 **多源观测可用时间**: 期权 IV 同时依赖期权档和标的期货档，组合观测的 available_at 必须取两个官方源的较晚时间（max），不能取较早时间；只有全部输入都已发布后观测才可用。
- 2026-08-16 **SHFE IV 贴现率**: 不得使用 `options_analytics.DEFAULT_RISK_FREE=0.02` 近似生成 Phase 12 权威 IV。对同标的同执行价 call/put，使用 SHFE 官方 Delta 的 Black-76 恒等式 `discount=call_delta-put_delta`，再由 `r=-ln(discount)/T` 推导贴现率；该派生率必须随观测证据持久化。
- 2026-08-16 **期权到期日运行时门禁**: 仅验证 expiry 位于交割月前一月不够；生产导入函数必须接收该到期月份完整、排序、唯一的官方交易日列表，并强制 `expiry_date == trading_days[-5]`。
- 2026-08-16 **SHFE 仓单报告证据**: 新版 `stockdata/dailystock_YYYYMMDD/ZH/all.html` 正文包含动态防护外壳，必须显式 UTF-8 解码后仅规范化 `#stock` 正文哈希；同日期目录 `css/new.css` 的官方 `Last-Modified` 作为报告包可用时间证据。检索时间和正文日期本身不足以通过点时门禁。
- 2026-08-16 **Phase 12 缺失源结论**: SHFE 公开 `dailyTimePrice` 与 `delayed_market_data_*_history` 只有参考结算价或 34 日 OHLCV/OI，不含 bid/ask、双边量或主动买卖量；不得据此伪造 order-book 因子。NBS 旬度生产资料表有天然橡胶 SCRWF、无石油沥青，且不得前填成日频基差。
- 2026-08-18 **Phase 25 候选层级与单仓门禁**: 组合终验必须分离“已接受品种资格”和“独立策略候选”；允许同一品种有多个候选，但逻辑、参数和 OOS 运行指纹都必须唯一。组合最多一手并发信号时，保证金门禁应取候选品种的一手保证金最大值，不应把不会同时持有的所有品种保证金相加。样本不足时 PBO/DSR 必须显式 `insufficient` 并阻塞最终接受；人工批准和无执行边界也必须成为输入门禁。
- 2026-08-18 **SHFE RB/ZN 观测边界**: 官方 KX 行情与 PM 会员持仓档案可按同一交易日组成 256 天点时观测面板，期限结构与持仓汇总可以进入研究层；仓单必须另有官方报告证据，不能用 PM/KX 或推测 URL 代替。即使观测面板通过，warehouse_receipts 缺失仍阻塞 F22.3/F24.3、产品因子和 Phase 25。
- 2026-08-18 **SHFE 仓单双格式边界**: 2025-11 中旬前的官方仓单历史由 `YYYYMMDDdailystock.dat` JSON 提供，之后优先使用 `future/stockdata/dailystock_YYYYMMDD/ZH/all.html` 与 CSS `Last-Modified`；当前 256 日窗口为 73 JSON + 183 HTML。必须保留真实 `update_date`/`Last-Modified`，包括三个次日发布样本，因子只能从 `available_at` 后使用，不得回填到交易日收盘。
- 2026-08-18 **FG/ZN 真实档案边界**: CZCE FG 合约代码在 2025-2026 原始日档中使用 `FG` 加三位交割码；休眠合约可能保留 OHLC 全零行，必须整行跳过但不能放宽部分零值异常。SHFE ZN `jsYYYYMMDD.dat` 提供逐合约结算价、固定手续费和特殊/套保保证金；合约乘数可由同日官方成交额、结算价和成交量交叉验证。连续主力必须两日确认后在下一交易日生效，样本末日未完成确认的切换不得计入。
- 2026-08-18 **CZCE MA/FG 观测与因子边界**: `FutureDataWhsheet.txt` 和 `FutureDataHolding.txt` 可为 MA/FG 提供 256 日官方仓单与产品持仓合计；期限结构必须由同日 `FutureDataDaily.txt` 的至少三个真实合约按交割月排序计算。仅一年的窗口不能声称季节性，FG 产业利润缺官方点时证据时必须保留失败项。
- 2026-08-18 **Phase 25 独立样本计数**: 候选只有在 candidate_id、logic_sha256、parameter_sha256 和 oos_run_sha256 全部有效且唯一时才计入 independent_candidate_count；重复候选可记录失败但不得增加 PBO/DSR 样本量。本轮四品种共用同一逻辑/参数模板，因此四条 OOS 候选仅构成一个独立候选。
- 2026-08-18 **Phase 26-30 研究优先级**: 先建立五年市场/三年扩展观测契约并扩展 ZN/CU，再冻结并评估期限结构均值回归、仓单冲击、ZN-CU 相对价值三个独立策略族；之后补 RB/FG 产业链证据，目标为十个真实独立候选。MA 研究冻结，只采集数据，不调参挽救当前失败结果。
