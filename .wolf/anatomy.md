# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-07-12T02:57:01.874Z
> Files: 1074 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `_download_quantsplaybook.py` — Download QuantsPlaybook zip with resume support. (~425 tok)
- `_verify_macro.py` (~218 tok)
- `_verify_store.py` (~69 tok)
- `.dockerignore` — Docker ignore rules (~26 tok)
- `.gitignore` — Git ignore rules (~119 tok)
- `合约清单_20260702.txt` (~1650 tok)
- `alembic.ini` (~162 tok)
- `api.log` (~177 tok)
- `ARCHITECTURE.md` — 交易策略中心 — 架构设计文档 (~18701 tok)
- `docs/EXPERT_UPGRADE_IMPLEMENTATION_STATUS.md` — Verified expert-upgrade implementation status, evidence, and remaining scope. (~650 tok)
- `backtest/instrument_specs.py` — Shared PostgreSQL instrument specification loader for trusted execution consumers. (~320 tok)
- `core/research/run_manifest.py` — Canonical run manifest, configuration hashing, git revision, and deterministic fingerprint helpers. (~650 tok)
- `core/research/fingerprint.py` — CLI for printing a stored manifest fingerprint. (~180 tok)
- `core/research/store.py` — Persists immutable trusted run manifests and metrics with parent replay links. (~350 tok)
- `core/research/replay.py` — CLI and metric comparator for replaying persisted trusted research runs. (~700 tok)
- `core/db/migrations/versions/add_research_runs.py` — Creates replayable research run persistence and indexes. (~350 tok)
- `backtest/trusted_walkforward.py` — Trusted next-open walk-forward windows using explicit instrument specifications. (~300 tok)
- `trading/instrument_import.py` — Strict provenance-aware instrument specification validation and versioned import. (~1000 tok)
- `scripts/import_instrument_specs.py` — Dry-run by default CLI for authoritative instrument specification imports. (~250 tok)
- `data_center/macro_release_import.py` — Strict provenance-aware official macro release-calendar validation and atomic point-in-time updates. (~900 tok)
- `scripts/import_macro_release_calendar.py` — Dry-run by default CLI for official macro release-calendar imports. (~250 tok)
- `docs/MACRO_RELEASE_IMPORT.md` — Input contract and safe dry-run/apply operations for macro release calendars. (~350 tok)
- `tests/unit/test_macro_release_import.py` — Validation, future-knowledge rejection, and atomic provenance-write coverage. (~450 tok)
- `tests/unit/test_python_packaging.py` — Explicit flat-layout package discovery and CI artifact-validation regression checks. (~200 tok)
- `core/db/migrations/versions/add_macro_release_provenance.py` — Expand-only macro source URL, retrieval timestamp, and document hash columns. (~300 tok)
- `docs/INSTRUMENT_SPEC_IMPORT.md` — Authoritative specification document format and operating procedure. (~450 tok)
- `core/db/migrations/versions/add_backtest_run_manifest.py` — Expand-only migration adding nullable backtest run manifests. (~280 tok)
- `core/db/migrations/versions/add_point_in_time_lineage.py` — News append-only and macro availability-time lineage migration. (~620 tok)
- `tests/unit/test_run_manifest.py` — Determinism and configuration-change fingerprint regression tests. (~250 tok)
- `tests/unit/test_evolve_trusted_source.py` — Regression test ensuring experiment evolution uses trusted next-open execution. (~300 tok)
- `capture_macro_news.py` — 截图 MacroNews 页面 (~852 tok)
- `CHANGELOG.md` — 更新日志 (~2135 tok)
- `check_data.py` — class: test_baostock, test_tdx, test_akshare, test_tushare (~5943 tok)
- `check_rb.py` (~290 tok)
- `CLAUDE.md` — OpenWolf (~575 tok)
- `collect_futures_2023.py` (~240 tok)
- `collect_futures_2025.py` (~240 tok)
- `collect_futures_2026.py` (~244 tok)
- `collect_now.py` — Trading Strategy Center — 命令行采集脚本 (~2242 tok)
- `collect_options.py` (~232 tok)
- `collect_stocks_2024.py` (~262 tok)
- `collect_stocks.py` (~205 tok)
- `CONTRIBUTING.md` — 交易策略中心 - 贡献指南 (~1419 tok)
- `debug_briefing.py` — 检查 briefing API 响应体 (~741 tok)
- `debug_dom.py` — 深度调试 MacroNews - 检查 DOM 和 API 响应 (~801 tok)
- `debug_macro_news.py` — 调试 MacroNews 页面 - 检查 API 调用和数据状态 (~778 tok)
- `debug_options.py` — Declares opt_products (~402 tok)
- `DELIVERY_REPORT.md` — 🎉 系统交付报告 (~1508 tok)
- `deploy.sh` — Trading Strategy Center — 一键部署脚本 (~1513 tok)
- `DEPLOYMENT.md` — 交易策略中心 — 生产环境部署文档 (~1766 tok)
- `diagnose_frontend.py` (~370 tok)
- `docker-compose.prod.yml` — Docker Compose: 5 services (~617 tok)
- `docker-compose.yml` — Docker Compose services (~574 tok)
- `Dockerfile` — Docker container definition (~271 tok)
- `Dockerfile.light` (~257 tok)
- `ENHANCEMENT_COMPLETION_REPORT.md` — 🎉 功能扩展完成报告 (~2003 tok)
- `FACTOR_RESEARCH_IMPLEMENTATION.md` — Factor Research Module - Implementation Complete (~1485 tok)
- `final_screenshot.py` — 最终截图 - 等所有数据加载完毕 (~514 tok)
- `FINAL_SUMMARY.md` — 🎉 项目完成总结报告 (~1585 tok)
- `fix_category_cn.py` — -*- coding: utf-8 -*- (~670 tok)
- `fix_comma.py` — -*- coding: utf-8 -*- (~107 tok)
- `fix_encoding.py` — fix_garbled_text, scan_and_fix_file, main (~782 tok)
- `fix_line159.py` — -*- coding: utf-8 -*- (~122 tok)
- `fix_line271.py` (~124 tok)
- `fix_line365.py` (~125 tok)
- `fix_line367.py` — -*- coding: utf-8 -*- (~123 tok)
- `fix_missing_quotes.py` — -*- coding: utf-8 -*- (~198 tok)
- `fix_vibe_dict.py` — -*- coding: utf-8 -*- (~1130 tok)
- `fix_vibe_final.py` — -*- coding: utf-8 -*- (~306 tok)
- `fix_vibe_garbled.py` — -*- coding: utf-8 -*- (~192 tok)
- `fix_vibe_gibberish.py` — -*- coding: utf-8 -*- (~615 tok)
- `fix_vibe_gibberish2.py` — -*- coding: utf-8 -*- (~484 tok)
- `fix_vibe_line461.py` — -*- coding: utf-8 -*- (~129 tok)
- `fix_vibe_remaining.py` — -*- coding: utf-8 -*- (~266 tok)
- `fix_vibe.py` (~186 tok)
- `fix_vibe2.py` (~490 tok)
- `fix_vibe3.py` — Declares docstring (~611 tok)
- `fix_vibe4.py` (~388 tok)
- `fix_vibe5.py` (~258 tok)
- `fix_vibe6.py` (~138 tok)
- `FRONTEND_DATA_SYNC_FIX.md` — 前端数据同步修复方案 (~1860 tok)
- `FRONTEND_FIX_COMPLETE.md` — ✅ 前端修复完成！ (~768 tok)
- `FRONTEND_ISSUES_SUMMARY.md` — Web界面问题总结与修复方案 (~1642 tok)
- `FRONTEND_UPGRADE_REPORT.md` — 前端Web界面升级完成报告 (~1774 tok)
- `GIT_UPLOAD_GUIDE.md` — 🚀 Git上传完成指南 (~1682 tok)
- `GITHUB_PUSH_GUIDE.md` — GitHub推送指南 (~641 tok)
- `IMPLEMENTATION_COMPLETE_PHASE1.md` — 🎉 用户需求全面实施完成报告 (~1770 tok)
- `IMPLEMENTATION_COMPLETE_PHASE2.md` — 🎉 Phase 2 实施完成报告 (~1631 tok)
- `LICENSE` — Project license (~292 tok)
- `main.py` — lifespan (~864 tok)
- `monitor_collect.ps1` (~331 tok)
- `nginx.conf` — Nginx configuration (~605 tok)
- `nginx.prod.conf` — Trading Strategy Center — 生产 Nginx 配置 (裸机部署) (~390 tok)
- `OPENWOLF_INTEGRATION.md` — OpenWolf Integration Report (~1788 tok)
- `PROJECT_CLEANUP_REPORT.md` — 项目文件整理完成报告 (~1813 tok)
- `PROJECT_FINAL_REPORT.md` — 🎊 项目全面完成报告 (~2240 tok)
- `pyproject.toml` — 三系统融合量化交易策略中心 — Guanshan / Chufeng / Tinghai (~399 tok)
- `QUICK_START_PHASE1.md` — 🚀 立即启动指南 - Phase 1 功能使用 (~1814 tok)
- `QUICK_START.md` — 交易策略中心 - 快速入门指南 (~2397 tok)
- `README.md` — Project documentation (~809 tok)
- `rebuild_checkpoint.py` — rebuild (~779 tok)
- `requirements-dev.txt` — 可选依赖（development环境） (~135 tok)
- `screenshot.py` — 截图工具 - 使用系统Chrome浏览器 (~328 tok)
- `signal_adapter.py` — SignalAdapter: process_symbol, process_batch (~461 tok)
- `start_dev.bat` (~32 tok)
- `start_dev.ps1` — Trading Strategy Center — 一键启动脚本 (开发环境) (~1003 tok)
- `start.ps1` — Trading Strategy Center - 启动脚本 (~392 tok)
- `start.sh` — Trading Strategy Center - 启动脚本 (~212 tok)
- `STARTUP.md` — 交易策略中心 — 启动运行文档 (~1772 tok)
- `stop_dev.ps1` — Trading Strategy Center — 停止服务 (~189 tok)
- `sync_2025_2026.py` — 一次性补全 2025/2026 年全量数据 (期货+股票+期权 D1)。后台运行。 (~538 tok)
- `SYSTEM_COMPLETION_REPORT.md` — 交易策略中心 - 系统升级完成报告 (~1244 tok)
- `temp_analysis.py` (~945 tok)
- `temp_check_2026.py` (~279 tok)
- `temp_check_db.py` (~571 tok)
- `temp_check_futures.py` (~255 tok)
- `temp_check_options.py` (~299 tok)
- `temp_check_stocks.py` (~210 tok)
- `temp_compare_alpha101.py` (~4489 tok)
- `temp_compare_gtja.py` (~790 tok)
- `temp_create_gtja_factors.py` (~6375 tok)
- `temp_list_products.py` (~65 tok)
- `temp_read_gtja.py` (~257 tok)
- `temp_read_gtja2.py` (~128 tok)
- `temp_read_pdf.py` (~118 tok)
- `temp_start_backend.py` (~88 tok)
- `temp_test_options.py` — 1. option_current_day_sse (~179 tok)
- `test_data_sources.py` — test_akshare_futures, test_akshare_stocks, test_baostock, test_akshare_options (~3078 tok)
- `THEME_SWITCH_GUIDE.md` — 🎨 主题切换功能使用指南 (~1001 tok)
- `update_gtja_factors.py` — 批量更新 gtja_ 因子文件，实现 compute 方法 (~6285 tok)
- `UPGRADE_STATUS.md` — 系统升级状态报告 (~1325 tok)
- `UPGRADE_SUMMARY.md` — 交易策略中心 - 系统升级完成总结 (~1162 tok)
- `USER_REQUIREMENTS_ANALYSIS.md` — 用户需求分析与实施方案 (~3362 tok)
- `WEB_STARTUP_GUIDE.md` — Web服务启动指南 (~992 tok)

## .claude/

- `settings.json` (~491 tok)
- `settings.local.json` — Declares AKShareFetcher (~1121 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## .claude/skills/book-study/

- `SKILL.md` — Book Study — Reading Coach (~3556 tok)

## .claude/skills/code-review-expert/

- `SKILL.md` — Code Review Expert (~1673 tok)

## .claude/skills/find-skills/

- `SKILL.md` — Find Skills (~1473 tok)

## .claude/skills/karpathy-guidelines/

- `SKILL.md` — Karpathy Guidelines (~785 tok)

## .claude/skills/sigma/

- `SKILL.md` — Sigma Tutor (~6485 tok)

## .claude/skills/sigma/evals/

- `evals.json` (~902 tok)

## .claude/skills/skill-forge/

- `SKILL.md` — Skill Forge (~2606 tok)

## .claude/skills/skill-forge/scripts/

- `package_skill.py` — package_skill, main (~997 tok)

## .claude/skills/skill-review/

- `SKILL.md` — Skill Review (~1370 tok)

## .claude/skills/wiki-ingest/

- `SKILL.md` — Wiki Ingest — Knowledge Base Compiler (~1069 tok)

## .github/workflows/

- `main.yml` — CI/CD with real test exits, frontend build, secret/dependency security gates, packaging, and Docker publication. (~1500 tok)
- `.github/dependabot.yml` — Weekly pip, npm, and GitHub Actions dependency updates. (~120 tok)

## .pytest_cache/

- `.gitignore` — Git ignore rules (~11 tok)
- `CACHEDIR.TAG` (~51 tok)
- `README.md` — Project documentation (~78 tok)

## .pytest_cache/v/cache/

- `nodeids` (~20678 tok)
- `stepwise` (~1 tok)

## C:/Program Files/PostgreSQL/18/data/

- `pg_hba.conf` — PostgreSQL Client Authentication Configuration File (~1494 tok)

## C:/Users/Administrator/.claude/

- `.mcp.json` (~252 tok)
- `CLAUDE.md` — Global Guidelines (~601 tok)
- `settings.json` (~1284 tok)

## C:/Users/Administrator/.claude/plans/

- `bubbly-finding-glacier.md` — 数据中心重构与数据重新下载计划 (~1053 tok)
- `d-trading-strategy-center-docs-spec-api-polished-pond.md` — DuckDB → PostgreSQL 迁移计划 (~1044 tok)
- `generic-swimming-emerson.md` — 合并智能中心+自进化引擎 → 进化引擎 (~269 tok)
- `gleaming-snuggling-acorn.md` — 实时同步模块整合方案 (~723 tok)
- `modular-waddling-zephyr.md` — Plan: 模拟交易整合 + 实时价格 + 止损止盈提醒 (~711 tok)
- `peppy-wishing-peacock.md` — 数据采集系统升级计划 (~1360 tok)
- `postgresql-duckdb-pg-sprightly-tome.md` — PostgreSQL 迁移 + 实时同步完善方案 (~1176 tok)
- `squishy-juggling-dahl.md` — 数据中心采集完整性计划 (~744 tok)
- `tender-hugging-rocket.md` — 系统全局测试修复升级计划 (~245 tok)

## C:/Users/Administrator/.claude/plugins/

- `installed_plugins.json` (~706 tok)
- `known_marketplaces.json` (~155 tok)

## C:/Users/Administrator/.claude/projects/d-------trading-strategy-center/memory/

- `feedback-communication-language.md` (~84 tok)
- `feedback-github-token-defer.md` (~114 tok)
- `MEMORY.md` — Memory Index (~69 tok)
- `project-closed-loop-vision.md` (~170 tok)
- `session-2026-06-30-pg-migration.md` — Session: 2026-06-30 PostgreSQL迁移 + 实时同步完善 (~315 tok)
- `trading-system-review-20260712.md` — 客服反馈系统审查 2026-07-12 (~369 tok)

## C:/Users/Administrator/.claude/rules/

- `openwolf.md` (~318 tok)

## analysis/

- `__init__.py` (~0 tok)
- `bayesian_inference.py` — BayesianInference: update, get_probability, get_credible_interval (~425 tok)
- `chan_pro.py` — chan.py 专业缠论引擎适配层。 (~1182 tok)
- `chan_theory.py` — ChanTheory: detect_bi, detect_zhongshu, classify_trend (~927 tok)
- `divergence_detector.py` — DivergenceDetector: detect (~929 tok)
- `factor_eval.py` — FactorEvaluator: compute_ic, turnover, factor_decay (~306 tok)
- `fourier_analyzer.py` — FourierAnalyzer: fit, get_cycles, reconstruct (~514 tok)
- `monte_carlo.py` — MonteCarloStrategyEvaluator: evaluate, confidence_interval (~357 tok)
- `oifactors.py` — OIAnalyzer: analyze, detect_divergence (~287 tok)
- `seasonality.py` — SeasonalityAnalyzer: day_of_week_effect, month_effect, get_seasonal_adjustment (~427 tok)

## analysis/fundamental/

- `__init__.py` — 基本面分析模块 — 库存 × 成本链 × 季节性 × 需求 四维分析。 (~67 tok)
- `cost_chain.py` — 成本链分析器 — 计算品种的成本支撑/压力。 (~1743 tok)
- `demand.py` — 需求端分析器 — 采集下游开工/宏观需求指标。 (~2261 tok)
- `inventory.py` — 库存分析器 — 采集品种社会库存/仓单数据。 (~2475 tok)
- `model.py` — 基本面 Agent 核心 — 四维打分引擎 + 综合评分。 (~1816 tok)
- `product_map.py` — 品种基本面映射表 — 核心配置。 (~3784 tok)
- `seasonality.py` — 季节性分析器 — 基于历史行情回算品种季节性规律。 (~1428 tok)

## analysis/fundamental/ — 基本面四维分析 Agent（新建）

- `__init__.py` — 包导出 (~85 tok)

## api/

- `__init__.py` (~0 tok)
- `router_registry.py` — register_all (~1147 tok)

## api/middleware/

- `__init__.py` (~0 tok)
- `error_handler.py` — app_exception_handler, unhandled_exception_handler (~281 tok)

## api/routes/

- `__init__.py` (~0 tok)
- `agent_routes.py` — API: POST, GET (12 endpoints) (~2926 tok)
- `alert_routes.py` — 交易信号提醒 API — 活跃信号列表 / 单信号全链路详情 / 手动刷新 / 数据新鲜度检查。 (~1058 tok)
- `auth_routes.py` — 简易登录认证 — 单用户 admin/admin@admin，返回 Bearer token。 (~940 tok)
- `backtest_routes.py` — Backtest API including trusted next-open and Walk-forward routes; preserves complete futures contract codes and gates execution on authoritative instrument specifications. (~2900 tok)
- `base.py` — api/routes/base.py — 公共路由基类。 (~301 tok)
- `briefing_routes.py` — 快读简报 API — 获取与手动生成。 (~965 tok)
- `china_finance_routes.py` — China Finance — A股金融研究框架 (基于 claude-for-financial-services-cn). (~1188 tok)
- `data_routes.py` — API: 6 endpoints (~1100 tok)
- `db_routes.py` — API: GET, POST (9 endpoints) (~5290 tok)
- `evolve_routes.py` — API routes for self-evolving experiment pipeline — integrated with strategy registry. (~2695 tok)
- `factor_routes.py` — API: 因子研究路由 + 导入/导出, /factors/list 用真实 FactorRegistry 数据 (~10500 tok)
- `feedback_routes.py` — 反馈闭环 API — 处理锦标赛结果 / 查询反馈历史与排名。 (~311 tok)
- `fundamental_routes.py` — 基本面 Agent API — 四维基本面评分接口。 (~1818 tok)
- `health_routes.py` — API: 4 endpoints (health, health/diagnostics, system/time) (~3100 tok)
- `index_routes.py` — 全球指数/外汇/国债实时行情 API — Sina + Tencent HTTP, 后台静默刷新。 (~5734 tok)
- `intelligence_routes.py` — API routes for intelligence upgrade: RL, risk monitoring, monitoring. (~4180 tok)
- `llm_routes.py` — API routes for LLM-powered market analysis and strategy generation. (~1591 tok)
- `macro_news_routes.py` — 新闻宏观仪表盘 API；manual news refresh now uses pipeline single-flight response. (~1418 tok)
- `market_intelligence_routes.py` — Market Intelligence — 互联网数据获取能力 (基于 Agent-Reach)。 (~1592 tok)
- `ml_routes.py` — API: GET, POST (3 endpoints) (~662 tok)
- `mlopts_routes.py` — API: 1 endpoints (~1880 tok)
- `news_routes.py` — News Aggregator — AI新闻聚合与情感评分 (基于 NewsRader)。 (~1791 tok)
- `phase3_routes.py` — API: 4 endpoints (~1464 tok)
- `portfolio_routes.py` — API: GET, POST (3 endpoints) (~372 tok)
- `scoring_routes.py` — API: 7 endpoints (~1127 tok)
- `settings_routes.py` — 系统设置 API — 运维中心配置端点。 (~1214 tok)
- `signal_routes.py` — 信号白名单管理 — 控制哪些策略参与 AlertAggregator 实时扫描。 (~529 tok)
- `simulated_trading_routes.py` — 模拟交易 API — 持仓 / 开平仓 / 历史 / 关注列表 / 实时行情。 (~694 tok)
- `strategy_builder_routes.py` — 策略生成器 + 导入/导出 — 将前端 StrategyBuilder 配置转为可执行的 BaseStrategy 文件, 支持 .strategy-pack.json 便携式策略包导入导出。 (~4600 tok)
- `strategy_pool_routes.py` — 策略优化池 — 退役策略管理 + 重优化 + 重新激活。 (~951 tok)
- `strategy_pool_routes.py` — 策略优化池 — 退役策略管理 + 重优化 + 重新激活。 (~896 tok)
- `strategy_routes.py` — 策略中心 API — 合并 strategy_routes + strategy_pool + strategy_builder。 (~5623 tok)
- `tournament_routes.py` — API routes for Strategy Tournament — rankings, scoring, and elimination. (~1634 tok)
- `trading_routes.py` — API: GET, POST (4 endpoints) (~528 tok)
- `vibe_routes.py` — Vibe Research - HKUDS Quantitative Research System (~4443 tok)
- `vstock_routes.py` — VStock Advisor — 游资股票分析引擎 (基于 UZI-Skill)。 (~4100 tok)

## api/routes/fundamental_routes.py — 基本面 API（新建）


## api/storage/

- `__init__.py` (~0 tok)
- `file_store.py` — api/storage/file_store.py — 基于 JSON 的持久化存储。 (~720 tok)

## api/utils/

- `__init__.py` (~0 tok)
- `sentiment.py` — api/utils/sentiment.py — 公共情感评分工具。 (~238 tok)

## api/websocket/

- `__init__.py` (~0 tok)
- `manager.py` — ConnectionManager: connect, disconnect, broadcast, send_personal + 1 more (~577 tok)
- `realtime_signals.py` — ConnectionManager: connect, disconnect, send_personal_message, broadcast + 10 more (~2092 tok)
- `trading_stream.py` — WebSocket endpoints for real-time trading data streaming. (~1195 tok)

## backtest/

- `__init__.py` (~0 tok)
- `metrics.py` — sharpe_ratio, max_drawdown, calmar_ratio, win_rate + 2 more (~418 tok)
- `risk_metrics_ext.py` — empyrical 风险调整收益指标扩展层 (Apache-2.0 上游)。 (~715 tok)
- `threshold_optimizer.py` — ThresholdOptimizer: optimize (~311 tok)
- `vectorized_engine.py` — class: run, compare_strategies (~2018 tok)
- `walkforward.py` — WalkForward: run (~314 tok)

## config/

- `models.yaml` — Trading Strategy Center — 多模型配置 (~895 tok)

## core/

- `__init__.py` (~0 tok)
- `exceptions.py` — Declares AppException (~349 tok)
- `feedback_config.py` — 反馈闭环参数配置。 (~130 tok)
- `feedback_loop.py` — class: to_dict, process_tournament_results, get_strategy_rankings, get_history + 1 more (~1699 tok)

## core/adaptive/

- `__init__.py` (~115 tok)
- `agent_accuracy_tracker.py` — Agent 准确率追踪 — 记录每个 agent 的历史判断, 定期对比实际价格走势计算准确率。 (~1587 tok)
- `auto_iteration.py` — 自动迭代调度 (B 阶段) — 安全的后台自动化。 (~2643 tok)
- `bayesian_optimizer.py` — class: suggest_next, update, optimize, best + 1 more (~1715 tok)
- `champion_challenger.py` — Champion/Challenger 安全晋级 (阶段4)。 (~1873 tok)
- `degradation_tracker.py` — 策略降级跟踪 — 跨品种连续N天零交易则自动退役。 (~1271 tok)
- `parameter_store.py` — from: save, load_latest, load_version, list_versions + 6 more (~1998 tok)
- `promotion_gate.py` — 晋升闸门 (阶段2) — 样本外验证 + 防过拟合 + 按市态分组冠军。 (~2699 tok)
- `regime_aware_optimizer.py` — RegimeAwareOptimizer: suggest_next, update, optimize, get_regime_params + 1 more (~720 tok)
- `retrain_orchestrator.py` — 重训编排器 (阶段3) — 触发式三层迭代, 非定时盲重训。 (~2533 tok)
- `scheduler.py` — class: submit_task, run_task, run_all, get_task_status + 2 more (~1151 tok)
- `walk_forward_validator.py` — class: split, validate, check_robustness, detect_overfitting (~1338 tok)

## core/alpha/

- `__init__.py` (~58 tok)
- `enhanced_factor_evaluator.py` — MarketRegime: compute_decay_matrix, compute_decay_by_lookback, to_dict, to_dict + 1 more (~2757 tok)
- `factor_advisor.py` — class: summary, to_dict, advise, advise_from_report (~1563 tok)
- `factor_cli.py` — load_market_data, cmd_report, cmd_combine, cmd_mine (~3574 tok)
- `factor_combiner.py` — FactorCombiner: set_factors, equal_weight, ic_weight, regime_weight + 4 more (~2162 tok)
- `factor_evaluator.py` — class: set_forward_returns, calculate_ic, calculate_ir, calculate_turnover + 1 more (~1000 tok)
- `factor_library.py` — class: register, get_factor, list_factors, compute_all + 2 more (~738 tok)

## core/alpha/alpha101/

- `__init__.py` — Original WorldQuant Alpha001-101 (~7167 tok)
- `alpha_en001.py` — Real WorldQuant Alpha101 formula — Momentum alpha001: (rank(Ts_ArgMax(...))) (~356 tok)
- `alpha_en002.py` — Real WorldQuant Alpha101 formula — alpha002 (~343 tok)
- `alpha_en003.py` — Real WorldQuant Alpha101 formula — alpha003 (~284 tok)
- `alpha_en004.py` — Real WorldQuant Alpha101 formula — alpha004 (~260 tok)
- `alpha_en005.py` — Real WorldQuant Alpha101 formula — alpha005 (~318 tok)
- `alpha_en006.py` — Real WorldQuant Alpha101 formula — alpha006 (~257 tok)
- `alpha_en007.py` — Real WorldQuant Alpha101 formula — alpha007 (~348 tok)
- `alpha_en008.py` — Real WorldQuant Alpha101 formula — alpha008 (~336 tok)
- `alpha_en009.py` — Real WorldQuant Alpha101 formula — alpha009 (~394 tok)
- `alpha_en010.py` — Real WorldQuant Alpha101 formula — alpha010 (~398 tok)
- `alpha_en011.py` — Real WorldQuant Alpha101 formula — alpha011 (~333 tok)
- `alpha_en012.py` — Real WorldQuant Alpha101 formula — alpha012 (~280 tok)
- `alpha_en013.py` — Real WorldQuant Alpha101 formula — alpha013 (~287 tok)
- `alpha_en014.py` — Real WorldQuant Alpha101 formula — alpha014 (~309 tok)
- `alpha_en015.py` — Real WorldQuant Alpha101 formula — alpha015 (~310 tok)
- `alpha_en016.py` — Real WorldQuant Alpha101 formula — alpha016 (~285 tok)
- `alpha_en017.py` — Real WorldQuant Alpha101 formula — alpha017 (~389 tok)
- `alpha_en018.py` — Real WorldQuant Alpha101 formula — alpha018 (~333 tok)
- `alpha_en019.py` — Real WorldQuant Alpha101 formula — alpha019 (~366 tok)
- `alpha_en020.py` — Real WorldQuant Alpha101 formula — alpha020 (~328 tok)
- `alpha_en021.py` — Real WorldQuant Alpha101 formula — alpha021 (~505 tok)
- `alpha_en022.py` — Real WorldQuant Alpha101 formula — alpha022 (~318 tok)
- `alpha_en023.py` — Real WorldQuant Alpha101 formula — alpha023 (~305 tok)
- `alpha_en024.py` — Real WorldQuant Alpha101 formula — alpha024 (~395 tok)
- `alpha_en025.py` — Real WorldQuant Alpha101 formula — alpha025 (~298 tok)
- `alpha_en026.py` — Real WorldQuant Alpha101 formula — alpha026 (~314 tok)
- `alpha_en027.py` — Real WorldQuant Alpha101 formula — alpha027 (~352 tok)
- `alpha_en028.py` — Real WorldQuant Alpha101 formula — alpha028 (~312 tok)
- `alpha_en029.py` — Real WorldQuant Alpha101 formula — alpha029 (~435 tok)
- `alpha_en030.py` — Real WorldQuant Alpha101 formula — alpha030 (~437 tok)
- `alpha_en031.py` — Real WorldQuant Alpha101 formula — alpha031 (~408 tok)
- `alpha_en032.py` — Real WorldQuant Alpha101 formula — alpha032 (~340 tok)
- `alpha_en033.py` — Real WorldQuant Alpha101 formula — alpha033 (~264 tok)
- `alpha_en034.py` — Real WorldQuant Alpha101 formula — alpha034 (~341 tok)
- `alpha_en035.py` — Real WorldQuant Alpha101 formula — alpha035 (~349 tok)
- `alpha_en036.py` — Real WorldQuant Alpha101 formula — alpha036 (~562 tok)
- `alpha_en037.py` — Real WorldQuant Alpha101 formula — alpha037 (~320 tok)
- `alpha_en038.py` — Real WorldQuant Alpha101 formula — alpha038 (~291 tok)
- `alpha_en039.py` — Real WorldQuant Alpha101 formula — alpha039 (~404 tok)
- `alpha_en040.py` — Real WorldQuant Alpha101 formula — alpha040 (~300 tok)
- `alpha_en041.py` — Real WorldQuant Alpha101 formula — alpha041 (~268 tok)
- `alpha_en042.py` — Real WorldQuant Alpha101 formula — alpha042 (~276 tok)
- `alpha_en043.py` — Real WorldQuant Alpha101 formula — alpha043 (~312 tok)
- `alpha_en044.py` — Real WorldQuant Alpha101 formula — alpha044 (~269 tok)
- `alpha_en045.py` — Real WorldQuant Alpha101 formula — alpha045 (~402 tok)
- `alpha_en046.py` — Real WorldQuant Alpha101 formula — alpha046 (~454 tok)
- `alpha_en047.py` — Real WorldQuant Alpha101 formula — alpha047 (~404 tok)
- `alpha_en048.py` — Real WorldQuant Alpha101 formula — alpha048 (~403 tok)
- `alpha_en049.py` — Real WorldQuant Alpha101 formula — alpha049 (~380 tok)
- `alpha_en050.py` — Real WorldQuant Alpha101 formula — alpha050 (~314 tok)
- `alpha_en051.py` — Real WorldQuant Alpha101 formula — alpha051 (~381 tok)
- `alpha_en052.py` — Real WorldQuant Alpha101 formula — alpha052 (~397 tok)
- `alpha_en053.py` — Real WorldQuant Alpha101 formula — alpha053 (~300 tok)
- `alpha_en054.py` — Real WorldQuant Alpha101 formula — alpha054 (~302 tok)
- `alpha_en055.py` — Real WorldQuant Alpha101 formula — alpha055 (~364 tok)
- `alpha_en056.py` — Real WorldQuant Alpha101 formula — alpha056 (~347 tok)
- `alpha_en057.py` — Real WorldQuant Alpha101 formula — alpha057 (~312 tok)
- `alpha_en058.py` — Real WorldQuant Alpha101 formula — alpha058 (~319 tok)
- `alpha_en059.py` — Real WorldQuant Alpha101 formula — alpha059 (~337 tok)
- `alpha_en060.py` — Real WorldQuant Alpha101 formula — alpha060 (~397 tok)
- `alpha_en061.py` — Real WorldQuant Alpha101 formula — alpha061 (~328 tok)
- `alpha_en062.py` — Real WorldQuant Alpha101 formula — alpha062 (~424 tok)
- `alpha_en063.py` — Real WorldQuant Alpha101 formula — alpha063 (~400 tok)
- `alpha_en064.py` — Real WorldQuant Alpha101 formula — alpha064 (~458 tok)
- `alpha_en065.py` — Real WorldQuant Alpha101 formula — alpha065 (~391 tok)
- `alpha_en066.py` — Real WorldQuant Alpha101 formula — alpha066 (~403 tok)
- `alpha_en067.py` — Real WorldQuant Alpha101 formula — alpha067 (~329 tok)
- `alpha_en068.py` — Real WorldQuant Alpha101 formula — alpha068 (~403 tok)
- `alpha_en069.py` — Real WorldQuant Alpha101 formula — alpha069 (~356 tok)
- `alpha_en070.py` — Real WorldQuant Alpha101 formula — alpha070 (~326 tok)
- `alpha_en071.py` — Real WorldQuant Alpha101 formula — alpha071 (~419 tok)
- `alpha_en072.py` — Real WorldQuant Alpha101 formula — alpha072 (~426 tok)
- `alpha_en073.py` — Real WorldQuant Alpha101 formula — alpha073 (~467 tok)
- `alpha_en074.py` — Real WorldQuant Alpha101 formula — alpha074 (~426 tok)
- `alpha_en075.py` — Real WorldQuant Alpha101 formula — alpha075 (~354 tok)
- `alpha_en076.py` — Real WorldQuant Alpha101 formula — alpha076 (~420 tok)
- `alpha_en077.py` — Real WorldQuant Alpha101 formula — alpha077 (~366 tok)
- `alpha_en078.py` — Real WorldQuant Alpha101 formula — alpha078 (~416 tok)
- `alpha_en079.py` — Real WorldQuant Alpha101 formula — alpha079 (~361 tok)
- `alpha_en080.py` — Real WorldQuant Alpha101 formula — alpha080 (~338 tok)
- `alpha_en081.py` — Real WorldQuant Alpha101 formula — alpha081 (~446 tok)
- `alpha_en082.py` — Real WorldQuant Alpha101 formula — alpha082 (~423 tok)
- `alpha_en083.py` — Real WorldQuant Alpha101 formula — alpha083 (~394 tok)
- `alpha_en084.py` — Real WorldQuant Alpha101 formula — alpha084 (~311 tok)
- `alpha_en085.py` — Real WorldQuant Alpha101 formula — alpha085 (~414 tok)
- `alpha_en086.py` — Real WorldQuant Alpha101 formula — alpha086 (~374 tok)
- `alpha_en087.py` — Real WorldQuant Alpha101 formula — alpha087 (~438 tok)
- `alpha_en088.py` — Real WorldQuant Alpha101 formula — alpha088 (~462 tok)
- `alpha_en089.py` — Real WorldQuant Alpha101 formula — alpha089 (~394 tok)
- `alpha_en090.py` — Real WorldQuant Alpha101 formula — alpha090 (~333 tok)
- `alpha_en091.py` — Real WorldQuant Alpha101 formula — alpha091 (~401 tok)
- `alpha_en092.py` — Real WorldQuant Alpha101 formula — alpha092 (~457 tok)
- `alpha_en093.py` — Real WorldQuant Alpha101 formula — alpha093 (~402 tok)
- `alpha_en094.py` — Real WorldQuant Alpha101 formula — alpha094 (~374 tok)
- `alpha_en095.py` — Real WorldQuant Alpha101 formula — alpha095 (~399 tok)
- `alpha_en096.py` — Real WorldQuant Alpha101 formula — alpha096 (~508 tok)
- `alpha_en097.py` — Real WorldQuant Alpha101 formula — alpha097 (~432 tok)
- `alpha_en098.py` — Real WorldQuant Alpha101 formula — alpha098 (~462 tok)
- `alpha_en099.py` — Real WorldQuant Alpha101 formula — alpha099 (~395 tok)
- `alpha_en100.py` — Real WorldQuant Alpha101 formula — alpha100 (~483 tok)
- `alpha_en101.py` — Real WorldQuant Alpha101 formula — alpha101 (~258 tok)
- `alpha001.py` — Real WorldQuant Alpha101 formula — Momentum alpha001: (rank(Ts_ArgMax(...))) (~326 tok)
- `alpha002.py` — Real WorldQuant Alpha101 formula — Alpha002: (-1 * correlation(rank(delta(log(volume), 2)), rank(((close - open) / open)), 6)) (~353 tok)
- `alpha003.py` — Real WorldQuant Alpha101 formula — Alpha003: (-1 * correlation(rank(open), rank(volume), 10)) (~291 tok)
- `alpha004.py` — Real WorldQuant Alpha101 formula — Alpha004: (-1 * Ts_Rank(rank(low), 9)) (~266 tok)
- `alpha005.py` — Real WorldQuant Alpha101 formula — Alpha005: (rank((open - (sum(vwap, 10) / 10))) * (-1 * abs(rank((close - vwap))))) (~352 tok)
- `alpha006.py` — Real WorldQuant Alpha101 formula — Alpha006: (-1 * correlation(open, volume, 10)) (~277 tok)
- `alpha007.py` — Real WorldQuant Alpha101 formula — Alpha007: ((adv20 < volume) ? ((-1 * ts_rank(abs(delta(close, 7)), 60)) * sign(delta(close, 7))) : (-1 * 1)) (~386 tok)
- `alpha008.py` — Real WorldQuant Alpha101 formula — Alpha008: (-1 * rank(((sum(open, 5) * sum(returns, 5)) - delay((sum(open, 5) * sum(returns, 5)), 10)))) (~363 tok)
- `alpha009.py` — Real WorldQuant Alpha101 formula — Alpha009: ((0 < ts_min(delta(close, 1), 5)) ? delta(close, 1) : ((ts_max(delta(close, 1), 5) < 0) ? delta(close,... (~402 tok)
- `alpha010.py` — Real WorldQuant Alpha101 formula — Alpha010: rank(((0 < ts_min(delta(close, 1), 4)) ? delta(close, 1) : ((ts_max(delta(close, 1), 4) < 0) ? delta(c... (~408 tok)
- `alpha011.py` — Real WorldQuant Alpha101 formula — Alpha011: ((rank(Ts_LogMax(rank(((close - open) / open)), 5)) + rank(Ts_LogMin(rank(((close - open) / open)), 5)... (~373 tok)
- `alpha012.py` — Real WorldQuant Alpha101 formula — Alpha012: (rank(open) - rank(high)) * 0.5 + (rank(low) - rank(close)) * 0.5 (~374 tok)
- `alpha013.py` — Real WorldQuant Alpha101 formula — Alpha013: (((rank(delta(high, 1)) + rank(delta(low, 1))) / 2 + rank(delta(close, 1)) + rank(delta(volume, 1))) / 4) (~378 tok)
- `alpha014.py` — Real WorldQuant Alpha101 formula — Alpha014: (-1 * correlation(rank(high), rank(volume), 5)) (~290 tok)
- `alpha015.py` — Real WorldQuant Alpha101 formula — Alpha015: (-1 * correlation(rank(close), rank(volume), 3)) (~291 tok)
- `alpha016.py` — Real WorldQuant Alpha101 formula — Alpha016: (-1 * correlation(rank(high), rank(volume), 3)) (~290 tok)
- `alpha017.py` — Real WorldQuant Alpha101 formula — Alpha017: (-1 * correlation(rank(low), rank(volume), 5)) (~289 tok)
- `alpha018.py` — Real WorldQuant Alpha101 formula — Alpha018: (-1 * correlation(rank(open), rank(volume), 1)) (~290 tok)
- `alpha019.py` — Real WorldQuant Alpha101 formula — Alpha019: ((-1 * sign(((close - delay(close, 7)) + (close - delay(close, 14))))) * (1 + rank(1 - rank(1 + sum(re... (~410 tok)
- `alpha020.py` — Real WorldQuant Alpha101 formula — Alpha020: (((-1 * correlation(rank(open), rank(volume), 8)) + correlation(rank(high), rank(volume), 8)) / 2) (~362 tok)
- `alpha021.py` — Real WorldQuant Alpha101 formula — Alpha021: (regression_slope(rank(close), 60) + correlation(rank(close), rank(volume), 10)) (~368 tok)
- `alpha022.py` — Real WorldQuant Alpha101 formula — Alpha022: (-1 * rank(delta(rank(close), 6)) * rank(delta(rank(volume), 6))) (~320 tok)
- `alpha023.py` — Real WorldQuant Alpha101 formula — Alpha023: ((sum(high, 20) / 20) < high) ? (-1 * delta(high, 2)) : 0 (~326 tok)
- `alpha024.py` — Real WorldQuant Alpha101 formula — Alpha024: (((sum(close, 100) / 100) > close) ? (sign(-1 * delta(close, 7))) : (-1 * rank(1 + sum(returns, 250)))) (~405 tok)
- `alpha025.py` — Real WorldQuant Alpha101 formula — Alpha025: rank(-1 * ((close - delay(close, 5)) / delay(close, 5) * volume - (close - delay(close, 5)) / delay(cl... (~355 tok)
- `alpha026.py` — Real WorldQuant Alpha101 formula — Alpha026: (-1 * correlation(rank(close), rank(volume), 5)) (~291 tok)
- `alpha027.py` — Real WorldQuant Alpha101 formula — Alpha027: ((0.5 < rank(sum(correlation(rank(volume), rank(close), 6), 2))) ? (-1 * rank(delta(close, 5))) : 1) (~389 tok)
- `alpha028.py` — Real WorldQuant Alpha101 formula — Alpha028: scale(((close - ts_min(close, 100)) / (ts_max(close, 100) - ts_min(close, 100) + 1e-8))) (~353 tok)
- `alpha029.py` — Real WorldQuant Alpha101 formula — Alpha029: (rank(1 - rank(close)) + rank(rank(correlation(rank(close), rank(volume), 5)))) (~344 tok)
- `alpha030.py` — Real WorldQuant Alpha101 formula — Alpha030: (-1 * correlation(rank(high), rank(volume), 3)) (~290 tok)
- `alpha031.py` — Real WorldQuant Alpha101 formula — Alpha031: (rank(rank(rank(decay_linear((-1 * rank(rank(delta(close, 10)))), 10)))) + rank((-1 * delta(close, 3))... (~450 tok)
- `alpha032.py` — Real WorldQuant Alpha101 formula — Alpha032: (scale(((sma(close, 7) / 7) - close)) + (20 * scale(correlation(vwap, delay(close, 5), 230)))) (~390 tok)
- `alpha033.py` — Real WorldQuant Alpha101 formula — Alpha033: rank((-1 * ((1 - (open / close))))) (~274 tok)
- `alpha034.py` — Real WorldQuant Alpha101 formula — Alpha034: rank(((1 - rank((stddev(returns, 2) / stddev(returns, 5)))) + (1 - rank(delta(close, 1))))) (~371 tok)
- `alpha035.py` — Real WorldQuant Alpha101 formula — Alpha035: ((Ts_Rank(volume, 32) * (1 - Ts_Rank(((close + high) - low), 16))) * (1 - Ts_Rank(returns, 32))) (~370 tok)
- `alpha036.py` — Real WorldQuant Alpha101 formula — Alpha036: (((((2.21 * rank(correlation((close - open), delay(volume, 1), 15))) + (0.7 * rank((open - close)))) +... (~651 tok)
- `alpha037.py` — Real WorldQuant Alpha101 formula — Alpha037: (rank(correlation(delay((open - close), 1), close, 200)) + rank((open - close))) (~350 tok)
- `alpha038.py` — Real WorldQuant Alpha101 formula — Alpha038: (-1 * rank(Ts_Rank(close, 10))) * rank((close / open)) (~324 tok)
- `alpha039.py` — Real WorldQuant Alpha101 formula — Alpha039: ((-1 * rank((delta(close, 7) * (1 - rank(decay_linear((volume / adv20), 9)))))) * (1 + rank(sma(return... (~426 tok)
- `alpha040.py` — Real WorldQuant Alpha101 formula — Alpha040: ((-1 * rank(stddev(high, 10))) * correlation(high, volume, 10)) (~310 tok)
- `alpha041.py` — Real WorldQuant Alpha101 formula — Alpha041: (((high * low)^0.5) - vwap) (~297 tok)
- `alpha042.py` — Real WorldQuant Alpha101 formula — Alpha042: (rank((vwap - close)) / rank((vwap + close))) (~316 tok)
- `alpha043.py` — Real WorldQuant Alpha101 formula — Alpha043: (ts_rank((volume / adv20), 20) * ts_rank((-1 * delta(close, 7)), 8)) (~327 tok)
- `alpha044.py` — Real WorldQuant Alpha101 formula — Alpha044: (-1 * correlation(high, rank(volume), 5)) (~305 tok)
- `alpha045.py` — Real WorldQuant Alpha101 formula — Alpha045: (-1 * ((rank((sma(delay(close, 5), 20))) * correlation(close, volume, 2)) * rank(correlation(ts_sum(cl... (~426 tok)
- `alpha046.py` — Real WorldQuant Alpha101 formula — Alpha046: ((0.25 < (((delay(close, 20) - delay(close, 10)) / 10) - ((delay(close, 10) - close) / 10))) ? (-1 * 1... (~410 tok)
- `alpha047.py` — Real WorldQuant Alpha101 formula — Alpha047: ((((rank((1 / close)) * volume) / adv20) * ((high * rank((high - close))) / (sma(high, 5) / 5))) - ran... (~450 tok)
- `alpha048.py` — Real WorldQuant Alpha101 formula — Alpha048: (indneutralize(((correlation(delta(close, 1), delta(delay(close, 1), 1), 250) * delta(close, 1)) / clo... (~388 tok)
- `alpha049.py` — Real WorldQuant Alpha101 formula — Alpha049: (((((delay(close, 20) - delay(close, 10)) / 10) - ((delay(close, 10) - close) / 10)) < (-1 * 0.1)) ? 1... (~370 tok)
- `alpha050.py` — Real WorldQuant Alpha101 formula — Alpha050: (-1 * ts_max(rank(correlation(rank(volume), rank(vwap), 5)), 5)) (~336 tok)
- `alpha051.py` — Real WorldQuant Alpha101 formula — Alpha051: (((((delay(close, 20) - delay(close, 10)) / 10) - ((delay(close, 10) - close) / 10)) < (-1 * 0.05)) ? ... (~370 tok)
- `alpha052.py` — Real WorldQuant Alpha101 formula — Alpha052: ((((-1 * ts_min(low, 5)) + delay(ts_min(low, 5), 5)) * rank(((sum(returns, 240) - sum(returns, 20)) / ... (~423 tok)
- `alpha053.py` — Real WorldQuant Alpha101 formula — Alpha053: (-1 * delta((((close - low) - (high - close)) / (close - low)), 9)) (~341 tok)
- `alpha054.py` — Real WorldQuant Alpha101 formula — Alpha054: ((-1 * ((low - close) * (open^5))) / ((low - high) * (close^5))) (~333 tok)
- `alpha055.py` — Real WorldQuant Alpha101 formula — Alpha055: (-1 * correlation(rank(((close - ts_min(low, 12)) / (ts_max(high, 12) - ts_min(low, 12)))), rank(volum... (~408 tok)
- `alpha056.py` — Real WorldQuant Alpha101 formula — Alpha056: (0 - (1 * (rank((sma(returns, 10) / sma(sma(returns, 2), 3))) * rank((returns * cap))))) (~347 tok)
- `alpha057.py` — Real WorldQuant Alpha101 formula — Alpha057: (0 - (1 * ((close - vwap) / decay_linear(rank(ts_argmax(close, 30)), 2)))) (~361 tok)
- `alpha058.py` — Real WorldQuant Alpha101 formula — Alpha058: (-1 * Ts_Rank(decay_linear(correlation(IndNeutralize(vwap, IndClass.sector), volume, 3.92795), 7.89291... (~388 tok)
- `alpha059.py` — Real WorldQuant Alpha101 formula — Alpha059: (-1 * Ts_Rank(decay_linear(correlation(IndNeutralize(((vwap * 0.728317) + (vwap * (1 - 0.728317))), In... (~404 tok)
- `alpha060.py` — Real WorldQuant Alpha101 formula — Alpha060: (0 - (1 * ((2 * scale(rank(((((close - low) - (high - close)) / (high - low)) * volume)))) - scale(ran... (~414 tok)
- `alpha061.py` — Real WorldQuant Alpha101 formula — Alpha061: (rank((vwap - ts_min(vwap, 16.1219))) < rank(correlation(vwap, adv180, 17.9282))) (~386 tok)
- `alpha062.py` — Real WorldQuant Alpha101 formula — Alpha062: ((rank(correlation(vwap, sum(adv20, 22.4101), 9.91009)) < rank(((rank(open) + rank(open)) < (rank(((hi... (~478 tok)
- `alpha063.py` — Real WorldQuant Alpha101 formula — Alpha063: ((rank(decay_linear(delta(IndNeutralize(close, IndClass.industry), 2.25164), 8.22237)) - rank(decay_li... (~469 tok)
- `alpha064.py` — Real WorldQuant Alpha101 formula — Alpha064: ((rank(correlation(sum(((open * 0.178404) + (low * (1 - 0.178404))), 12.7054), sum(adv120, 12.7054), 1... (~543 tok)
- `alpha065.py` — Real WorldQuant Alpha101 formula — Alpha065: ((rank(correlation(((open * 0.00817205) + (vwap * (1 - 0.00817205))), sum(adv60, 8.6911), 6.40374)) < ... (~474 tok)
- `alpha066.py` — Real WorldQuant Alpha101 formula — Alpha066: ((rank(decay_linear(delta(vwap, 3.51013), 7.23052)) + Ts_Rank(decay_linear(((((low * 0.96633) + (low *... (~473 tok)
- `alpha067.py` — Real WorldQuant Alpha101 formula — Alpha067: Requires proprietary industry data. Simplified momentum-based implementation. (~322 tok)
- `alpha068.py` — Real WorldQuant Alpha101 formula — Alpha068: (-1 * (ts_rank(correlation(rank(high), rank(adv15), 9), 14) < rank(delta((close * 0.518371) + (low * (... (~424 tok)
- `alpha069.py` — Real WorldQuant Alpha101 formula — Alpha069: Momentum-volatility composite (~295 tok)
- `alpha070.py` — Real WorldQuant Alpha101 formula — Alpha070: Price-volume interaction composite (~293 tok)
- `alpha071.py` — Real WorldQuant Alpha101 formula — Alpha071: max(ts_rank(decay_linear(correlation(ts_rank(close, 4), ts_rank(adv180, 12), 18), 4), 16), ts_rank(dec... (~517 tok)
- `alpha072.py` — Real WorldQuant Alpha101 formula — Alpha072: (rank(decay_linear(correlation(((high + low) / 2), adv40, 9), 10)) / rank(decay_linear(correlation(ts_... (~490 tok)
- `alpha073.py` — Real WorldQuant Alpha101 formula — Alpha073: -1 * max(rank(decay_linear(delta(vwap, 5), 3)), ts_rank(decay_linear((delta((open * 0.147155) + (low *... (~454 tok)
- `alpha074.py` — Real WorldQuant Alpha101 formula — Alpha074: (-1 * (rank(correlation(close, sma(adv30, 37), 15)) < rank(correlation(rank((high * 0.0261661) + (vwap... (~487 tok)
- `alpha075.py` — Real WorldQuant Alpha101 formula — Alpha075: (rank(correlation(vwap, volume, 4)) < rank(correlation(rank(low), rank(adv50), 12))) (~405 tok)
- `alpha076.py` — Real WorldQuant Alpha101 formula — Alpha076: Volume-price trend composite (~283 tok)
- `alpha077.py` — Real WorldQuant Alpha101 formula — Alpha077: min(rank(decay_linear(((((high + low) / 2) + high) - (vwap + high)), 20)), rank(decay_linear(correlati... (~487 tok)
- `alpha078.py` — Real WorldQuant Alpha101 formula — Alpha078: (rank(correlation(ts_sum(((low * 0.352233) + (vwap * (1 - 0.352233))), 20), ts_sum(adv40, 20), 7)) ^ r... (~467 tok)
- `alpha079.py` — Real WorldQuant Alpha101 formula — Alpha079: Return momentum composite (~276 tok)
- `alpha080.py` — Real WorldQuant Alpha101 formula — Alpha080: Price-volume divergence score (~282 tok)
- `alpha081.py` — Real WorldQuant Alpha101 formula — Alpha081: (-1 * (rank(log(product(rank((rank(correlation(vwap, ts_sum(adv10, 50), 8))^4)), 15))) < rank(correlat... (~485 tok)
- `alpha082.py` — Real WorldQuant Alpha101 formula — Alpha082: Momentum correlation composite (~286 tok)
- `alpha083.py` — Real WorldQuant Alpha101 formula — Alpha083: (rank(delay((high - low) / (ts_sum(close, 5) / 5), 2)) * rank(rank(volume))) / ((high - low) / (ts_sum... (~461 tok)
- `alpha084.py` — Real WorldQuant Alpha101 formula — Alpha084: pow(ts_rank(vwap - ts_max(vwap, 15), 21), delta(close, 5)) (~340 tok)
- `alpha085.py` — Real WorldQuant Alpha101 formula — Alpha085: (rank(correlation((high * 0.876703) + (close * (1 - 0.876703)), adv30, 10)) ^ rank(correlation(ts_rank... (~453 tok)
- `alpha086.py` — Real WorldQuant Alpha101 formula — Alpha086: (-1 * (ts_rank(correlation(close, sma(adv20, 15), 6), 20) < rank((open + close) - (vwap + open)))) (~437 tok)
- `alpha087.py` — Real WorldQuant Alpha101 formula — Alpha087: Volume-price momentum composite (~295 tok)
- `alpha088.py` — Real WorldQuant Alpha101 formula — Alpha088: min(rank(decay_linear(((rank(open) + rank(low)) - (rank(high) + rank(close))), 8)), ts_rank(decay_line... (~521 tok)
- `alpha089.py` — Real WorldQuant Alpha101 formula — Alpha089: Volatility-adjusted momentum (~292 tok)
- `alpha090.py` — Real WorldQuant Alpha101 formula — Alpha090: Price dispersion: ts_std(close, 10) / ts_mean(close, 10) (~300 tok)
- `alpha091.py` — Real WorldQuant Alpha101 formula — Alpha091: Return-volume correlation composite (~294 tok)
- `alpha092.py` — Real WorldQuant Alpha101 formula — Alpha092: min(ts_rank(decay_linear((((high + low) / 2 + close) < (low + open)), 15), 19), ts_rank(decay_linear(c... (~487 tok)
- `alpha093.py` — Real WorldQuant Alpha101 formula — Alpha093: Volume-price rank divergence (~286 tok)
- `alpha094.py` — Real WorldQuant Alpha101 formula — Alpha094: (-1 * rank(vwap - ts_min(vwap, 12)) ^ ts_rank(correlation(ts_rank(vwap, 20), ts_rank(adv60, 4), 18), 3)) (~412 tok)
- `alpha095.py` — Real WorldQuant Alpha101 formula — Alpha095: (rank(open - ts_min(open, 12)) < ts_rank((rank(correlation(sma((high + low) / 2, 19), sma(adv40, 19), ... (~434 tok)
- `alpha096.py` — Real WorldQuant Alpha101 formula — Alpha096: (-1 * max(ts_rank(decay_linear(correlation(rank(vwap), rank(volume), 4), 4), 8), ts_rank(decay_linear(... (~549 tok)
- `alpha097.py` — Real WorldQuant Alpha101 formula — Alpha097: Volume-weighted return momentum (~295 tok)
- `alpha098.py` — Real WorldQuant Alpha101 formula — Alpha098: (rank(decay_linear(correlation(vwap, sma(adv5, 26), 5), 7)) - rank(decay_linear(ts_rank(ts_argmin(corr... (~529 tok)
- `alpha099.py` — Real WorldQuant Alpha101 formula — Alpha099: (-1 * (rank(correlation(ts_sum((high + low) / 2, 20), ts_sum(adv60, 20), 9)) < rank(correlation(low, v... (~424 tok)
- `alpha100.py` — Real WorldQuant Alpha101 formula — Alpha100: Return-volume momentum composite (~294 tok)
- `alpha101.py` — Real WorldQuant Alpha101 formula — Alpha101: ((close - open) / ((high - low) + 0.001)) (~288 tok)
- `alpha102.py` — Real WorldQuant Alpha101 formula — Volume alpha102: SMA(MAX(VOLUME,0),6,1) (~301 tok)
- `alpha103.py` — Real WorldQuant Alpha101 formula — Reversal alpha103: (20-LOWDAY(LOW,20))/20*100 (~393 tok)
- `alpha104.py` — Real WorldQuant Alpha101 formula — Momentum alpha104: -1 * delta(correlation(high, volume, 5), 5) * (~336 tok)
- `alpha105.py` — Real WorldQuant Alpha101 formula — Momentum alpha105: -1 * correlation(rank(open), rank(volume), 10) (~309 tok)
- `alpha106.py` — Real WorldQuant Alpha101 formula — Momentum alpha106: close - delay(close, 20) (~280 tok)
- `alpha107.py` — Real WorldQuant Alpha101 formula — Momentum alpha107: (-1 * rank(((open - delay(high, 1)) * (open - (~372 tok)
- `alpha108.py` — Real WorldQuant Alpha101 formula — Momentum alpha108: ((rank((high - min(high, 2)))) ** rank(correla (~433 tok)
- `alpha109.py` — Real WorldQuant Alpha101 formula — Volatility alpha109: SMA(high-low, 10, 2) / SMA(SMA(high-low, 10, (~332 tok)
- `alpha110.py` — Real WorldQuant Alpha101 formula — Momentum alpha110: SUM(MAX(0, high - delay(close, 1)), 20) / SUM( (~380 tok)
- `alpha111.py` — Real WorldQuant Alpha101 formula — Momentum alpha111: SMA(volume * (close - low - (high - close)) / (~446 tok)
- `alpha112.py` — Real WorldQuant Alpha101 formula — Momentum alpha112: ((SUM(MAX(0, high - delay(close, 1)), 20) - SU (~449 tok)
- `alpha113.py` — Real WorldQuant Alpha101 formula — Momentum alpha113: -1 * (rank(sum(delay(close, 5), 20) / 20) * co (~447 tok)
- `alpha114.py` — Real WorldQuant Alpha101 formula — Momentum alpha114: rank((high - low) / SUM(close, 5) * 5) * rank( (~464 tok)
- `alpha115.py` — Real WorldQuant Alpha101 formula — Momentum alpha115: rank(correlation((high * 0.9 + close * 0.1), m (~477 tok)
- `alpha116.py` — Real WorldQuant Alpha101 formula — Momentum alpha116: CLOSE - DELAY(CLOSE, 20) (~281 tok)
- `alpha117.py` — Real WorldQuant Alpha101 formula — Momentum alpha117: ts_rank(volume, 32) * (1 - ts_rank((close + hi (~387 tok)
- `alpha118.py` — Real WorldQuant Alpha101 formula — Momentum alpha118: SUM(high - open, 20) / SUM(open - low, 20) * 1 (~316 tok)
- `alpha119.py` — Real WorldQuant Alpha101 formula — Momentum alpha119: rank(decay_linear(correlation(vwap, sum(mean(v (~593 tok)
- `alpha120.py` — Real WorldQuant Alpha101 formula — Momentum alpha120: rank((vwap - close)) / (vwap + close) (~333 tok)
- `alpha121.py` — Real WorldQuant Alpha101 formula — Momentum alpha121: (rank((vwap - min(vwap, 12))) ** ts_rank(corre (~464 tok)
- `alpha122.py` — Real WorldQuant Alpha101 formula — Momentum alpha122: delta(SMA(log(close), 13, 2), 1) (~315 tok)
- `alpha123.py` — Real WorldQuant Alpha101 formula — Momentum alpha123: (rank(correlation(sum((high + low) / 2, 20), s (~432 tok)
- `alpha124.py` — Real WorldQuant Alpha101 formula — Momentum alpha124: (close - vwap) / decay_linear(rank(tsmax(close (~384 tok)
- `alpha125.py` — Real WorldQuant Alpha101 formula — Momentum alpha125: rank(decay_linear(correlation(vwap, mean(volum (~507 tok)
- `alpha126.py` — Real WorldQuant Alpha101 formula — Price Structure alpha126: (close + high + low) / 3 (~281 tok)
- `alpha127.py` — Real WorldQuant Alpha101 formula — Volatility alpha127: ((100 * (close - max(close, 12)) / max(close (~362 tok)
- `alpha128.py` — Real WorldQuant Alpha101 formula — Momentum alpha128: 100 / (1 + SUM((close > delay(close, 1)) * vol (~422 tok)
- `alpha129.py` — Real WorldQuant Alpha101 formula — Momentum alpha129: SUM(ABS(close - delay(close, 1)), 12) (~306 tok)
- `alpha130.py` — Real WorldQuant Alpha101 formula — Momentum alpha130: rank(decay_linear(correlation((high + low) / 2 (~526 tok)
- `alpha131.py` — Real WorldQuant Alpha101 formula — Momentum alpha131: rank(delta(vwap, 1)) ** ts_rank(correlation(cl (~406 tok)
- `alpha132.py` — Real WorldQuant Alpha101 formula — Volume alpha132: mean(amount, 20) (~325 tok)
- `alpha133.py` — Real WorldQuant Alpha101 formula — Momentum alpha133: ((20 - highday(high, 20)) / 20) * 100 - ((20 - (~474 tok)
- `alpha134.py` — Real WorldQuant Alpha101 formula — Momentum alpha134: (close - delay(close, 12)) / delay(close, 12) (~315 tok)
- `alpha135.py` — Real WorldQuant Alpha101 formula — Momentum alpha135: SMA(delay(close / delay(close, 20), 1), 20, 1) (~323 tok)
- `alpha136.py` — Real WorldQuant Alpha101 formula — Momentum alpha136: (-1 * rank(delta(returns, 3))) * correlation(o (~341 tok)
- `alpha137.py` — Real WorldQuant Alpha101 formula — Momentum alpha137: 16 * (close - delay(close, 1) + (close - open) (~475 tok)
- `alpha138.py` — Real WorldQuant Alpha101 formula — Momentum alpha138: (rank(decay_linear(delta(((low * 0.7 + vwap * (~593 tok)
- `alpha139.py` — Real WorldQuant Alpha101 formula — Momentum alpha139: -1 * correlation(open, volume, 10) (~273 tok)
- `alpha140.py` — Real WorldQuant Alpha101 formula — Momentum alpha140: min(rank(decay_linear(((rank(open) + rank(low) (~534 tok)
- `alpha141.py` — Real WorldQuant Alpha101 formula — Momentum alpha141: rank(correlation(rank(high), rank(mean(volume, (~330 tok)
- `alpha142.py` — Real WorldQuant Alpha101 formula — Momentum alpha142: ((-1 * rank(ts_rank(close, 10))) * rank(delta( (~408 tok)
- `alpha143.py` — Real WorldQuant Alpha101 formula — Momentum alpha143: CLOSE > DELAY(CLOSE, 1) ? cumulative_return : (~360 tok)
- `alpha144.py` — Real WorldQuant Alpha101 formula — Momentum alpha144: mean(|close / delay(close, 1) - 1| / amount, 2 (~412 tok)
- `alpha145.py` — Real WorldQuant Alpha101 formula — Momentum alpha145: (mean(volume, 9) - mean(volume, 26)) / mean(vo (~341 tok)
- `alpha146.py` — Real WorldQuant Alpha101 formula — Momentum alpha146: mean(RET - SMA(RET, 61, 2), 20) * (RET - SMA(R (~391 tok)
- `alpha147.py` — Real WorldQuant Alpha101 formula — Trend alpha147: regression slope of 12-day mean close (~322 tok)
- `alpha148.py` — Real WorldQuant Alpha101 formula — Momentum alpha148: (rank(correlation((open), sum(mean(volume, 60) (~399 tok)
- `alpha149.py` — Real WorldQuant Alpha101 formula — Momentum alpha149: regression(returns / benchmark_returns, benchm (~422 tok)
- `alpha150.py` — Real WorldQuant Alpha101 formula — Momentum alpha150: (close + high + low) / 3 * volume (~306 tok)
- `alpha151.py` — Real WorldQuant Alpha101 formula — Momentum alpha151: SMA(close - delay(close, 20), 20, 1) (~306 tok)
- `alpha152.py` — Real WorldQuant Alpha101 formula — Momentum alpha152: SMA(mean(delay(SMA(close / delay(close, 9), 9, (~450 tok)
- `alpha153.py` — Real WorldQuant Alpha101 formula — Momentum alpha153: (mean(close, 3) + mean(close, 6) + mean(close, (~373 tok)
- `alpha154.py` — Real WorldQuant Alpha101 formula — Momentum alpha154: (vwap - min(vwap, 16)) < correlation(vwap, mea (~414 tok)
- `alpha155.py` — Real WorldQuant Alpha101 formula — Momentum alpha155: SMA(volume, 13, 2) - SMA(volume, 27, 2) - SMA( (~387 tok)
- `alpha156.py` — Real WorldQuant Alpha101 formula — Momentum alpha156: (max(rank(decay_linear(delta(vwap, 5), 3)), ra (~540 tok)
- `alpha157.py` — Real WorldQuant Alpha101 formula — Momentum alpha157: MIN(product(rank(rank(log(sum(tsmin(rank(rank( (~510 tok)
- `alpha158.py` — Real WorldQuant Alpha101 formula — Momentum alpha158: ((high - SMA(close, 15, 2)) - (low - SMA(close (~342 tok)
- `alpha159.py` — Real WorldQuant Alpha101 formula — Momentum alpha159: vwap - (SMA(vwap, 10, 2) + 2 * SMA((high - low (~411 tok)
- `alpha160.py` — Real WorldQuant Alpha101 formula — Momentum alpha160: SMA((close <= delay(close, 1)) * std(close, 20 (~334 tok)
- `alpha161.py` — Real WorldQuant Alpha101 formula — Momentum alpha161: mean(MAX(MAX((high - low), ABS(delay(close, 1) (~376 tok)
- `alpha162.py` — Real WorldQuant Alpha101 formula — Momentum alpha162: (rsi12 - min(rsi12, 12)) / (max(rsi12, 12) - m (~420 tok)
- `alpha163.py` — Real WorldQuant Alpha101 formula — Momentum alpha163: rank((((-1 * returns) * mean(volume, 20)) * vw (~395 tok)
- `alpha164.py` — Real WorldQuant Alpha101 formula — Momentum alpha164: SMA(((close > delay(close, 1)) * 1 / (close - (~416 tok)
- `alpha165.py` — Real WorldQuant Alpha101 formula — Momentum alpha165: (MAX(SUM(close - mean(close, 48), 48)) - MIN(S (~406 tok)
- `alpha166.py` — Real WorldQuant Alpha101 formula — Momentum alpha166: -20 * (20 - 1) ** 1.5 * SUM(returns - mean(ret (~424 tok)
- `alpha167.py` — Real WorldQuant Alpha101 formula — Momentum alpha167: SUM((close > delay(close, 1)) * (close - delay (~328 tok)
- `alpha168.py` — Real WorldQuant Alpha101 formula — Momentum alpha168: -volume / mean(volume, 20) (~291 tok)
- `alpha169.py` — Real WorldQuant Alpha101 formula — Momentum alpha169: SMA(mean(delay(SMA(close - delay(close, 1), 9, (~430 tok)
- `alpha170.py` — Real WorldQuant Alpha101 formula — Momentum alpha170: (((rank((1 / close)) * volume / mean(volume, 2 (~529 tok)
- `alpha171.py` — Real WorldQuant Alpha101 formula — Momentum alpha171: (-1 * ((low - close) * (open ** 5))) / ((close (~345 tok)
- `alpha172.py` — Real WorldQuant Alpha101 formula — Momentum alpha172: mean(ABS(SUM(ld > 0 ? ld : 0, 14) * 100 / SUM( (~532 tok)
- `alpha173.py` — Real WorldQuant Alpha101 formula — Momentum alpha173: 3 * SMA(close, 13, 2) - 2 * SMA(SMA(close, 13, (~488 tok)
- `alpha174.py` — Real WorldQuant Alpha101 formula — Momentum alpha174: SMA((close > delay(close, 1)) * std(close, 20) (~332 tok)
- `alpha175.py` — Real WorldQuant Alpha101 formula — Momentum alpha175: mean(MAX(MAX((high - low), ABS(delay(close, 1) (~375 tok)
- `alpha176.py` — Real WorldQuant Alpha101 formula — Momentum alpha176: correlation(rank((close - tsmin(low, 12)) / (t (~398 tok)
- `alpha177.py` — Real WorldQuant Alpha101 formula — Momentum alpha177: ((20 - highday(high, 20)) / 20) * 100 (~344 tok)
- `alpha178.py` — Real WorldQuant Alpha101 formula — Momentum alpha178: (close - delay(close, 1)) / delay(close, 1) * (~294 tok)
- `alpha179.py` — Real WorldQuant Alpha101 formula — Momentum alpha179: rank(correlation(vwap, volume, 4)) * rank(corr (~449 tok)
- `alpha180.py` — Real WorldQuant Alpha101 formula — Momentum alpha180: (mean(volume, 20) < volume) ? ((-1 * ts_rank(a (~434 tok)
- `alpha181.py` — Real WorldQuant Alpha101 formula — Momentum alpha181: SUM((returns - mean(returns, 20)) - (benchmark (~482 tok)
- `alpha182.py` — Real WorldQuant Alpha101 formula — Momentum alpha182: count((close > open & benchmark > open) | (clo (~380 tok)
- `alpha183.py` — Real WorldQuant Alpha101 formula — Momentum alpha183: (MAX(SUM(close - mean(close, 24), 24)) - MIN(S (~406 tok)
- `alpha184.py` — Real WorldQuant Alpha101 formula — Momentum alpha184: rank(correlation(delay((open - close), 1), clo (~360 tok)
- `alpha185.py` — Real WorldQuant Alpha101 formula — Momentum alpha185: rank((-1 * ((1 - (open / close)) ** 2))) (~294 tok)
- `alpha186.py` — Real WorldQuant Alpha101 formula — Momentum alpha186: mean(stochRSI, 6) + delay(mean(stochRSI, 6), 6 (~440 tok)
- `alpha187.py` — Real WorldQuant Alpha101 formula — Momentum alpha187: SUM((open <= delay(open, 1)) ? 0 : MAX((high - (~371 tok)
- `alpha188.py` — Real WorldQuant Alpha101 formula — Momentum alpha188: (high - low - SMA(high - low, 11, 2)) / SMA(hi (~327 tok)
- `alpha189.py` — Real WorldQuant Alpha101 formula — Momentum alpha189: mean(ABS(close - mean(close, 6)), 6) (~295 tok)
- `alpha190.py` — Real WorldQuant Alpha101 formula — Momentum alpha190: log((count(returns > daily_return, 20) - 1) * (~465 tok)
- `alpha191.py` — Real WorldQuant Alpha101 formula — Momentum alpha191: corr(mean(volume, 20), low, 5) + ((high + low) (~330 tok)
- `base.py` — Required columns for alpha factor computation (~587 tok)
- `factor_descriptions.py` (~23913 tok)
- `factor_pipeline.py` — FactorPipeline: compute_factors (~311 tok)
- `factor_registry.py` — FactorRegistry: ensure_initialized, reset, register, get + 2 more (~960 tok)
- `gtja_alpha001.py` — GTJA Alpha1: (-1 * CORR(RANK(DELTA(LOG(VOLUME), 1)), RANK(((CLOSE - OPEN) / OPEN)), 6)) (~261 tok)
- `gtja_evaluator.py` — GTJA Alpha Expression Evaluator — parses and evaluates GTJA formula strings. (~7061 tok)
- `operators.py` — WorldQuant Alpha101 operators — building blocks for complex factor expressions. (~3061 tok)

## core/alpha/management/

- `__init__.py` — Factor Management System. (~2726 tok)
- `factor_decay.py` — FactorHealth: check, batch_check (~1529 tok)
- `industry_neutral.py` — IndustryNeutralizer: neutralize_by_mean, neutralize_by_zscore, neutralize_by_regression, neutralize_ (~850 tok)
- `report_generator.py` — class: generate, save_json, to_dict, save_html + 1 more (~2746 tok)

## core/alpha/mining/

- `__init__.py` — Genetic Programming Factor Mining Engine. (~3561 tok)
- `genetic_programming.py` — class: mine, save_factors, load_factors (~1513 tok)
- `operator_set.py` — ts_rank, ts_sum, ts_mean, ts_std (~1310 tok)

## core/alpha/user/

- `__init__.py` — Auto-generated user factors (~102 tok)

## core/config/

- `__init__.py` (~0 tok)
- `settings.py` — Settings: db_url, get_settings (~593 tok)
- `watchlist.py` — 关注品种列表 + 宏观↔品种联动规则 + 数据新鲜度阈值配置 (静态配置)。 (~894 tok)

## core/data/

- `__init__.py` — Data Layer — unified market data access, caching, and quality control. (~123 tok)
- `cache_manager.py` — Two-level cache: in-memory LRU + Redis. (~1053 tok)
- `cache.py` — View: get, delete, get, delete (~696 tok)
- `continuous_contract.py` — ContinuousContract: build, get_roll_schedule, calculate_roll_yield, is_in_contango + 3 more (~3513 tok)
- `contract_resolver.py` — Contract metadata resolver — symbol↔contract mapping with main-contract detection. (~1646 tok)
- `data_quality.py` — Data quality guard — six checks every incoming dataframe must pass. (~1499 tok)
- `history_store.py` — Historical data store — save, query, repair. (~2212 tok)
- `market_data_manager.py` — Unified market data entry point with cache, quality guard, and multi-source routing. (~3043 tok)
- `realtime_sync_service.py` — API: POST, GET (6 endpoints) (~2255 tok)

## core/db/

- `__init__.py` (~0 tok)
- `models.py` — SQLAlchemy: Base (contracts) (~3826 tok)
- `session.py` — get_db_url, get_engine, get_session_maker, get_session (~373 tok)

## core/db/migrations/

- `__init__.py` (~0 tok)
- `env.py` — Alembic environment configuration — async support for PostgreSQL + SQLite fallback. (~702 tok)
- `script.py.mako` (~170 tok)

## core/db/migrations/versions/

- `5622da4f0062_initial_schema.py` — initial_schema (~4719 tok)
- `add_data_quality_fields.py` — add_data_quality_fields (~561 tok)
- `add_trading_time_fields.py` — add_trading_time_fields - 新增 trading_date/calendar_date/session 字段 (~338 tok)
- `warehouse_tables_v1.py` — add_warehouse_tables (~3978 tok)

## core/evolve/

- `__init__.py` — Self-evolving strategy optimization engine. (~37 tok)
- `evolution.py` — Strategy parameter-space evolution: grid search and random search. (~1639 tok)
- `memory.py` — Analysis memory — store predictions, validate against actual outcomes. (~2308 tok)
- `reflection.py` — Reflection & Calibration — background worker for self-tuning. (~2364 tok)
- `regime.py` — Market regime detection for Chinese futures (D1 + H1 multi-timeframe). (~2820 tok)
- `runner.py` — Experiment orchestrator — ties regime detection, strategy registry, backtesting, (~6448 tok)
- `scoring.py` — Multi-factor strategy scoring with regime-context bonus. (~1692 tok)

## core/features/

- `__init__.py` (~30 tok)
- `feature_store.py` — FeatureCategory: to_dict, register, get, list_all + 5 more (~3773 tok)

## core/llm/

- `__init__.py` — LLM Integration: Multi-provider LLM support (OpenAI, Anthropic, DeepSeek, Ollama, etc.). (~275 tok)
- `code_reviewer.py` — LLM-powered code reviewer: analyze code quality, bugs, and improvements. (~1198 tok)
- `comparator.py` — Model comparator — run the same prompt across multiple models and compare results. (~1692 tok)
- `deepseek_client.py` — DeepSeek API client — OpenAI-compatible interface for DeepSeek models. (~1746 tok)
- `llm_client.py` — Generic LLMClient — multi-provider LLM client with auto-discovery. (~1478 tok)
- `market_analyzer.py` — LLM-powered market analyzer: interpret market data and generate insights. (~1691 tok)
- `strategy_advisor.py` — LLMStrategyAdvisor: ask, generate_strategy, compute (~1541 tok)
- `strategy_factory.py` — LLM Strategy Factory — generate, validate, and register complete strategies from natural language. (~3370 tok)
- `strategy_generator.py` — LLM-powered strategy generator: generate, optimize, and evolve trading strategies. (~1504 tok)

## core/llm/providers/

- `__init__.py` — LLM Provider abstraction layer — supports OpenAI-compatible, Anthropic, and Ollama protocols. (~137 tok)
- `anthropic_provider.py` — Anthropic Claude provider — uses Anthropic Messages API. (~1072 tok)
- `base.py` — Abstract base class for all LLM providers. (~655 tok)
- `ollama_provider.py` — Ollama provider — local models via Ollama API. (~944 tok)
- `openai_provider.py` — OpenAI-compatible provider — works for OpenAI, DeepSeek, Groq, Together, Moonshot, etc. (~1174 tok)
- `registry.py` — Provider registry — manages multiple LLM providers from YAML config. (~2108 tok)

## core/resonance/

- `__init__.py` (~82 tok)
- `engine_v2.py` — class: calculate (~1132 tok)
- `matrix.py` — MatrixEngine: calculate (~333 tok)
- `scanner.py` — ScannerEngine: calculate (~292 tok)
- `voter.py` — VoterEngine: calculate (~220 tok)

## core/risk/

- `__init__.py` — Risk management: monitoring, position sizing, and risk controls. (~119 tok)

## core/risk/monitoring/

- `__init__.py` — Risk monitoring: VaR, CVaR, stress testing, risk attribution. (~94 tok)
- `cvar_calculator.py` — Conditional Value at Risk (CVaR / Expected Shortfall). (~258 tok)
- `risk_attribution.py` — Risk attribution: factor-based and asset-based. (~464 tok)
- `stress_testing.py` — Portfolio stress testing. (~603 tok)
- `var_calculator.py` — Value at Risk (VaR) calculator. (~404 tok)

## core/risk/position/

- `__init__.py` — Dynamic position management: Kelly, volatility targeting, regime-based. (~86 tok)
- `kelly_criterion.py` — Kelly criterion for optimal position sizing. (~222 tok)
- `regime_based.py` — Market-regime-based position sizing. (~132 tok)
- `volatility_targeting.py` — Volatility-targeting position sizing. (~278 tok)

## core/rl/

- `__init__.py` (~47 tok)
- `agents.py` — PPO Agent with dual-backend support (NumPy / PyTorch). (~4638 tok)
- `config.py` (~333 tok)
- `environments.py` — class: action_space_size, observation_space_size, reset, step (~1960 tok)

## core/rl/advanced/

- `__init__.py` — Advanced RL algorithms: SAC, TD3, DDPG. (~42 tok)
- `ddpg.py` — Deep Deterministic Policy Gradient (DDPG) — NumPy implementation. (~624 tok)
- `sac.py` — Soft Actor-Critic (SAC) — NumPy (original) + PyTorch backends. (~2253 tok)
- `td3.py` — Twin Delayed DDPG (TD3) — NumPy (original) + PyTorch backends. (~2308 tok)

## core/rl/deep/

- `__init__.py` — Deep RL neural networks and replay buffers. (~86 tok)
- `networks.py` — Neural network building blocks for deep RL algorithms. (~1529 tok)
- `optim.py` — Shared gradient helpers for NumPy-based RL algorithms. (~657 tok)
- `replay_buffer.py` — Experience replay buffers for deep RL. (~765 tok)
- `torch_networks.py` — PyTorch neural network building blocks for deep RL algorithms. (~2730 tok)
- `trainers_numpy.py` — NumPy DQN trainer fallback (used when torch is not installed). (~1023 tok)
- `trainers.py` — DQN Trainer — PyTorch backend (primary) with NumPy fallback. (~1390 tok)

## core/rl/multi_agent/

- `__init__.py` — Multi-agent RL: MADDPG. (~26 tok)

## core/rl/multi_agent/algorithms/

- `__init__.py` (~14 tok)
- `maddpg.py` — Multi-Agent DDPG (MADDPG) — NumPy implementation. (~1276 tok)

## core/rl/offline/

- `__init__.py` — Offline RL: Conservative Q-Learning (CQL). (~44 tok)
- `conservative.py` — Conservative Q-Learning (CQL) for offline RL — NumPy implementation. (~706 tok)
- `dataset.py` — Offline dataset management for CQL. (~444 tok)

## core/scoring/

- `__init__.py` (~59 tok)
- `resonance_engine.py` — from: evaluate (~3343 tok)
- `technical_score.py` — from: to_dict, score (~1106 tok)
- `volatility_score.py` — class: to_dict, detect (~1891 tok)

## core/tasks/

- 已删除：旧的重复 Celery 应用与任务模块。生产与测试统一使用顶层 `tasks/` 包。

## core/tournament/

- `tournament_system.py` — API: POST, GET (3 endpoints) (~3443 tok)

## core/ump/

- `__init__.py` — UMP 裁判机制 — 交易级 ML 否决闸门 (受 abu 启发, 独立实现, 非拷贝 GPL 代码)。 (~96 tok)
- `judges.py` — UMP 裁判机制 — 交易级 ML 否决闸门 (受 abu 启发, 全新独立实现)。 (~1991 tok)
- `service.py` — UMP 服务 — 训练/持久化/预测 (从真实 kline 训练裁判, 供下单前否决)。 (~1170 tok)
- `training.py` — UMP 训练数据生成 — 从策略回测产出"逐笔交易特征 + 盈亏"训练集。 (~573 tok)

## core/utils/

- `__init__.py` (~0 tok)
- `decorators.py` — retry, decorator, async_wrapper, timed + 3 more (~435 tok)
- `logger.py` — setup_logger (~131 tok)

## cross_symbol/

- `__init__.py` (~0 tok)
- `cross_market.py` — CrossMarketAnalyzer: rolling_correlation, analyze, detect_regime_shift (~435 tok)
- `pair_trading.py` — class: compute_cointegration, generate_signals (~694 tok)
- `spread_analyzer.py` — compute_spread, zscore, half_life, generate_signals (~442 tok)

## data/

- `sync_watchlist.json` (~2056 tok)

## data_center/

- `__init__.py` (~216 tok)
- `aggregator.py` — aggregate_symbol, aggregate_all (~1358 tok)
- `cross_market.py` — compute_all (~1208 tok)
- `download_checkpoint.json` (~25505 tok)
- `migrate_to_pg.py` — DuckDB → PostgreSQL 数据迁移脚本（处理 NULL/NaN 类型） (~1360 tok)
- `options_analytics.py` — compute_option_greeks (~656 tok)
- `realtime_quote.py` — 实时行情快照 — 多源容错。 (~3409 tok)

## data_center/ (DuckDB 统一仓库 — 2026-06-18 新增)


## data_center/api/

- `__init__.py` — API: 10 endpoints (~6872 tok)
- `warehouse.py` — Warehouse/data sync API; latest sync backfills futures D1/M5, stock D1+60m, option D1 with since, aggregation, realtime start. (~16465 tok)

## data_center/calendar/

- `__init__.py` — 交易时间解析模块 (~184 tok)
- `trading_time.py` — TradingTimeParser: is_trading_day, get_next_trading_day, get_previous_trading_day, get_cn_futures_se (~1823 tok)

## data_center/collect/

- `pipeline.py` — Unified collection pipeline orchestrator. (~1754 tok)

## data_center/collectors/

- `__init__.py` — 资产类别采集器 — 编排 fetch -> normalize -> DuckDB 写入。 (~114 tok)
- `base_collector.py` — BaseCollector: col, store_kline (~671 tok)
- `futures_collector_tdx.py` — FuturesCollectorTDX: collect_product, collect_contract, col (~2746 tok)
- `futures_collector.py` — FuturesCollector: discover_contracts, collect_contract, mark_main_contract (~4827 tok)
- `macro_collector.py` — MacroCollector: collect, conv, collect_all (~962 tok)
- `options_collector.py` — OptionsCollector for China option D1/Greeks; collect_month supports since for 60-day latest backfill. (~5418 tok)
- `stocks_collector.py` — StocksCollector: list_all_symbols, collect_kline, collect_minute_kline (~8768 tok)

## data_center/collectors/ (资产类别采集器 — 2026-06-18 新增)


## data_center/core/

- `__init__.py` (~24 tok)
- `base_fetcher.py` — KlineInterval: name, display_name, info, get_kline + 3 more (~1337 tok)
- `data_source.py` — DataSourceManager: register, unregister, list_sources, get_source + 7 more (~3107 tok)
- `retry.py` — retry_sync (~431 tok)

## data_center/db/

- `__init__.py` — 统一数据库 schema 与品种/合约注册表。 (~28 tok)
- `init_schema.sql` — 交易系统统一数据库 — PostgreSQL Schema （参考文件） (~2687 tok)
- `migrate_kline_columns.py` — One-time migration: standardize kline columns to match warehouse_tables_v1 migration. (~1382 tok)
- `registry.py` — SymbolRegistry: get_or_create_product, parse_contract, get_or_create_symbol, get_registry + 1 more (~2059 tok)
- `seed_loader.py` — load_products, load_cross_market, load_all (~744 tok)

## data_center/db/seeds/

- `cross_market_seed.csv` (~146 tok)
- `macro_indicators.csv` (~98 tok)
- `products.csv` (~457 tok)

## data_center/fetchers/

- `__init__.py` (~171 tok)
- `adata_fetcher.py` — list_stock_codes, get_market, get_stock_daily, get_stock_minute (~2214 tok)
- `akshare_fetcher.py` — AKShareFetcher: get_futures_daily, get_futures_hist_em, get_kline, get_futures_minute + 1 more (~5412 tok)
- `alpha_vantage_fetcher.py` — AlphaVantageFetcher: get_stock_daily, get_forex_rate, get_forex_daily, get_crypto_daily + 4 more (~1881 tok)
- `baostock_fetcher.py` — BaoStockFetcher: get_kline, get_realtime, get_trade_dates, validate (~1456 tok)
- `ctp_fetcher.py` — CTPFetcher compatibility adapter; optional live gateway plus deterministic ticks_to_bars OHLCV aggregation. (~1050 tok)
- `eia_cftc_fetcher.py` — EIAFetcher/CFTCFetcher optional macro fetcher compatibility stubs for local/test imports. (~900 tok)
- `fmp_fetcher.py` — FMPFetcher: get_company_profile, get_income_statement, get_balance_sheet, get_cash_flow + 5 more (~1331 tok)
- `fred_fetcher.py` — FREDFetcher: get_series, get_series_df, get_multiple_series, get_gdp + 8 more (~1645 tok)
- `options_fetcher.py` — ChinaOptionsFetcher: get_etf_option_daily, get_etf_option_realtime, get_etf_option_codes, get_index_ (~3980 tok)
- `tdx_fetcher.py` — TDXFetcher: get_kline, get_realtime (~5562 tok)
- `tiingo_fetcher.py` — TiingoFetcher: get_stock_daily, get_forex_prices, get_crypto_prices, get_ticker_metadata + 3 more (~1435 tok)
- `tqsdk_fetcher.py` — TqSdkFetcher: get_kline, get_realtime, close, validate + 1 more (~1837 tok)
- `tushare_fetcher.py` — TushareFetcher: get_kline, get_realtime, get_trade_dates, get_financial + 2 more (~1543 tok)
- `unified_fetcher.py` — UnifiedFetcher: get_kline, get_realtime, get_source_name, validate + 1 more (~1618 tok)
- `yfinance_fetcher.py` — YFinanceFetcher: get_kline, get_realtime, get_info, validate + 1 more (~1946 tok)

## data_center/history/

- `__init__.py` (~85 tok)
- `collect_jobs.py` — ProgressTracker: set_total, set_current_item, increment, add_failure + 15 more (~1873 tok)
- `data_store.py` — URL configuration (~1622 tok)
- `download_manager.py` — DownloadStatus: display_name, create_task, execute_task, execute_batch + 7 more (~3198 tok)
- `full_downloader.py` — reset_ckpt, collect_futures_product, collect_futures_product_month, run_futures_month (~5007 tok)
- `sync_scheduler.py` — Realtime sync scheduler with persistent watchlist, aggregation after M5, and source_exception/skip_downstream status. (~3169 tok)

## data_center/knowledge/

- `__init__.py` (~47 tok)
- `contract_knowledge.py` — class: exchange_display (~6905 tok)
- `contract_lifecycle.py` — parse_expiry, status, lifecycle_window, lifecycle_guard (~597 tok)
- `exchanges.py` — from: get_exchange, list_exchanges (~384 tok)
- `main_contract_resolver.py` — 当前主力合约动态解析器 — 基于 kline 成交量自动推断主力合约。 (~822 tok)
- `main_contract.py` — MainContractResolver: parse_contract_code, is_valid_contract_month, get_main_contract_month, get_mai (~2284 tok)
- `options_knowledge.py` — class: get_product, list_products, get_strategy, list_strategies + 2 more (~1986 tok)
- `stock_knowledge.py` — class: get_sector, list_sectors, relations_for_sector, sectors_for_futures + 2 more (~1681 tok)

## data_center/storage/

- `__init__.py` — PostgreSQL 统一数据仓库存储层。 (~44 tok)
- `postgres_store.py` — PostgreSQL-only warehouse store; pooled reads normalize Decimal cells to float while preserving non-numeric values, plus serialized writes/upserts and isolated schemas. (~1900 tok)

## data_center/verification/

- `__init__.py` (~21 tok)
- `verifier.py` — class: check_quality, cross_validate, cross_validate_all (~2295 tok)

## docs/

- `客服反馈20260711.md` — 升级建议补充 (2026-07-11 实现) (~2548 tok)
- `客服反馈补充20260711.md` — 客服反馈补充 — 2026-07-11 (~1367 tok)
- `数据采集系统升级说明.md` — 数据采集系统升级说明 (~2320 tok)
- `系统升级审查报告20260712.md` — 系统升级审查报告 (~814 tok)
- `API_REFERENCE.md` — Trading Strategy Center — API 参考文档 (~866 tok)
- `DATABASE.md` — 数据库设计文档 (~4433 tok)
- `IMPLEMENTATION_PROGRESS.md` — Strategy Intelligence V2 - Implementation Progress (~1747 tok)
- `INTEGRATION_SUMMARY.md` — 交易策略中心 - 集成总结报告 (~1164 tok)
- `INTELLIGENCE_UPGRADE.md` — Intelligence Upgrade Documentation (~3125 tok)
- `menu-route-api.md` — 菜单-路由-API 对照表 (~2437 tok)
- `SPEC_FUNDAMENTAL_AGENT.md` — SPEC: 基本面 Agent — 库存 × 成本链 × 季节性 × 需求 四维分析 (~3236 tok)
- `SPEC_INTEGRATION.md` — 增量集成规划：5个外部项目 → 交易策略中心 (~2113 tok)
- `STARTUP.md` — 启动指南 (~162 tok)
- `SYSTEM_OVERVIEW.md` — 交易策略中心 — 系统说明文档 (~699 tok)
- `system-architecture.md` — Trading Strategy Center — 系统架构 (~3830 tok)
- `USAGE_FACTOR.md` — 因子系统使用指南 (USAGE) (~1130 tok)

## docs/superpowers/plans/

- `2026-06-12-alpha-factor-extension.md` — Alpha因子扩展实施计划 (~28245 tok)
- `2026-06-12-rl-risk-monitoring-plan.md` — Strategy Intelligence V2 Implementation Plan (~10101 tok)
- `2026-06-12-strategy-intelligence-upgrade.md` — 策略智能化全栈升级实现计划 (~21810 tok)

## docs/superpowers/specs/

- `2026-06-12-strategy-intelligence-upgrade-design.md` — 策略智能化全栈升级设计文档 (~9657 tok)
- `2026-06-12-strategy-intelligence-v2-design.md` — 策略智能化V2升级设计文档 (~16872 tok)

## evolution/

- `__init__.py` (~0 tok)
- `strategy_evolution.py` — StrategyEvolution: create_initial_population, select, crossover, mutate + 1 more (~1012 tok)

## frontend/

- `FRONTEND_UPGRADE_PLAN.md` — 前端升级计划 - 用户体验优化 (~1055 tok)
- `index.html` — Trading Strategy Center (~148 tok)
- `package-lock.json` — npm lock file (~31394 tok)
- `package.json` — Node.js package manifest (~305 tok)
- `tsconfig.json` — TypeScript configuration (~177 tok)
- `tsconfig.tsbuildinfo` (~155 tok)
- `vite.config.ts` (~212 tok)

## frontend/src/

- `App.css` — Styles: 12 rules, 2 media queries, 2 animations (~557 tok)
- `App.tsx` — Dashboard (~1438 tok)
- `main.tsx` (~145 tok)

## frontend/src/api/

- `client.ts` — API routes: GET, DELETE, POST (24 endpoints) (~3458 tok)

## frontend/src/components/

- `DataSyncPanel.tsx` — DataSyncPanel — renders table — uses useState, useEffect (~3177 tok)
- `Layout.tsx` — ICON_MAP (~2479 tok)
- `RealtimeSignalPanel.tsx` — generateMockSignal — uses useState, useEffect (~3281 tok)
- `StrategyBuilder.tsx` — StrategyBuilder — renders form (~3121 tok)

## frontend/src/constants/

- `menu.ts` — 菜单配置 — 7 域分组 (~840 tok)
- `routes.ts` — 集中式路由配置 (~1060 tok)

## frontend/src/contexts/

- `AuthContext.tsx` — AuthContext (~540 tok)

## frontend/src/pages/

- `Backtest.tsx` — PRODUCTS — renders table (~2501 tok)
- `ChinaFinance.tsx` — CATEGORY_LABELS — renders table (~4018 tok)
- `Dashboard.tsx` — MOCK_EQUITY — renders table (~6249 tok)
- `DataCenter.tsx` — ALL_SYMBOLS (~26418 tok)
- `Evolve.tsx` — ALL_PRODUCTS (~10812 tok)
- `FactorResearch.tsx` — CATEGORY_COLORS (~18866 tok)
- `FeatureStorePage.tsx` — CAT_COLORS — renders table (~1103 tok)
- `Feedback.tsx` — Feedback — renders table (~943 tok)
- `IterationMonitor.tsx` — degColor — renders table (~4556 tok)
- `LLMConfig.tsx` — LLMConfig (~1356 tok)
- `Login.tsx` — Login — renders form (~718 tok)
- `MacroNews.tsx` — SENTI_BG (~15148 tok)
- `ML.tsx` — MOCK_MODELS — renders form, table, modal — uses useState, useForm, useEffect (~2184 tok)
- `MLAnalyzer.tsx` — DIR_COLOR (~1462 tok)
- `Monitoring.tsx` — METRICS — renders table, chart — uses useState, useEffect (~3049 tok)
- `NewsAggregator.tsx` — SENTIMENT_STYLE — renders table (~4006 tok)
- `Phase3.tsx` — DIR_COLOR — renders table (~4391 tok)
- `Portfolio.tsx` — pnlSpan — renders table (~1030 tok)
- `ResearchCenter.tsx` — VERDICT_COLORS (~5510 tok)
- `Resonance.tsx` — SYMBOLS (~4086 tok)
- `Settings.tsx` — Settings — renders form (~2184 tok)
- `SignalDetail.tsx` — DIR_CFG (~3432 tok)
- `Signals.tsx` — DIR_CFG (~8485 tok)
- `Strategy.tsx` — statusMap — renders form, table, modal — uses useState, useForm, useEffect (~2352 tok)
- `StrategyLibrary.tsx` — TYPE_CN (~7382 tok)
- `Tournament.tsx` — rankColors — renders table (~3681 tok)
- `Trading.tsx` — pnlSpan (~5080 tok)
- `VibeResearch.tsx` — CATEGORY_COLORS — renders table (~4428 tok)
- `VolatilityAnalysis.tsx` — SYMBOLS — renders table (~1656 tok)
- `VStockAdvisor.tsx` — VERDICT_COLORS — renders table (~4212 tok)

## frontend/src/services/

- `chinaFinanceApi.ts` — API routes: GET (1 endpoints) (~695 tok)
- `factorApi.ts` — API routes: POST, GET (10 endpoints) (~870 tok)
- `fundamentalApi.ts` — API routes: GET, POST (4 endpoints) (~585 tok)
- `macroNewsApi.ts` — API routes: GET, POST (20 endpoints) (~2009 tok)
- `marketApi.ts` — API routes: POST (1 endpoints) (~323 tok)
- `newsApi.ts` — API routes: POST, DELETE (2 endpoints) (~452 tok)
- `phase3Api.ts` — API routes: GET, POST (4 endpoints) (~254 tok)
- `phase4Api.ts` — API routes: POST, GET (7 endpoints) (~337 tok)
- `scoringApi.ts` — Exports OHLCVRow, scoringApi (~423 tok)
- `strategyApi.ts` — API routes: GET, POST, DELETE (8 endpoints) (~969 tok)
- `vibeApi.ts` — Exports FactorInfo, BacktestResult, vibeApi (~481 tok)
- `vstockApi.ts` — Exports JuryOpinion, VStockReport, LhbItem, vstockApi (~387 tok)

## frontend/src/store/

- `useAppStore.ts` — Exports useStrategyStore, useTradingStore, useBacktestStore, usePortfolioStore + 3 more (~1369 tok)

## frontend/src/styles/

- `global.css` — Styles: 77 rules, 31 vars, 1 animations (~3779 tok)

## frontend/src/utils/

- `routeCheck.ts` — 路由类型检查脚本 (~430 tok)

## fundamental/

- `__init__.py` (~0 tok)
- `fundamental_analyzer.py` — FundamentalAnalyzer: basis, cost_of_carry, fair_value, analyze_futures (~523 tok)

## logs/

- `trading_2026-06-13.log` (~149 tok)
- `trading_2026-06-14.log` (~50 tok)
- `trading_2026-06-15.log` (~50 tok)

## macro/

- `__init__.py` — macro — 宏观指标聚合 + 宏观联动/市态/展望。 (~51 tok)
- `aggregator.py` — 宏观指标聚合 — 从 DuckDB macro_data 查最新值 + 趋势。 (~1015 tok)
- `regime_adapter.py` — 宏观→市态/品种联动分析 + 远期趋势展望 (规则引擎, 非 ML)。 (~1462 tok)

## market_state/

- `__init__.py` (~30 tok)
- `entropy_analyzer.py` — EntropyAnalyzer: compute_entropy, approximate_entropy, compute_market_efficiency (~665 tok)
- `market_state.py` — class: to_dict, detect (~5301 tok)
- `regime_detector_v2.py` — RegimeV2: fit, predict, predict_proba, detect_change_point (~1350 tok)
- `regime_detector.py` — from: detect (~1189 tok)
- `state_machine_v2.py` — EnhancedStateMachine: reset, next_state, get_transition_probability, get_current_state + 2 more (~1332 tok)
- `state_machine.py` — StateMachine: update, predict_next, transition_probs (~388 tok)

## microstructure/

- `__init__.py` (~0 tok)
- `market_depth.py` — MarketDepthAnalyzer: estimate_spread, impact_cost (~263 tok)
- `order_flow.py` — OrderFlowAnalyzer: analyze, imbalance (~322 tok)
- `spread_impact.py` — SpreadImpactAnalyzer: effective_spread, realized_spread, adverse_selection (~296 tok)

## ml/

- `__init__.py` — ML 模块统一导出。 (~205 tok)
- `auto_pipeline.py` — class: to_dict, run (~1657 tok)
- `demo.py` — demo_ml, train_fn, demo_options (~1470 tok)
- `ensemble.py` — ModelEnsemble: add_model, fit, predict, weights_info (~651 tok)
- `hyperopt.py` — HyperoptSearcher: search, objective (~1444 tok)
- `model_monitor.py` — from: to_dict, check, batch_check (~1151 tok)
- `model_selector.py` — ModelSelector: score_model, select, select_with_hyperopt, train_fn (~1262 tok)
- `pipeline.py` — class: train, predict, get_pipeline_summary (~1333 tok)
- `registry.py` — class: save, load, list_models, delete + 1 more (~1488 tok)
- `signal_adapter.py` — MLSignalAdapter: to_signals, to_combined_signal (~662 tok)
- `strategy_evolution.py` — StrategyEvolutionEngine: evolve_parameters, objective, combine_strategies, objective + 2 more (~3980 tok)
- `train.py` — train_all_models, train_pipeline_for_symbol, retrain_if_needed (~242 tok)

## ml/features/

- `__init__.py` — ML 特征工程子包。 (~95 tok)
- `cross_sectional_features.py` — CrossSectionalFeatureSet: get_features (~650 tok)
- `pipeline.py` — class: register_fn, register, register_module, compute_all + 5 more (~1630 tok)
- `technical_features.py` — TechnicalFeatureSet: get_features (~1620 tok)

## ml/models/

- `__init__.py` (~0 tok)
- `nbeats_model.py` — NBeatsBlock: forward, fit, predict, save + 3 more (~2463 tok)
- `sklearn_wrapper.py` — SklearnModel: fit, predict, get_params, feature_importance (~1145 tok)
- `tft_model.py` — TFTModel: fit, predict, get_attention_weights, save + 3 more (~1858 tok)

## monitoring/

- `__init__.py` — Monitoring & Alerting System. (~123 tok)

## monitoring/alerting/

- `__init__.py` (~57 tok)
- `alert_manager.py` — Alert lifecycle manager. (~392 tok)
- `anomaly_detection.py` — Anomaly detection: zscore, IQR. (~291 tok)
- `threshold_rules.py` — Threshold-based alert rules engine. (~396 tok)

## monitoring/channels/

- `__init__.py` (~34 tok)
- `email_channel.py` — Email notification channel. (~302 tok)
- `feishu.py` — Feishu (Lark) notification channel. (~301 tok)

## monitoring/dashboard/

- `__init__.py` (~40 tok)
- `metrics_collector.py` — Real-time metrics collector. (~252 tok)
- `time_series_db.py` — SQLite-backed time-series storage for metrics. (~536 tok)

## monitoring/performance/

- `__init__.py` (~44 tok)
- `performance_report.py` — Performance report generation. (~284 tok)
- `return_attribution.py` — Return attribution: Brinson model. (~285 tok)

## news/

- `__init__.py` — news — 财经新闻采集 / 中文情绪 / 宏观事件日历 / AI 增强。 (~315 tok)
- `calendar.py` — 宏观事件日历 — 内置规则化种子事件 + 近 N 天展望。 (~718 tok)
- `morning_briefing.py` — 快读简报生成器 — 宏观经济 / 全球指数 / 期货行情 / AI科技 / 今日关注。 (~8956 tok)
- `multi_fetcher.py` — 多源快讯采集器 — 财联社 / 金十 / 东财全球 / 36氪 / 新浪财经。 (~4335 tok)
- `news_fetcher.py` — NewsFetcher: fetch (~366 tok)
- `pipeline.py` — News pipeline: fetch/tag/sentiment/AI scoring with stale-cache self-heal, single-flight refresh, atomic JSON cache. (~2552 tok)
- `sentiment.py` — 中文财经新闻情绪分析 — 关键词词典法 (替换原英文词袋)。 (~591 tok)

## news/ai/

- `__init__.py` — news.ai — AI 增强层 (可选模块, AI 不可用时自动降级)。 (~190 tok)
- `analyzer.py` — news.ai.analyzer — AI 新闻重要度评分器。 (~802 tok)
- `client.py` — news.ai.client — 多提供商 AI 客户端, 链式回退。 (~2328 tok)
- `enricher.py` — news.ai.enricher — AI 新闻背景丰富 (可选功能)。 (~1409 tok)
- `prompts.py` — news.ai.prompts — AI 提示词模板 (中文金融新闻场景)。 (~658 tok)
- `summarizer.py` — news.ai.summarizer — AI 增强简报生成器。 (~868 tok)
- `utils.py` — news.ai.utils — JSON extraction from AI responses. (~581 tok)

## news/fetchers/

- `__init__.py` — news.fetchers — 新闻数据源采集器。 (~48 tok)
- `cls.py` — 财联社快讯采集器 — 多源容错。 (~1547 tok)
- `eastmoney_guba.py` — 东方财富个股公告/股吧舆情采集器 (参考 ai_quant_trade, Apache-2.0)。 (~738 tok)

## news/scrapers/

- `__init__.py` — news.scrapers — 附加新闻数据源。 (~52 tok)
- `gdelt.py` — news.scrapers.gdelt — GDELT 2.0 全球新闻采集器 (无密钥)。 (~739 tok)
- `google_news.py` — news.scrapers.google_news — Google News RSS 采集器 (无密钥)。 (~786 tok)

## options/

- `__init__.py` — 期权专属层 — 定价 / 希腊字母 / 波动率 / 策略 / 风险 / 分析。 (~112 tok)
- `base.py` — 期权策略基础数据结构与基类。 (~760 tok)
- `registry.py` — 期权策略注册表,镜像 signals/registry.py 的设计。 (~151 tok)

## options/analysis/

- `__init__.py` — 期权链分析工具 — PCR / Max Pain / 持仓量分布。 (~488 tok)

## options/greeks/

- `__init__.py` — 希腊字母引擎:解析解、数值差分、组合级聚合。 (~247 tok)
- `analytical_greeks.py` — BSM 解析希腊字母(也适用于 Black76:传 F 替代 S,设 q=r)。 (~885 tok)
- `numerical_greeks.py` — 数值差分希腊字母 — 高阶 Greeks(vanna/volga/charm/speed)。 (~1650 tok)
- `portfolio_greeks.py` — 组合级希腊字母聚合 — 把多腿期权/期货持仓的 Greeks 加权汇总。 (~648 tok)

## options/pricing/

- `__init__.py` — 期权定价引擎。 (~73 tok)
- `binomial_tree.py` — 二叉树期权定价 — 支持欧式与美式。 (~346 tok)
- `black_scholes.py` — Black-Scholes-Merton 解析定价。 (~410 tok)
- `black76.py` — Black-76 模型 — 期货期权定价(国内商品/股指期权主流)。 (~242 tok)

## options/risk/

- `__init__.py` — 期权风险层 — 组合 Greeks 限额 + 情景压力测试。 (~24 tok)
- `greeks_limits.py` — 组合 Greeks 风险限额检查。 (~658 tok)
- `stress_test.py` — 期权组合情景压力测试。 (~869 tok)

## options/strategies/

- `__init__.py` — 期权策略子包。 (~154 tok)
- `directional.py` — 方向性期权策略:Long Call / Long Put / Covered Call / Protective Put。 (~1555 tok)
- `futures_combo.py` — class: combine, compute_from_signals (~1333 tok)
- `term_arbitrage.py` — class: compute (~1384 tok)
- `term_structure.py` — 期限结构策略:Calendar Spread(日历价差)。 (~536 tok)
- `volatility_long.py` — 买波动率策略:Long Straddle / Long Strangle。 (~909 tok)
- `volatility_short.py` — 卖波动率策略:Short Straddle / Short Strangle / Iron Condor / Iron Butterfly。 (~2146 tok)

## options/volatility/

- `__init__.py` — 期权波动率体系:IV 反求、已实现波动率、SVI 曲面、IV Rank/Percentile。 (~235 tok)
- `iv_rank.py` — IV Rank / IV Percentile / 波动率锥 — 期权择时核心指标。 (~450 tok)
- `iv_solver.py` — 隐含波动率反求 — Newton-Raphson + Brent fallback。 (~646 tok)
- `realized_vol.py` — 已实现波动率 — 5 种主流估计量。 (~568 tok)
- `surface.py` — from: set_forward, add_slice, build, get_iv + 5 more (~1462 tok)
- `svi_surface.py` — SVI (Stochastic Volatility Inspired) 隐含波动率曲面。 (~440 tok)

## portfolio/

- `__init__.py` (~0 tok)
- `capital_allocation.py` — CapitalAllocation: allocate, risk_parity (~237 tok)
- `correlation_matrix.py` — CorrelationMatrix: add_price, compute, diversify_score (~338 tok)
- `portfolio_manager.py` — PortfolioManager: update_prices, get_portfolio_stats, rebalance (~649 tok)

## quant_models/

- `__init__.py` — QuantModel: fit, predict, get_params (~90 tok)

## quant_models/models/

- `__init__.py` (~0 tok)
- `arima_model.py` — ARIMAModel: fit, predict, predict_next, get_params (~428 tok)
- `cluster_model.py` — ClusterModel: fit, predict, get_params (~568 tok)
- `copula_model.py` — CopulaModel: fit, predict, tail_dependence, get_params (~464 tok)
- `garch_model.py` — GARCHModel: fit, predict, predict_volatility, get_params (~488 tok)
- `har_rv_model.py` — HAR-RV (Heterogeneous Autoregressive Realized Volatility) 模型。 (~1018 tok)
- `heston_model.py` — Heston 随机波动率模型 — 半解析期权定价 + 蒙特卡洛路径模拟。 (~1233 tok)
- `hmm_model.py` — HMModel: fit, predict, predict_proba, get_params (~504 tok)
- `hurst_exponent.py` — HurstExponentModel: fit, predict, classify, get_params (~548 tok)
- `kalman_filter.py` — KalmanFilterModel: fit, predict, get_params (~505 tok)
- `linear_regression_model.py` — LinearRegressionModel: fit, predict, predict_next, get_params (~458 tok)
- `markov_regime.py` — MarkovRegimeModel: fit, predict, get_params (~444 tok)
- `monte_carlo_sim.py` — MonteCarloModel: fit, predict, summary, get_params (~466 tok)
- `pca_model.py` — PCAModel: fit, predict, get_params (~392 tok)
- `portfolio_optimization.py` — 组合优化模型 — 风险平价 / HRP / 最小方差 / 最大分散化 / 逆波动率。 (~1452 tok)
- `random_forest_model.py` — RandomForestModel: fit, predict, get_params (~697 tok)
- `risk_models.py` — 风险度量模型 — VaR / CVaR / EVT / 最大回撤 / 相关性破裂。 (~1412 tok)
- `sabr_model.py` — SABR 随机波动率模型 — Hagan (2002) 隐含波动率近似 + 校准。 (~763 tok)
- `short_rate_models.py` — 短期利率模型 — Vasicek 与 CIR(国债期货、利率衍生品定价基础)。 (~1008 tok)
- `svm_model.py` — SVMModel: fit, predict, get_params (~749 tok)
- `wavelet_denoiser.py` — WaveletDenoiserModel: fit, predict, get_params (~457 tok)

## research/

- `README.md` — Project documentation (~1115 tok)

## research/factor_lab/

- `factor_analyzer.py` — FactorAnalyzer: calculate_ic, calculate_ic_series, calculate_icir, layered_backtest + 3 more (~2082 tok)

## resonance/

- `__init__.py` (~0 tok)
- `engine.py` — class: adjust_weights_for_regime, calculate, set_weights (~1362 tok)

## risk/

- `__init__.py` (~0 tok)
- `drawdown_controller.py` — DrawdownController: update, locked, reset (~238 tok)
- `position_sizer.py` — calculate_kelly, calculate_position_size (~196 tok)
- `risk_manager.py` — from: check_signal (~517 tok)

## scripts/

- `collect_2026_futures.py` — -*- coding: utf-8 -*- (~1617 tok)
- `collect_futures_2025_2026.py` — main (~821 tok)
- `collect_options_2025.py` — main (~652 tok)
- `collect_stocks_2025_2026.py` — main (~686 tok)
- `daily_close.py` — class: log_info, log_ok, log_warn, log_error + 3 more (~7158 tok)
- `deploy.sh` (~289 tok)
- `download_all.py` — Checkpoint: save, is_done, mark_done, mark_fail + 6 more (~1586 tok)
- `download_parallel.py` — get_remaining_tasks, collect_single_task, update_checkpoint, main (~1388 tok)
- `fill_futures_history.py` — FuturesHistoryFiller: ensure_product, collect_product, run, main (~1780 tok)
- `fill_history.py` — DataFiller: fill_futures, fill_stocks, fill_etf_options, fill_index_options (~4022 tok)
- `fill_option_history.py` — OptionHistoryFiller: get_trading_days, collect_etf_option_daily, collect_index_option_hist, run + 1 (~2509 tok)
- `fill_stocks_2024.py` — main (~338 tok)
- `fix_option_contracts_direct.py` (~1070 tok)
- `fix_option_contracts_sql.py` (~1232 tok)
- `fix_option_contracts.py` — get_option_product_code, is_option_code, get_underlying_product, fix_option_contracts (~1484 tok)
- `generate_alpha_factors.py` — Generate alpha033-101 factor files with real WorldQuant-style formulas. (~6326 tok)
- `init_db.py` (~7008 tok)
- `init_vps.sh` (~362 tok)
- `setup.sh` — Trading Strategy Center — 一键启动脚本 (Local Dev) (~1166 tok)
- `upgrade_alpha001_030.py` — Batch upgrade Alpha001-030 to real WorldQuant Alpha101 formulas. (~3078 tok)

## signals/

- `__init__.py` (~0 tok)
- `agents.py` — 多 agent 交易决策委员会 — 几个 agent 各看一个维度, 主席加权裁决。 (~4559 tok)
- `alert_aggregator.py` — 交易信号聚合器；全品种扫描、数据质量 gate、策略质量元数据、alert_signals.json 持久化，并带 300s stale-cache 后台自愈刷新。 (~9300 tok)
- `base.py` — Direction: compute (~347 tok)
- `catalog.py` — StrategyType: to_dict, register, build_from_registry, query + 1 more (~4093 tok)
- `engine.py` — View: get (~573 tok)
- `indicators.py` — SMA, EMA, RSI, MACD + 29 more (~3418 tok)
- `price_action.py` — detect_engulfing, detect_doji, detect_hammer, detect_shooting_star + 3 more (~610 tok)
- `registry.py` — register, get_strategy, list_strategies, get_all_strategies (~129 tok)
- `strategy_signal.py` — class: to_dict, grade, compute_signal_status, update_status (~1683 tok)

## signals/layering/

- `__init__.py` (~51 tok)
- `layer_strategies.py` — FilterMarketNoise: compute, compute, compute (~1625 tok)

## signals/strategies/

- `__init__.py` — 策略包自动加载器。 (~389 tok)
- `arbitrage_carry.py` — 套利 / Carry / 期限结构 / 季节性策略。 (~3118 tok)
- `arbitrage_extended.py` — 套利策略增强版 — 补充 arbitrage_carry.py 之外的套利变体。 (~1103 tok)
- `breakout_extended.py` — 突破类策略扩展。 (~1939 tok)
- `breakout_strategies.py` — BreakoutDonchian: compute, compute, compute (~1422 tok)
- `candlestick_strategies.py` — K线形态策略 — 增强版 15 种蜡烛图形态识别。 (~1600 tok)
- `chan_strategies.py` — 缠论买卖点策略 — 接入专业版 chan.py 引擎 (analysis/chan_pro)。 (~783 tok)
- `filter_strategies.py` — FilterVolatility: compute, compute, compute (~1447 tok)
- `gtja_short_term_factors.py` — 国泰君安短周期价量因子策略。 (~2709 tok)
- `harmonic_strategies.py` — 谐波形态策略 — Gartley/Bat/Butterfly/Crab XABCD 五点形态识别。 (~1284 tok)
- `hht_strategies.py` — HHT 希尔伯特-黄变换择时策略。 (~1018 tok)
- `mean_reversion_extended.py` — 均值回归类策略扩展。 (~2775 tok)
- `momentum_extended.py` — 动量类策略扩展。 (~2149 tok)
- `momentum_strategies.py` — MomentumRoc: compute, compute, compute (~1635 tok)
- `pair_trading_strategies.py` — 配对交易策略 — 基于协整关系的价差均值回归。 (~1111 tok)
- `qrs_strategies.py` — QRS 低延迟择时策略 — 基于高低价波动率比率的量化择时信号。 (~853 tok)
- `quants_playbook_advanced.py` — QuantsPlaybook 高级策略集成 — 扩散指标/时变夏普/小波SVM/特征分布/聪明钱。 (~4500 tok)
- `quants_playbook_pattern.py` — QuantsPlaybook 形态/情绪策略集成 — NH-NL/GSISI/点位效率/MA通道/CCK羊群。 (~3768 tok)
- `quants_playbook_timing.py` — QuantsPlaybook 择时类策略集成 — RSRS/ICU/HMA/LLT/FRAMA/高阶矩/鳄鱼线/趋与势。 (~5664 tok)
- `quants_playbook_volume.py` — QuantsPlaybook 量价/资金流策略集成 — 价量共振/量能动量/北向资金/熊牛指标/相对强弱。 (~3694 tok)
- `reversal_strategies.py` — ReversalRsi: compute, compute, compute (~1410 tok)
- `trend_extended.py` — 趋势类策略扩展(CTA 主力)。 (~3911 tok)
- `trend_strategies.py` — TrendMaCross: compute, compute, compute, compute (~1930 tok)
- `volatility_regime_strategies.py` — 波动率制度策略 — 基于历史波动率百分位的制度检测与信号过滤。 (~919 tok)

## simulation/

- `__init__.py` (~0 tok)
- `pnl_calculator.py` — PnLCalculator: update, close_trade, summary (~453 tok)
- `position_manager.py` — View: get (~749 tok)
- `rule_engine.py` — RuleEngine: add_rule, check, check_all, min_confidence_rule + 3 more (~280 tok)
- `scoring.py` — score_positions (~194 tok)
- `sim_engine.py` — class: execute_signal, close_position, get_portfolio_summary (~974 tok)
- `simulated_trading.py` — 模拟交易服务 — 持仓/历史/关注列表的 JSON 持久化 + 盈亏计算。 (~1958 tok)

## tasks/

- `__init__.py` (~0 tok)
- `backtest_tasks.py` — run_backtest, compare_strategies (~1286 tok)
- `celery_app.py` (~566 tok)
- `scheduled_tasks.py` — Celery Beat 调度任务 — 替代 main.py _background_loop 的所有后台定时任务。 (~1705 tok)
- `training_tasks.py` — train_pipeline, train_all_models (~1079 tok)

## tests/

- `__init__.py` (~0 tok)
- `test_backtest.py` — Tests: run_returns_result, fields (~379 tok)
- `test_commodity_option_year.py` — 商品期权按年逐日采集 — 单测 (内存库, 合成三所格式日线)。 (~700 tok)
- `test_contract_lifecycle.py` — 合约生命周期 — 单测 (纯函数, 合成数据)。 (~565 tok)
- `test_data_layer_hardening.py` — Data hardening regressions for upsert/trading time/latest sync stock 60m/options since/ZC skip. (~1126 tok)
- `test_futures_strategies.py` — 期货策略行为正确性测试。 (~1604 tok)
- `test_options_analytics.py` — compute_option_greeks 单测 — 合成输入, 不触网/不触库。 (~562 tok)
- `test_options_collector_greeks.py` — OptionsCollector 商品期权 Greeks 编排集成测试；使用隔离 PostgreSQL schema 与合成行情。 (~700 tok)
- `test_options.py` — 期权层单元测试 — 定价 / Greeks / 波动率 / 策略 / 风险 / 分析。 (~2686 tok)
- `test_quant_models_extended.py` — 扩展量化模型的单元测试。 (~2414 tok)
- `test_resonance.py` — Tests: detect, empty, output_type, strong_buy + 7 more (~851 tok)
- `test_signals.py` — Signals/indicators/registry/AlertAggregator regressions: freshness, full futures universe, stale-product skip, strategy quality, signal cache self-healing。 (~2600 tok)
- `test_strategy_api_contracts.py` — Strategy API contract regressions for asset-aware data loading, complete-contract preservation, trusted Walk-forward evidence, and compatibility responses. (~1700 tok)
- `test_stocks_incremental.py` — StocksCollector.incremental_sync — 单测 (内存库, mock 网络)。 (~688 tok)
- `test_stocks_info_financial.py` — StocksCollector 信息/财务落库 — 单测 (内存库, 合成 akshare 格式)。 (~603 tok)
- `test_warehouse_helpers_options_kb.py` — warehouse API 辅助函数 + 期权知识库 — 单测。 (~380 tok)

## tests/integration/

- `__init__.py` (~0 tok)
- `test_alpha_pipeline.py` — Integration tests for the Alpha101 factor pipeline. (~1080 tok)
- `test_api_endpoints.py` — Integration tests for all API endpoints. (~1668 tok)
- `test_intelligence_upgrade.py` — Tests: full_alpha_pipeline, alpha101_classes, ic_weight_combination, regime_weight_combination + 10 more (~7086 tok)

## tests/unit/

- `__init__.py` (~0 tok)
- `test_adaptive.py` — Tests: create_space, default_log_scale, init, normalize_in_range + 32 more (~5476 tok)
- `test_agents.py` — 多 agent 交易决策委员会 — 单测。 (~662 tok)
- `test_alpha.py` — Tests: init, register_factor, register_multiple, get_factor + 30 more (~3109 tok)
- `test_alpha001_010.py` — Tests: alpha_factor, alpha_factor_description, alpha_factor_compute_with_lookback, alpha004_edge_case_high_equals_low + 1 more (~738 tok)
- `test_alpha011_030.py` — Tests: alpha_factor, alpha_factor_description, alpha_factor_compute_with_lookback, alpha011_correlation_momentum + 4 more (~1156 tok)
- `test_alpha031_060.py` — Tests: alpha_factor, alpha_factor_description, alpha_factor_compute_with_lookback, alpha_factor_not_all_nan + 1 more (~741 tok)
- `test_alpha061_101.py` — Tests: alpha_factor, alpha_factor_description, alpha_factor_compute_with_lookback, alpha_factor_not_all_nan + 1 more (~739 tok)
- `test_alpha101_base.py` — Tests: is_abstract, subclass_interface, validate_with_complete_data, validate_with_missing_columns + 6 more (~1521 tok)
- `test_alpha101.py` — Tests: is_abstract, subclass_interface, is_alpha_base, properties + 8 more (~1053 tok)
- `test_auto_iteration.py` — 自动迭代调度 (B 阶段) — 单测。 (~610 tok)
- `test_catalog_feedback.py` — Phase4 A篇 — 策略目录 + C篇 反馈闭环 测试。 (~1205 tok)
- `test_champion_challenger.py` — Champion/Challenger 安全晋级 (阶段4) — 单测。 (~834 tok)
- `test_chan_pro.py` — 缠论专业版引擎集成 (chan.py vendored) — 单测。 (~689 tok)
- `test_eastmoney_guba.py` — 东财股吧舆情采集器 — 单测。 (~421 tok)
- `test_factor_cli.py` — factor_cli 统一入口 — 单元测试 (CSV 路径, 不依赖仓库/网络)。 (~819 tok)
- `test_factor_mining.py` — 因子挖掘 — 单元测试 (Spec §7.1)。 (~1087 tok)
- `test_factor_phase2.py` — 因子管理 Phase2 — 算子集/健康检测/行业中性化/报告 单元测试。 (~1395 tok)
- `test_fundamental_agent.py` — 基本面 Agent 单元测试。 (~2600 tok)
- `test_macro_news.py` — 新闻宏观仪表盘 — 新增模块单测 (纯逻辑, 不触网/不触库)。 (~778 tok)
- `test_ml_auto_advisor.py` — Phase4 B篇 ML自动迭代 + D篇 LLM建议器 测试。 (~1181 tok)
- `test_ml_features.py` — ML 特征工程测试。 (~726 tok)
- `test_ml_registry.py` — ML 模型注册中心 / sklearn 包装 / 超参搜索 / 集成 测试。 (~980 tok)
- `test_news_pipeline_cache.py` — Regression tests for macro-news stale cache refresh, manual single-flight, and atomic cache writes. (~420 tok)
- `test_options_strategies_extended.py` — 期权-期货联合策略 / ML 信号适配器 扩展测试。 (~689 tok)
- `test_options_surface.py` — 期权波动率曲面 / 期限结构套利 测试。 (~996 tok)
- `test_promotion_gate.py` — 晋升闸门 (阶段2) — 单测。 (~681 tok)
- `test_retrain_orchestrator.py` — 重训编排器 (阶段3) — 单测。 (~499 tok)
- `test_risk_metrics_ext.py` — empyrical 风险指标扩展 — 单测。 (~372 tok)
- `test_tournament_runner.py` — 锦标赛真实回测编排 (阶段1) — 单测。 (~920 tok)
- `test_ump.py` — UMP 裁判机制 (交易级否决闸门) — 单测。 (~931 tok)
- `test_warehouse.py` — PostgreSQL 仓库、注册表、聚合器与日期解析测试；通过共享隔离 schema fixture 运行。 (~1500 tok)

## tournament/

- `scoring.py` — ── 7因子加权评分 (借鉴 QuantDinger experiment/scoring.py) ── (~1119 tok)
- `tournament_manager.py` — class: register_strategy, record_trade, record_result, update_scores + 3 more (~1643 tok)
- `tournament_runner.py` — 锦标赛回测编排层 — 让反馈变真 (阶段1)。 (~1714 tok)

## vendor/chanpy/Combiner/

- `KLine_Combiner.py` — CKLine_Combiner: clean_cache, time_begin, time_end, high + 16 more (~1804 tok)

## vendor/chanpy/DataAPI/

- `chan_df_api.py` — 自定义 DataAPI — 从内存 DataFrame 喂给 chan.py。 (~416 tok)

## vendor/chanpy/Seg/

- `Eigen.py` — CEigen: update_fx, GetPeakBiIdx (~321 tok)
- `Seg.py` — CSeg: set_seg_idx, check, add_zs, cal_klu_slope + 20 more (~1693 tok)
- `.omo/plans/strategy-evolution-loop-upgrade.md` — Audit-backed upgrade plan for strategy-library/backtest/tournament/evolve/resonance/feedback closed-loop automation. (~3500 tok)
- `api/routes/research_candidate_routes.py` — 研究/模型候选策略 API；JSON 存储 draft/promoted/backtested/challenger/retired，桥接策略创建/统一回测，用 sync_watchlist 阻断异常标的，并按回测质量自动 challenger 分级。 (~3600 tok)
- `frontend/src/services/researchCandidateApi.ts` — 前端 Research Candidate 客户端；create/list/promote/runBacktest typed wrappers for `/api/v1/research/candidates`。 (~900 tok)
- `frontend/src/App.tsx` — React Router lazy route registry for dashboard/data/research/model/strategy pages; maps `/factors`, `/phase3`, `/strategy-library`, `/volatility`, `/feature-store`. (~900 tok)
- `frontend/src/components/Layout.tsx` — Main app navigation/sidebar/menu grouping for data, research, strategy, model, trading pages. (~1800 tok)
- `frontend/src/pages/StrategyLibrary.tsx` — Strategy library UI for catalog/user strategies and management actions; good host for candidate strategy pool tab. (~3500 tok)
- `frontend/src/pages/Phase3.tsx` — Phase3/model-options page with ML features, options surface/arbitrage/combination analysis. (~2800 tok)
- `frontend/src/pages/FeatureStorePage.tsx` — Feature store page showing ML feature definitions/status and model feature information. (~1600 tok)
- `frontend/src/pages/ResearchCenter.tsx` — Research center dashboard/overview for news, market intelligence, factors, pipeline state. (~4200 tok)
- `frontend/src/services/phase3Api.ts` — Frontend client wrappers for Phase3/model-options endpoints. (~700 tok)
- `frontend/src/services/strategyApi.ts` — Frontend strategy-library/tournament/backtest/evolve API wrappers. (~1700 tok)

- `frontend/src/components/ResearchCandidatePool.tsx` — 策略库候选策略池组件；展示研究/模型候选，支持资产/状态筛选、后端质量评分、异常跳过标注、批量回测/入库与人工淘汰。 (~2800 tok)

- 	ests/unit/test_simulated_trading_account.py — Regression tests for simulated trading account cash/equity, AG2608 realized PnL contribution, open-position margin, and insufficient-margin rejection. (~700 tok)

- core/llm/config_store.py — Runtime LLM provider configuration store; protects write-only API keys, exposes masked provider metadata, and converts custom providers into registry config. ~291 lines.
- tests/unit/test_llm_config.py — Unit tests for LLM config key masking/preservation/activation and OpenAI Responses payload generation. ~106 lines.


- `config/models.yaml` — Default LLM registry config; intentionally empty so `/llm-config` custom provider CRUD is the source for user-managed providers. (~80 tok)
- `data/llm_providers.json` — Runtime UI-managed LLM provider store; currently empty, later stores protected write-only API key ciphertext plus provider metadata. (~40 tok)

- `frontend/src/components/LLMInsightCard.tsx` ? Shared AI insight card for business pages; loads selectable text/vision providers, calls `/api/v1/llm/tasks/run`, and displays LLM/fallback analysis with safety wording. (~260 tok)

- `tests/unit/test_realtime_quote.py` — Realtime quote warehouse fallback regression; verifies unified store use and M5-first current price source. (~450 tok)

## 2026-07-17 Additions
- `api/system_health_overview.py` — Builds /api/v1/health/overview real-data health summary from kline freshness, alert signals, simulated trading account/quotes, and LLM provider config. ~220 lines.
- `frontend/src/components/dashboard/SystemOverviewCard.tsx` — Dashboard health overview card showing score, component tags, stale data items, and recommended actions from SystemOverview API. ~135 lines.
- `tests/unit/test_system_health_overview.py` — Unit tests for health overview freshness status and aggregate status degradation. ~30 lines.
- `tests/unit/test_app_lifecycle.py` — Regression tests for one-time realtime scheduler autostart and shutdown that preserves restart preference. (~70 tok)
- `tests/unit/test_postgres_only_storage.py` — Architecture guard that rejects runtime DuckDB imports across analysis/API/core/data-center/tournament modules. (~100 tok)

- `frontend/src/pages/KlineChartPage.tsx` — TradingView lightweight-charts based K线研究页；支持股票/期货/期权标的选择、M5/H1/D1周期、MA/BOLL/VOL/MACD/RSI公式图层、策略信号叠加和LLM图形解读。 (~4200 tok)
- `frontend/src/services/chartApi.ts` — 前端K线图表服务；typed wrappers for /api/v1/warehouse/symbols and /api/v1/warehouse/kline. (~500 tok)

- `frontend/src/pages/KlineChartPage.tsx` ? TradingView lightweight-charts based K?????????/??/???????M5/H1/D1???MA/BOLL/VOL/MACD/RSI??????????????????????????????LLM????? (~4200 tok)

- `api/services/agent_credentials.py` — PostgreSQL-backed HMAC Agent key lookup.
- `api/services/agent_rate_limit.py` — fixed-window Agent auth limiter.
- `scripts/create_agent_api_key.py` — one-time plaintext Agent key provisioning CLI.
- `core/db/migrations/versions/merge_storage_heads.py` — merges historical migration heads.
- `core/db/migrations/versions/add_agent_api_keys.py` — creates hashed Agent credential table.
- `tests/unit/test_agent_auth_security.py` — Agent auth security and strategy contract tests.
- `tests/unit/test_create_agent_api_key.py` — Agent key provisioning tests.
- `tests/unit/test_strategy_evolution_deployment.py` — ML deployment whitelist test.

core/agents/ — 3.0 Agent Kernel typed protocols, task state machine, and PostgreSQL repository. (~900 tok)
core/db/migrations/versions/add_agent_kernel.py — PostgreSQL migration for seven Agent Kernel tables with constraints and reversible downgrade. (~1600 tok)
	ests/unit/test_agent_kernel_protocol.py — protocol immutability and transition tests. (~350 tok)
	ests/unit/test_agent_kernel_repository.py — repository idempotency and audit-event tests. (~320 tok)
	ests/integration/test_agent_kernel_postgres.py — real PostgreSQL round-trip and transaction rollback test. (~400 tok)
api/routes/agent_kernel_routes.py — feature-gated v3 task API draft; pending router registration. (~850 tok)


core/agents/tool_protocol.py — strict executor/result contracts for Agent tools. (~250 tok)
core/agents/tool_registry.py — approval-aware production tool registry. (~450 tok)
tests/unit/test_agent_tool_registry.py — tool registration, evidence, asset, approval contract tests. (~300 tok)
core/agents/data_tools.py — PostgreSQL-backed main-contract resolver adapter with structured evidence. (~450 tok)
tests/unit/test_agent_data_tools.py — main-contract tool contract tests. (~180 tok)
tests/unit/test_agent_data_quality_tools.py — PostgreSQL data coverage/freshness adapter tests. (~180 tok)
core/agents/research_agent.py — quality-gated multi-tool Research Agent orchestration. (~500 tok)
tests/unit/test_research_agent.py — Research Agent gate, composition, and failure tests. (~250 tok)
api/routes/agent_kernel_routes.py — feature-gated Agent task and Research Agent API. (~1100 tok)
core/agents/plan_layer.py — strict Pydantic LLM plan schema and kernel conversion. (~350 tok)
tests/unit/test_agent_plan_layer.py — LLM plan validation tests. (~150 tok)
core/agents/executor.py — dependency-aware controlled plan executor with optional tool-call persistence. (~450 tok)
tests/unit/test_agent_executor.py — dependency and cycle safety tests. (~180 tok)
frontend/src/pages/AgentWorkbench.tsx — Agent task creation and event timeline workbench. (~800 tok)
frontend/src/services/agentV3Api.ts — typed v3 Agent task/event API client. (~350 tok)
core/agents/evolution_agent.py — deterministic strategy evolution decisions with mandatory Champion approval. (~350 tok)
tests/unit/test_strategy_evolution_agent.py — challenger, degradation, and Champion approval tests. (~180 tok)
core/agents/strategy_tools.py — PostgreSQL agent_artifacts candidate strategy catalog tool. (~350 tok)
tests/unit/test_agent_strategy_tools.py — PostgreSQL candidate artifact tool contract. (~150 tok)
core/agents/research_tools.py — PostgreSQL macro, market-regime, factor, and UMP risk tools. (~750 tok)
tests/unit/test_agent_research_tools.py — research and UMP evidence/failure contract tests. (~280 tok)
core/agents/release_gate.py — independent publication gate requiring human approval and UMP clearance. (~180 tok)
tests/unit/test_agent_release_gate.py — publication gate safety tests. (~130 tok)
core/agents/active_tasks.py — PostgreSQL scheduled-task row-lock claimer. (~180 tok)
tests/unit/test_agent_active_tasks.py — scheduled claim safety tests. (~120 tok)
core/agents/llm_planner.py — multi-provider LLM JSON plan generator constrained to registered tools. (~350 tok)
tests/unit/test_agent_llm_planner.py — LLM plan schema and tool-allowlist tests. (~150 tok)
core/agents/model_tools.py — PostgreSQL model/feature catalog and model drift tool implementations.

- `core/agents/news_tools.py` ? PostgreSQL-only news sentiment evidence tool; fails closed without persisted snapshots.
- `core/db/migrations/versions/add_news_snapshots.py` ? News snapshot table and indexes migration.
- `api/services/news_snapshot_service.py` ? Normalizes pipeline sentiment and upserts news snapshots into PostgreSQL.
- `tests/unit/test_agent_news_tools.py` ? Agent news tool PostgreSQL and no-data contracts.
- `tests/unit/test_news_snapshot_service.py` ? News normalization and PostgreSQL upsert contracts.
- core/agents/worker.py — Single-cycle PostgreSQL scheduled task worker with fail-closed terminal handling.
- `core/agents/signal_fusion.py` — Deterministic weighted fusion of market, factor, news, strategy, and model evidence with blockers/conflict detection.
- `core/agents/candidate_generator.py` — Bounded non-deployable strategy candidate proposal generator based on fused research signals.
- `core/agents/strategy_orchestrator.py` — Sequential candidate validation orchestration and TournamentStrategy persistence.
- `core/agents/tournament_round.py` — Deterministic rank, keep-ratio elimination, and Challenger classification for tournament rounds.
- `frontend/src/services/agentV3Api.ts` — Agent v3 API client including tournament standings and fused signal contracts.
- `api/routes/agent_kernel_routes.py` — Agent v3 APIs including approval context with linked research artifacts and release constraints.

- `core/agents/approval_revalidation.py` ? Scoped evidence fingerprinting and approval revalidation helpers.

- `core/agents/worker.py` ? PostgreSQL persisted task execution and scheduled worker cycle.
- `core/agents/executor.py` ? Dependency-aware tool execution with timeout and retry boundaries.

- `core/agents/active_tasks.py` ? Scheduled task claiming with leases and stale recovery.
- `tasks/agent_tasks.py` ? Celery entrypoint for durable Agent scheduled cycles.
- `core/db/migrations/versions/add_agent_scheduler_leases.py` ? Agent task lease schema migration.

- `core/agents/proactive_triggers.py` ? Deterministic anomaly-to-AgentTask trigger evaluation and deduplicated enqueue.
- `tasks/agent_tasks.py` ? Celery proactive trigger scan entrypoint.

- `core/agents/runtime_monitor.py` ? PostgreSQL Agent runtime metrics and threshold alert persistence.
- `tests/unit/test_agent_runtime_monitor.py` ? Runtime metric and alert suppression contracts.

- `core/agents/active_tasks.py` ? Atomic lease claim, heartbeat renewal, and expired-task recovery.
- `core/agents/worker.py` ? Background heartbeat supervision with ownership-loss cancellation.

- `core/agents/admission.py` ? PostgreSQL concurrency, cost budget, and circuit-breaker admission control.
- `core/db/migrations/versions/add_agent_runtime_control.py` ? Runtime admission state migration.

- `core/agents/release_readiness.py` ? Machine-executable Agent 3.0 release gate checks.
- `scripts/verify_agent_release.py` ? CI/operations release gate runner.
- `core/db/migrations/env.py` ? Alembic now uses the application PostgreSQL URL when SQLALCHEMY_URL is absent.

- `scripts/align_legacy_alembic_baseline.py` — Guarded PostgreSQL legacy baseline alignment CLI; dry-run by default, reconciles missing core tables, stamps exact revision, upgrades Agent migrations only with explicit database-name confirmation.
- `core/db/migrations/versions/reconcile_legacy_core_tables.py` — Non-destructive legacy reconciliation migration that creates missing ORM core tables with checkfirst and never drops legacy data on downgrade.

- `docs/AGENT_3_RELEASE_RUNBOOK.md` — Production PostgreSQL baseline alignment, backup, validation, approval, and recovery runbook for Agent 3.0 release.
- `docs/EXPERT_UPGRADE_BRIEF.md` — Expert-model review brief and phased GPT implementation contract covering current-state evidence, priorities, safety boundaries, acceptance, and rollback. (~6500 tok)

- `core/agents/market_context.py` ? Canonical cross-market asset identity, deterministic market-regime classification, and multi-timeframe consensus.
- `core/agents/portfolio_risk.py` ? Portfolio exposure, volatility, VaR/CVaR, margin, concentration, liquidity, and option Greeks aggregation.
- `core/agents/strategy_lifecycle.py` ? Auditable strategy lifecycle state machine with mandatory human approval for Champion promotion.
- `core/agents/research_knowledge.py` ? PostgreSQL research-memory and factor-lineage repository service.
- `core/agents/decision_pipeline.py` ? Read-only end-to-end research, risk, and lifecycle recommendation pipeline; never permits live execution.
- `core/agents/operations_health.py` ? Data-source health scoring and safe manual replay recommendations.
- `core/db/migrations/versions/add_agent_research_risk.py` ? Agent 3.0 research memory, factor lineage, and strategy lifecycle schema migration.
- `tests/unit/test_agent_market_context.py` ? Market context and timeframe consensus tests.
- `tests/unit/test_agent_strategy_risk_lifecycle.py` ? Portfolio risk and strategy lifecycle safety tests.
- `tests/unit/test_agent_decision_pipeline.py` ? End-to-end decision recommendation and risk blocker tests.
- `tests/unit/test_agent_operations_health.py` ? Data-source health and replay guidance tests.


## 2026-08-11 additions
- signals/quality.py — deterministic signal gates, dynamic weighted scores, Bayesian confidence, cooldown filtering
- signals/outcomes.py — forward outcome evaluator with MFE/MAE
- signals/outcome_store.py — PostgreSQL signal observation persistence and quality summary
- signals/selection.py — correlation-aware long/short portfolio candidate selection
- data_center/core/resilience.py — source circuit breaker and health registry
- core/db/migrations/versions/add_signal_quality_loop.py — signal observation schema migration
- tests/unit/test_signal_quality_v3.py — four-phase signal acceptance tests
- tests/unit/test_data_source_resilience.py — source resilience acceptance tests
- `core/db/migrations/versions/add_instrument_commission_model.py` — Adds explicit fixed/ratio commission fields and persistent paper positions. (~220 tok)
- `core/db/migrations/versions/harden_agent_runtime.py` — Adds bounded Agent lease recovery attempts and approval-expiry persistence. (~260 tok)
- `core/db/migrations/versions/complete_ops_governance.py` — Adds durable operational health snapshots and monitor-alert delivery fields. (~340 tok)
- `core/db/migrations/versions/add_collection_checkpoints.py` — Makes the unified PostgreSQL collection checkpoint table part of the Alembic schema. (~300 tok)
- `.github/workflows/ml-validation.yml` — Manual 60-minute heavy ML gate installing `.[ml,dev]` and testing HMM, Arch, TensorFlow, and Torch paths. (~220 tok)
- `core/ops/health_snapshot.py` — Collects backup, data freshness, checkpoint, signal, and queue health metrics. (~300 tok)
- `tasks/alert_delivery.py` — Retries persisted monitor alerts through configured Feishu delivery. (~240 tok)
- `core/ops/__init__.py` — Operational health package marker. (~30 tok)
- `trading/broker_adapter.py` — Defines disabled live-broker contract, order states, reconciliation types, and execution risk policy. (~500 tok)
- `docs/BROKER_INTEGRATION.md` — Documents the fail-closed live broker boundary and acceptance requirements. (~220 tok)
- `scripts/install_systemd_units.sh` — Installs and reloads supervised API, worker, and Beat systemd units. (~180 tok)
- `scripts/systemd/trading-center.service` — Systemd unit for the FastAPI service. (~120 tok)
- `scripts/systemd/trading-center-worker.service` — Systemd unit for the Celery worker. (~120 tok)
- `scripts/systemd/trading-center-beat.service` — Systemd unit for Celery Beat. (~120 tok)
- `tests/unit/test_broker_adapter.py` — Verifies fail-closed broker contract and execution risk policy. (~260 tok)
- `tests/unit/test_ops_governance.py` — Covers durable ops snapshots, alert delivery, LLM ledger, and audit behavior. (~420 tok)
- `tests/unit/test_sync_scheduler_ownership.py` — Verifies Beat owns realtime sync and API start/stop only persist state. (~220 tok)
- `tests/unit/test_research_factor_strategy_expansion.py` — Acceptance contract for 96 unique point-in-time research factors, 32 fail-closed strategy templates, and exception-free execution of all 579 factors/143 strategies. (~650 tok)
- `core/alpha/alpha101/research_factors.py` — Declarative 96-factor public research catalog with formula fingerprints, point-in-time calculators, and explicit optional-data contracts. (~4500 tok)
- `signals/strategies/research_expansion.py` — Declarative 32-strategy public research catalog with logic fingerprints, dynamic registration, and fail-closed optional-data templates. (~6000 tok)
- `docs/FACTOR_STRATEGY_EXPANSION_CATALOG.md` — Auditable 96-factor/32-strategy expansion catalog, de-duplication policy, data contracts, and promotion acceptance process. (~2800 tok)
- `trading/instrument_store.py` — Syncs PostgreSQL contract metadata into executable instrument specifications with commission semantics. (~420 tok)
- `trading/option_volatility.py` — Defined-risk option screening and IV surface/skew/term summary. (~420 tok)
- `signals/cross_sectional.py` — Cost-adjusted cross-sectional ranking and point-in-time market feature construction. (~430 tok)
- `api/routes/paper_trading_routes.py` — PostgreSQL paper orders, fill reconciliation, positions, and kill switch API. (~850 tok)

- `frontend/src/components/TradingValidationConsole.tsx` — Agent workbench trading validation console with signal economics, trusted backtest, PG cross-section, options, and paper execution gates. (~2400 tok)
- `frontend/src/services/tradingWorkbenchApi.ts` — Typed frontend client for trading validation and paper execution APIs. (~650 tok)
- `../trading-agent-center/src/trading_agent_center/interfaces/mcp/server.py` — Fixed eight-tool read-only MCP adapter backed by shared application handlers. (~700 tok)
- `../trading-agent-center/docs/PHASE1_ACCEPTANCE.md` — Phase 1 scope, live acceptance evidence, safety assertions, and known warning. (~550 tok)
- `../trading-agent-center/tests/test_mcp_server.py` — MCP/application envelope parity, whitelist, and optional SDK tests. (~450 tok)
- `../trading-research-vault/06-Reviews/Phase-1-Read-Only-Bridge-Acceptance.md` — Point-in-time Vault record of Phase 1 integration acceptance and boundaries. (~320 tok)
- `../trading-agent-center/src/trading_agent_center/domain/execution.py` — Native next-bar-open execution foundation with directional limits, position validation, margin, commission, and long/short ledger state. (~1700 tok)
- `../trading-agent-center/src/trading_agent_center/infrastructure/postgres_native_domain.py` — PostgreSQL persistence for effective-dated instrument specifications and versioned candidates. (~1300 tok)
- `../trading-agent-center/src/trading_agent_center/application/operations.py` — Scheduler ownership, operational snapshots, alerts, and atomic backup evidence helpers. (~700 tok)
- `../trading-agent-center/docs/PHASE4_ACCEPTANCE.md` — Phase 4 foundation evidence, remaining old/new differential gates, and ownership boundary. (~500 tok)
- `../trading-agent-center/docs/PHASE5_ACCEPTANCE.md` — Phase 5 operational foundation evidence and remaining alert/evaluation gates. (~400 tok)
- `../trading-research-vault/06-Reviews/Phase-4-Domain-Takeover-Progress.md` — Evidence-linked Vault review of native domain progress and unresolved parity gates. (~430 tok)
- `../trading-research-vault/06-Reviews/Phase-5-Operations-Progress.md` — Evidence-linked Vault review of scheduler, DR, policy, and remaining operational gaps. (~400 tok)
- `api/routes/definition_execution_routes.py` — Read-only, caller-supplied OHLCV execution contract for registered factors and strategies; no mock generation or data writes. (~900 tok)
- `tests/unit/test_definition_execution_routes.py` — Contract tests for definition execution, stable signal fields, NaN normalization, unknown names, and input limits. (~500 tok)
- `tests/unit/test_gtja_evaluator_regressions.py` — Regression gates for GTJA parenthesized arithmetic, nested ternaries, Alpha190 rolling behavior, and balanced generated formula literals. (~450 tok)
- `api/routes/research_data_routes.py` — Fixed read-only Phase 6 PostgreSQL snapshot endpoint returning source-quality, authoritative-spec, main-switch, macro-release, and SHA-256 evidence. (~1400 tok)
- `tests/unit/test_research_data_routes.py` — Contract tests for immutable research bundles and rejection of unsafe symbols/timeframes. (~450 tok)
- `data_center/main_contract_switch_import.py` — Provenance-aware authoritative historical main-contract switch importer with HTTPS/document-hash validation and atomic entity resolution. (~1200 tok)
- `scripts/import_main_contract_switches.py` — Dry-run-by-default CLI for validating or explicitly applying authoritative switch archives. (~300 tok)
- `tests/unit/test_main_contract_switch_import.py` — Import contract tests for HTTPS provenance, historical dates, entity resolution, and document-hash persistence. (~450 tok)
- `core/db/migrations/versions/add_main_switch_unique_index.py` — Fail-closed Alembic migration adding the product/date uniqueness required for idempotent authoritative switch imports. (~500 tok)
- `core/db/migrations/versions/expand_main_switch_reason.py` — Expands main-switch reason to TEXT for structured audit evidence; downgrade refuses lossy truncation. (~350 tok)
- `tests/unit/test_main_switch_reason_migration.py` — Guards fresh-install and upgrade schemas for main-switch audit evidence capacity. (~180 tok)
- `scripts/collect_phase7_instrument_specs.py` — Collects current SHFE/INE economics with exchange and broker-rule evidence for ten target products. (~1100 tok)
- `scripts/collect_phase7_main_switches.py` — Reconstructs fail-closed two-day-confirmed main-contract switches from official SHFE/INE daily archives. (~1500 tok)
- `tests/unit/test_phase7_instrument_spec_collection.py` — Validates Phase 7 specification parsing, fee normalization, and evidence. (~450 tok)
- `tests/unit/test_phase7_main_switch_collection.py` — Validates switch confirmation, exchange evidence, completeness, and bounded retries. (~650 tok)
- `data_center/kline_official_verification.py` — Fail-closed SHFE/INE D1 bar verifier with per-document provenance and transactional updates. (~1500 tok)
- `data_center/continuous_research.py` — Point-in-time continuous futures selector using audited switches, official row gates, and prefix-consistent window construction. (~1100 tok)
- `data_center/continuous_official_backfill.py` — Dry-run-first SHFE/INE active-contract backfill with complete collection and transactional upsert statements. (~1500 tok)
- `backtest/trusted_backtest.py` — Trusted next-open execution runner with official instrument economics, three cost scenarios, fill-time trade ledger, and immutable run manifest. (~1500 tok)
- `scripts/verify_phase7_kline.py` — Dry-run-by-default CLI for official Phase 7 D1 verification. (~300 tok)
- `scripts/backfill_phase8_continuous.py` — Phase 8 CLI for dry-run/apply official continuous main-contract backfills. (~350 tok)
- `core/db/migrations/versions/add_kline_source_provenance.py` — Adds official URL, retrieval time, and document hash to K-line rows. (~350 tok)
- `tests/unit/test_kline_official_verification.py` — Verifies exact field matching, provenance writes, and zero-write mismatch behavior. (~600 tok)
- `tests/unit/test_continuous_research.py` — Verifies no-look-ahead switches, official gates, requested-window scope, and prefix consistency. (~700 tok)
- `tests/unit/test_continuous_official_backfill.py` — Verifies audited active-contract selection and transactional official upserts. (~450 tok)
- `backtest/trusted_walkforward.py` — Walk-forward runner retaining training warmup rows and enforcing OOS-only execution boundaries. (~350 tok)
- `backtest/trusted_backtest.py` — Trusted next-open engine adapter with OOS manifests, fill activity, and mark-to-market window equity. (~1500 tok)
- `tests/unit/test_trusted_walkforward.py` — Regression coverage for training warmup and OOS-only fills. (~650 tok)
- `tests/unit/test_trusted_backtest_runner.py` — Trusted execution, cost, and ending-position mark-to-market coverage. (~700 tok)
- `trading-agent-center/docs/PHASE9_DESIGN.md` — Defines strict CSCV PBO/DSR, no-dispersion fail-closed gates, and primary method sources. (~700 tok)
- `trading-agent-center/src/trading_agent_center/domain/phase9.py` — Pure statistical credibility domain for universe audit, CSCV PBO, and Deflated Sharpe evidence. (~1300 tok)
- `trading-agent-center/src/trading_agent_center/application/phase9.py` — Deterministic Phase 9 evidence service and immutable fingerprint construction. (~500 tok)
- `trading-agent-center/src/trading_agent_center/infrastructure/postgres_phase9.py` — PostgreSQL persistence for immutable Phase 9 statistical evidence. (~650 tok)
- `trading-agent-center/tests/test_phase9.py` — Validates CSCV partitions, DSR bounds, no-dispersion and invalid-matrix failure behavior. (~700 tok)
- `tests/unit/test_trusted_backtest_runner.py` — Verifies next-open execution, fill timestamps, stress costs, metrics, and run-manifest evidence. (~500 tok)
- `tests/unit/test_kline_source_provenance_migration.py` — Guards the K-line provenance migration chain and columns. (~180 tok)
- `scripts/collect_phase7_macro_releases.py` — Collects exact NBS/PBOC publication timestamps with per-page hashes and complete Phase 7 window coverage. (~2800 tok)
- `tests/unit/test_phase7_macro_release_collection.py` — Guards official title-to-period and exact page-time parsing. (~350 tok)
- `tests/unit/test_phase7_macro_linkage.py` — Ensures Phase 7 event coverage stays separate from heuristic trading weights. (~180 tok)
- `../trading-agent-center/src/trading_agent_center/domain/phase11.py` — Phase 11 candidate provenance, independence, factor-result, and strategy-result contract validators.
- `../trading-agent-center/src/trading_agent_center/application/phase11.py` — Phase 11 deterministic candidate audit service and immutable evidence envelope.
- `../trading-agent-center/src/trading_agent_center/infrastructure/postgres_phase11.py` — PostgreSQL persistence for Phase 11 candidate evidence.
- `../trading-agent-center/src/trading_agent_center/infrastructure/migrations/0008_phase11_candidate_evidence.sql` — Agent candidate evidence table migration.
- `../trading-agent-center/tests/test_phase11.py` — Phase 11 independence and result-contract unit tests.
- `../trading-agent-center/tests/test_postgres_phase11.py` — Phase 11 PostgreSQL evidence round-trip test.
- `../trading-agent-center/docs/PHASE11_DESIGN.md` — Phase 11 architecture and controls.
- `../trading-agent-center/docs/PHASE11_ACCEPTANCE.md` — Phase 11 acceptance criteria and real audit evidence boundary.
- `../trading-agent-center/docs/phase11_strategy_candidates.json` — Real Legacy research strategy candidate package used for the Phase 11 audit.
- `../trading-agent-center/src/trading_agent_center/domain/phase12.py` — Point-in-time extended observation bundle contract and fail-closed validator.
- `../trading-agent-center/src/trading_agent_center/application/phase12.py` — Phase 12 observation validation and optional immutable persistence service.
- `../trading-agent-center/src/trading_agent_center/infrastructure/postgres_phase12.py` — PostgreSQL repository for accepted observation evidence.
- `../trading-agent-center/src/trading_agent_center/infrastructure/migrations/0009_phase12_observation_evidence.sql` — Phase 12 observation evidence table migration.
- `../trading-agent-center/tests/test_phase12.py` — Extended observation contract tests.
- `../trading-agent-center/tests/test_phase12_cli.py` — Phase 12 CLI validation tests.
- `../trading-agent-center/src/trading_agent_center/domain/historical_data.py` — Phase 13 fail-closed normalized historical data contracts and local file loaders.
- `../trading-agent-center/src/trading_agent_center/application/historical_data.py` — Phase 13 validation and controlled import service.
- `../trading-agent-center/src/trading_agent_center/infrastructure/historical_data_files.py` — Provider-neutral local historical file adapter.
- `../trading-agent-center/src/trading_agent_center/infrastructure/postgres_historical_data.py` — Immutable PostgreSQL historical batch repository.
- `../trading-agent-center/src/trading_agent_center/infrastructure/migrations/0010_historical_market_data.sql` — Phase 13 historical batch table migration.
- `../trading-agent-center/tests/test_historical_data.py` — Phase 13 historical contract, parser, duplicate, and aggregation tests.
- `../trading-agent-center/docs/PHASE13_DESIGN.md` — Phase 13 design, safety boundary, and acceptance criteria.
- `../trading-agent-center/docs/TASKS.md` — Phase 13–16 task ledger and completion statuses.
- `../trading-agent-center/src/trading_agent_center/domain/phase14.py` — Point-in-time historical panel assembly and completeness gate.
- `../trading-agent-center/src/trading_agent_center/domain/phase15.py` — Research-only factor and strategy campaign evaluation.
- `../trading-agent-center/src/trading_agent_center/domain/phase16.py` — Fail-closed cross-phase release readiness audit.
- `../trading-agent-center/tests/test_phase14.py` — Panel join, provenance, and completeness tests.
- `../trading-agent-center/tests/test_phase15.py` — Factor, strategy, cost, and research-only campaign tests.
- `../trading-agent-center/tests/test_phase16.py` — Release audit and CLI envelope tests.
- `../trading-agent-center/tests/test_phase14_to_16.py` — End-to-end historical panel, research campaign, and release audit acceptance.
- `../trading-agent-center/docs/PHASE14_ACCEPTANCE.md` — Phase 14 acceptance record.
- `../trading-agent-center/docs/PHASE15_ACCEPTANCE.md` — Phase 15 acceptance record.
- `../trading-agent-center/docs/PHASE16_ACCEPTANCE.md` — Phase 16 acceptance record.
- `../trading-agent-center/src/trading_agent_center/domain/phase17.py` — Real official BU/RU D1 campaign factors, signals, and explicit blocked candidates.
- `../trading-agent-center/src/trading_agent_center/application/phase17.py` — Phase 17 source selection and immutable campaign orchestration.
- `../trading-agent-center/src/trading_agent_center/infrastructure/postgres_phase17.py` — Phase 17 PostgreSQL migration, source selection, persistence, and readback.
- `../trading-agent-center/src/trading_agent_center/infrastructure/migrations/0011_phase17_real_campaign.sql` — Immutable Phase 17 campaign table migration.
- `../trading-agent-center/tests/test_phase17.py` — Phase 17 domain, service, and mutation-gated CLI tests.
- `../trading-agent-center/docs/PHASE17_DESIGN.md` — Phase 17 real-data campaign design and safety boundary.
- `../trading-agent-center/docs/PHASE17_ACCEPTANCE.md` — Phase 17 real-data campaign acceptance record.
- `../trading-agent-center/src/trading_agent_center/domain/phase18.py` — Official BU/RU overlap alignment, rolling cross-market factors, and regime stability evidence.
- `../trading-agent-center/src/trading_agent_center/application/phase18.py` — Phase 18 official source selection and campaign orchestration.
- `../trading-agent-center/src/trading_agent_center/infrastructure/postgres_phase18.py` — Immutable Phase 18 campaign persistence and readback.
- `../trading-agent-center/src/trading_agent_center/infrastructure/migrations/0012_phase18_cross_market_campaign.sql` — Phase 18 campaign table migration.
- `../trading-agent-center/tests/test_phase18.py` — Phase 18 domain, source, service, and CLI tests.
- `../trading-agent-center/docs/PHASE18_DESIGN.md` — Phase 18 rolling cross-market research design.
- `../trading-agent-center/docs/PHASE18_ACCEPTANCE.md` — Phase 18 real campaign acceptance record.
- `../trading-agent-center/src/trading_agent_center/domain/capital_universe.py` — Computes and validates capital-aware collection, signal, margin, and no-execution controls from official evidence.
- `../trading-agent-center/src/trading_agent_center/application/capital_universe.py` — Applies validated capital-universe snapshots and exposes persisted controls.
- `../trading-agent-center/src/trading_agent_center/infrastructure/postgres_product_controls.py` — PostgreSQL persistence for current product collection and signal controls.
- `../trading-agent-center/src/trading_agent_center/infrastructure/migrations/0013_product_controls.sql` — Phase 19 product-control table migration.
- `../trading-agent-center/tests/test_capital_universe.py` — Capital gate, state separation, checked-in snapshot, service, and mutation-policy tests.
- `../trading-agent-center/docs/CAPITAL_UNIVERSE_100K.json` — Machine-readable official-evidence snapshot for the 100,000 CNY research profile.
- `../trading-agent-center/docs/CAPITAL_UNIVERSE_100K.md` — Human-readable initial, next-research, and collection-only product rationale.
- `../trading-agent-center/docs/PHASE19_DESIGN.md` — Phase 19 capital-aware universe design and research-only runtime boundary.
- `../trading-agent-center/docs/PHASE19_ACCEPTANCE.md` — Phase 19 implementation, persistence, provenance, and verification record.
- `../trading-research-vault/06-Reviews/Phase-19-Capital-Universe-Acceptance.md` — Verified Vault acceptance for the 100,000 CNY collection/signal universe.
- `../trading-agent-center/src/trading_agent_center/domain/phase20.py` — Fail-closed DCE M readiness audit for official history, switches, specifications, commissions, and capital fit.
- `../trading-agent-center/src/trading_agent_center/domain/phase20_dce.py` — Validates local official DCE M JSON archives, raw hashes, provenance, dates, OHLCV/OI fields, and safe paths.
- `../trading-agent-center/src/trading_agent_center/domain/phase20_continuous.py` — Builds point-in-time M continuous history with two-day open-interest switch confirmation.
- `../trading-agent-center/src/trading_agent_center/domain/phase20_research.py` — Evaluates M factors and cost-aware prior-close/next-open OOS strategy candidates under capital gates.
- `../trading-agent-center/tests/test_phase20.py` — Phase 20 acceptance, blocked-state, HTTPS provenance, capital-gate, and CLI tests.
- `../trading-agent-center/docs/PHASE20_M_READINESS.json` — Current machine-readable blocked evidence manifest for M soybean meal.
- `../trading-agent-center/docs/PHASE20_DESIGN.md` — Phase 20 soybean-meal onboarding design and no-downgrade provenance boundary.
- `../trading-agent-center/docs/PHASE20_PROGRESS.md` — Phase 20 current implementation and external-data blockers.
- `../trading-agent-center/src/trading_agent_center/domain/phase21.py` — Fail-closed CZCE MA readiness audit for history, switches, specifications, commissions, and capital fit.
- `../trading-agent-center/src/trading_agent_center/domain/phase21_czce.py` — Validates official CZCE MA FutureDataDaily text archives, provenance, field offsets, hashes, and OHLCV/OI values.
- `../trading-agent-center/src/trading_agent_center/domain/phase21_23_czce_specs.py` — Validates effective-dated CZCE MA/FG settlement, margin, commission, raw hashes, and daily multiplier cross-check coverage. (~2200 tok)
- `../trading-agent-center/scripts/acquire_czce_specs.py` — Resume-safe downloader for official CZCE `FutureDataClearParams.txt` archives. (~850 tok)
- `../trading-agent-center/tests/test_phase21_23_czce_specs.py` — Covers MA/FG specification parsing, commission modes, hashes, market matching, turnover rounding, and multiplier failures. (~1200 tok)
- `../trading-agent-center/tests/test_czce_spec_acquisition.py` — Guards resume-safe CZCE parameter index merging. (~250 tok)
- `../trading-agent-center/src/trading_agent_center/domain/phase23_24_continuous.py` — Builds shared point-in-time MA/FG/ZN continuous histories using two-day OI confirmation and next-trading-day switch effectiveness. (~1100 tok)
- `../trading-agent-center/src/trading_agent_center/domain/phase24_specs.py` — Validates indexed official SHFE ZN settlement, fee, margin, and multiplier evidence. (~1300 tok)
- `../trading-agent-center/scripts/acquire_phase23_24_archives.py` — Downloads and resume-merges official CZCE daily and SHFE daily archives for MA/FG/ZN research evidence. (~1100 tok)
- `../trading-agent-center/scripts/acquire_phase24_specs.py` — Downloads official SHFE ZN daily specification/cost snapshots into a hashed local index. (~700 tok)
- `../trading-agent-center/tests/test_phase23_24_acquisition.py` — Guards resumable official archive index merging. (~350 tok)
- `../trading-agent-center/tests/test_phase23_24_continuous.py` — Verifies MA/FG/ZN continuous-chain confirmation, effectiveness, and evidence gates. (~550 tok)
- `../trading-agent-center/tests/test_phase24_specs.py` — Verifies SHFE ZN specification/cost archive validation and failure cases. (~650 tok)
- `../trading-agent-center/src/trading_agent_center/domain/phase22.py` — Fail-closed SHFE RB readiness audit for official history, switch chain, effective specifications, and capital fit.
- `../trading-agent-center/src/trading_agent_center/domain/phase22_shfe.py` — Validates paired official SHFE RB market and `js` archives, costs, margins, multiplier, hashes, and availability. (~2400 tok)
- `../trading-agent-center/tests/test_phase22_shfe.py` — Covers RB raw market/spec pairing, fixed and ratio fees, ambiguity rejection, and hash failures. (~700 tok)
- `../trading-agent-center/src/trading_agent_center/domain/phase21_24_research.py` — Runs four distinct next-open, cost-aware MA/RB/FG/ZN market-data strategies with OOS returns and independent hashes. (~3000 tok)
- `../trading-agent-center/application/product_research.py` — Orchestrates official archive validation, continuous history, current economics, and product research. (~900 tok)
- `../trading-agent-center/src/trading_agent_center/domain/product_candidate_gate.py` — Applies fixed OOS qualification thresholds without enabling signals or execution. (~1000 tok)
- `../trading-agent-center/scripts/build_product_research_manifest.py` — Deterministically rebuilds the four-product research manifest from official indexes. (~600 tok)
- `../trading-agent-center/scripts/build_product_qualification_manifest.py` — Rebuilds accepted/rejected OOS qualification results from the checked-in research manifest. (~350 tok)
- `../trading-agent-center/tests/test_phase21_24_research.py` — Verifies strategy independence, next-open timing, costs, hashes, determinism, CLI, and capital gates. (~1300 tok)
- `../trading-agent-center/tests/test_product_candidate_gate.py` — Verifies fixed qualification rules and checked-in FG/ZN accept versus MA/RB reject outcomes. (~700 tok)
- `../trading-agent-center/docs/PHASE21_24_RESEARCH.json` — Generated immutable four-product OOS observations, factors, strategies, and Phase 25 candidate-shaped evidence. (~12000 tok)
- `../trading-agent-center/src/trading_agent_center/domain/phase22_24_observations.py` — Validates paired official SHFE KX/PM curve and member-position panels with point-in-time availability, raw hashes, and explicit warehouse-receipt gaps. (~1900 tok)
- `../trading-agent-center/tests/test_phase22_24_observations.py` — Covers SHFE observation aggregation, date matching, safety controls, and structured CLI routing. (~900 tok)
- `../trading-agent-center/docs/PHASE22_24_OBSERVATIONS.json` — Immutable summary of the accepted 256-day RB/ZN curve and positioning panels and missing warehouse receipts. (~350 tok)
- `../trading-agent-center/src/trading_agent_center/domain/phase22_24_warehouse.py` — Dependency-free validation of SHFE RB/ZN warehouse reports across legacy JSON and current HTML formats, including true availability and immutable hashes. (~3300 tok)
- `../trading-agent-center/scripts/acquire_shfe_warehouse.py` — Resume-safe SHFE warehouse acquisition using market-index dates, official HTML WAF proof-of-work, CSS Last-Modified, and official JSON fallback. (~2200 tok)
- `../trading-agent-center/tests/test_phase22_24_warehouse.py` — Covers RB/ZN warehouse sums, dual formats, hashes, next-day availability, and fail-closed controls. (~1500 tok)
- `../trading-agent-center/tests/test_shfe_warehouse_acquisition.py` — Covers market-date selection, resume behavior, HTML evidence, and official JSON fallback. (~900 tok)
- `../trading-agent-center/docs/PHASE21_24_QUALIFICATION.json` — Generated fixed-gate qualification results preserving accepted and rejected campaigns. (~9000 tok)
- `../trading-agent-center/docs/PHASE21_24_RESEARCH_PROGRESS.md` — Human-readable method, results, hashes, and pre-screen boundary. (~700 tok)
- `../trading-research-vault/03-Experiments/Phase-21-24-Market-Only-OOS-Pre-Screen.md` — Vault experiment retaining all four outcomes and the no-signal boundary. (~650 tok)
- `../trading-agent-center/tests/test_phase22.py` — RB evidence, capital gate, blocked manifest, CLI, and safety tests.
- `../trading-agent-center/docs/PHASE22_DESIGN.md` — RB onboarding design and evidence boundary.
- `../trading-agent-center/docs/PHASE22_PROGRESS.md` — RB audit status and remaining blockers.
- `../trading-agent-center/docs/PHASE22_RB_READINESS.json` — Machine-readable blocked RB readiness manifest.
- `../trading-research-vault/06-Reviews/Phase-22-Rebar-Onboarding-Progress.md` — Vault progress record for RB onboarding.
- `../trading-agent-center/tests/test_phase21.py` — MA evidence, provenance, capital gate, checked-in blocked manifest, and contract tests.
- `../trading-agent-center/docs/PHASE21_DESIGN.md` — Phase 21 MA data and research boundary.
- `../trading-agent-center/docs/PHASE21_PROGRESS.md` — Phase 21 audit status and real-data blockers.
- `../trading-agent-center/docs/PHASE21_MA_READINESS.json` — Machine-readable blocked MA readiness manifest.
- `../trading-research-vault/06-Reviews/Phase-21-Methanol-Onboarding-Progress.md` — Vault progress record for MA evidence onboarding.
- `../trading-agent-center/docs/PHASE21_TO_25_ROADMAP.md` — Evidence-driven MA, RB, FG, ZN, and final portfolio roadmap with global quality gates.
- `../trading-research-vault/07-Decisions/Phase-21-to-25-Evidence-Roadmap.md` — Proposed Vault decision for the remaining product and portfolio phases.
- `../trading-research-vault/06-Reviews/Phase-20-Soybean-Meal-Onboarding-Progress.md` — Vault progress record for the blocked M onboarding evidence chain.
- `../trading-agent-center/tests/test_postgres_phase12.py` — Phase 12 PostgreSQL round-trip test.
- `../trading-agent-center/docs/PHASE12_DESIGN.md` — Extended observation data-source and point-in-time design.
- `../trading-agent-center/docs/PHASE12_ACCEPTANCE.md` — Phase 12 contract acceptance and pending importer gates.
- `data_center/official_curve_observations.py` — Builds one-day near/mid/far futures curve bundles from SHFE official archives using raw document SHA-256 and HTTP Last-Modified availability.
- `data_center/official_inventory_observations.py` — Parses canonical SHFE warehouse-receipt HTML into BU/RU inventory bundles with report-package availability evidence.
- `tests/unit/test_official_curve_observations.py` — Verifies deterministic near/middle/far contract selection for official curve bundles.
- `tests/unit/test_official_inventory_observations.py` — Verifies SHFE warehouse-receipt parsing for BU/RU totals, report dates, and availability evidence.
- `data_center/official_position_observations.py` — Builds one-day full-rank and top-five BU/RU member position bundles from SHFE official pm archives with raw document hashes and Last-Modified availability.
- `tests/unit/test_official_position_observations.py` — Verifies contract-row filtering, full-rank/top-five position aggregation, empty evidence rejection, and panel ordering.
- `data_center/official_option_observations.py` — Builds BU/RU ATM call/put IV observation bundles from official SHFE option and futures archives with explicit expiry-rule evidence.
- `tests/unit/test_official_option_observations.py` — Verifies finite call/put IV, expiry point-in-time gating, and mandatory rule-document provenance.
- `data/official/phase23_24/` — Git-ignored local archive containing 256 raw CZCE FG and 256 raw SHFE ZN daily documents plus validated indexes (~41 MB).
- `data/official/phase24_specs/` — Git-ignored local archive containing 256 raw SHFE ZN `js` settlement/fee/margin documents plus validated index (~27 MB).
- `data/official/phase21_23_specs/` — Git-ignored local archive containing 256 official CZCE `FutureDataClearParams.txt` settlement, margin, and commission files plus a resumable index (~10 MB).
- `../trading-agent-center/src/trading_agent_center/domain/phase21_23_observations.py` — Validates 256 official CZCE MA/FG warehouse and member-position documents with immutable hashes and point-in-time availability.
- `../trading-agent-center/src/trading_agent_center/domain/phase21_23_factors.py` — Builds MA/FG next-open factor ledgers from continuous markets, real multi-contract curves, warehouse, and member-position evidence while retaining missing groups.
- `../trading-agent-center/scripts/build_czce_factor_manifest.py` — Rebuilds deterministic MA/FG factor manifests from official indexed archives.
- `../trading-agent-center/scripts/build_czce_strategy_manifest.py` — Rebuilds deterministic MA/FG cost-aware OOS strategy manifests from factors and effective-dated CZCE specifications.
- `../trading-agent-center/scripts/build_phase25_portfolio_manifest.py` — Builds the Phase 25 four-product portfolio snapshot from candidacy, strategies, and official readiness evidence.
- `../trading-agent-center/tests/test_phase21_23_observations.py` — Covers CZCE observation parsing and structured MA/FG CLI paths.
- `../trading-agent-center/tests/test_phase21_23_factors.py` — Covers point-in-time MA/FG factor semantics and explicit missing profit/seasonality evidence.
- `../trading-agent-center/tests/test_phase21_23_strategies.py` — Covers MA/FG use of the shared cost-aware strategy kernel.
- `../trading-agent-center/tests/test_czce_manifest_builders.py` — Covers deterministic CZCE factor and strategy builder routing.
- `../trading-agent-center/tests/test_product_phase_candidate_builder.py` — Covers multi-manifest candidate merging and duplicate-product rejection.
- `../trading-agent-center/tests/test_phase25_portfolio_builder.py` — Covers real-candidate portfolio snapshot construction and official one-lot margin derivation.
- `../trading-agent-center/docs/PHASE21_23_FACTORS.json` — Full 234-observation MA/FG factor evidence with immutable bundle hashes.
- `../trading-agent-center/docs/PHASE21_23_STRATEGIES.json` — Full 71-observation MA/FG OOS, regime, cost, and stability evidence.
- `../trading-agent-center/docs/PHASE21_24_CANDIDACY.json` — Unified fail-closed MA/FG/RB/ZN product candidacy audit.
- `../trading-agent-center/docs/PHASE25_ACCEPTANCE.json` — Final Phase 25 blocked portfolio audit with one independent candidate, 71 aligned dates, and no allowlist.
- `../trading-agent-center/docs/PHASE26_TO_30_ROADMAP.md` — Long-history, ZN independent-strategy, RB/FG industry-chain, ten-candidate, and portfolio reacceptance roadmap.
- `../trading-research-vault/07-Decisions/Phase-26-to-30-Research-Expansion.md` — Vault decision record for the post-Phase-25 research expansion and MA freeze.
- `../trading-agent-center/src/trading_agent_center/domain/phase26_long_history.py` — Validates revision-aware five-year official indexes, raw and row hashes, coverage, and research-only controls.
- `../trading-agent-center/scripts/acquire_shfe_long_history.py` — Resume-safe SHFE ZN/CU daily market acquisition with immutable content-hash revisions and explicit failure categories.
- `../trading-agent-center/scripts/acquire_shfe_long_specs.py` — Resume-safe SHFE ZN settlement, multiplier, commission, and margin acquisition for official market dates.
- `../trading-agent-center/scripts/build_phase26_manifest.py` — Deterministic Phase 26 coverage and point-in-time eligibility manifest builder.
- `../trading-agent-center/src/trading_agent_center/domain/phase27_zn_strategies.py` — Frozen independent ZN curve, warehouse-shock, and ZN-CU relative-value signal kernels.
- `../trading-agent-center/src/trading_agent_center/domain/phase28_industry.py` — Fail-closed RB/FG industry-chain evidence contract with provenance, availability, raw hash, unit, formula, and revision gates.
- `../trading-agent-center/src/trading_agent_center/domain/phase29_30.py` — Ten-candidate specification audit and final Phase 30 portfolio wrapper around the existing Phase 25 gate.
- `../trading-agent-center/docs/PHASE26_TO_30_ACCEPTANCE.md` — Engineering acceptance and blocked research outcome for Phases 26-30.
- `data/official/phase26_long_history/` — Git-ignored 1,210-date SHFE ZN/CU raw market indexes and deterministic continuous histories.
- `data/official/phase26_long_specs/` — Git-ignored 1,210-date SHFE ZN official specification and cost archive.
- `data/official/phase26_long_positions/` — Git-ignored 780-date SHFE member-position archive.
- `data/official/phase26_long_warehouse/` — Git-ignored 1,207-date SHFE warehouse-receipt archive with three explicit market-date gaps.
- `../trading-agent-center/scripts/run_phase27_zn_research.py` — Rebuilds the 579-date point-in-time ZN/CU panel, three chronological folds, 252-date OOS, cost-aware two-leg returns, regime/neighborhood diagnostics, and candidate independence evidence.
- `../trading-agent-center/scripts/build_phase26_factor_panel.py` — Builds 579 daily point-in-time factor rows with term structure, warehouse shock, member positioning, volatility, ZN/CU relative strength, missingness, source hashes, and safety flags.
- `../trading-agent-center/src/trading_agent_center/domain/phase29_strategies.py` — Independent ZN volatility-state transition signal kernel with prior-only state thresholds.
- `../trading-agent-center/scripts/build_phase29_research.py` — Combines four real runs and six explicit data blockers into ten-candidate qualification and duplicate evidence.
- `../trading-agent-center/scripts/build_phase30_acceptance.py` — Builds conditional PBO/DSR, aligned OOS, one-lot margin, human-review, and empty-allowlist Phase 30 evidence.
- `../trading-agent-center/docs/PHASE26_FACTOR_PANEL.json` — Deterministic 579-row eligible factor panel with five factor groups, per-row information cutoffs, source lineage, and explicit missingness.
- `../trading-agent-center/tests/test_phase26_factor_panel_builder.py` — Verifies daily factor values, point-in-time cutoff selection, source hashes, missing member positions, and disabled safety flags.
- `../trading-agent-center/docs/PHASE27_ZN_RESEARCH.json` — Three ZN candidate folds, OOS returns, costs, robustness diagnostics, hashes, and independence correlations.
- `../trading-agent-center/docs/PHASE29_CANDIDATE_RESEARCH.json` — Ten frozen candidate outcomes: four observed, two qualified, two rejected, and six blocked.
- `../trading-agent-center/docs/PHASE30_PORTFOLIO_REACCEPTANCE.json` — Final blocked portfolio audit with two qualified candidates, 251 aligned returns, 14.10% ZN margin, and empty allowlist.
