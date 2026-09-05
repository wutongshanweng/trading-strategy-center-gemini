# 交易策略中心专家升级评审（EXPERT_UPGRADE_REVIEW）

> 评审日期：2026-08-12
> 基线：`main` @ `3616cf5`（浅克隆，工作树仅 `.wolf/*` 与本任务书/评审文件有改动）
> 方法：本地真实运行（依赖安装 + 单测执行 + 导入验证）+ 四路并行代码审计（量化可信度 / Agent 与安全 / 数据血缘 / 运维与 CI）
> 分类标注：`VERIFIED`（本轮由代码阅读、本地运行或命令输出直接验证）/ `REPO-CLAIMED`（仓库文档或历史记录声明，本轮未重新验证）/ `PROPOSED`（建议，未实现）
>
> 本文件不修改 `EXPERT_UPGRADE_BRIEF.md`；它是对该任务书的批判性评审与实施合同。

---

## 1. Executive Summary

1. **VERIFIED（P0）：当前基线从全新克隆无法启动。** `.gitignore` 第 7 行的 `data/` 规则匹配任意层级的 `data` 目录，导致 `core/data/` 整个包（`market_data_manager.py`、`data_quality.py`、`continuous_contract.py` 等，anatomy.md 仍列出它们）从未被提交，本地磁盘上也不存在；而 `api/routes/data_routes.py:6` 无条件导入它并注册在 `api/router_registry.py:22`。实测 `import main` 直接 `ModuleNotFoundError: No module named 'core.data'`。生产服务器能跑，说明**生产在运行不在 Git 里的代码**——任务书宣称的一切"历史验收基线"都无法从仓库复现。

2. **VERIFIED（P0）：CI 的测试步骤在结构上不可能失败。** workflow 未显式声明 `shell: bash`，GitHub Actions 默认 `bash -e {0}` **不含 pipefail**；`pytest ... | tail -50`（main.yml:67,71）的退出码是 `tail` 的 0。因此 CI 绿灯只证明 alembic、release gate、compileall、ruff(E9/F63/F7) 和前端构建通过，**不证明任何测试通过**。这解释了 `tests/unit/test_data_layer.py`（导入不存在的 `core.data`）长期收集失败而 CI 仍绿。

3. **VERIFIED（P0）：系统存在两套回测世界，做决策的那套在算术上是错的。** `backtest/trusted_engine.py`（次 bar 开盘成交、乘数、保证金、固定/比例手续费、涨跌停拒单）质量良好但只服务 `/backtest/trusted` 与模拟盘；而驱动锦标赛、晋升门禁、进化引擎、`/backtest/run|quick|batch` 闭环的 `backtest/vectorized_engine.py` 存在：同 bar 收盘成交（偷看）、**平仓只加回 PnL 不加回本金**（每次往返凭空蒸发约 10% 资金，vectorized_engine.py:108,116-125）、权益曲线把持仓按 12% 保证金计值（开仓即假暴跌 88%）、保证金校验无数量项（永不生效）、无合约乘数、只能做多、滑点双重扣。**其 Sharpe/回撤/收益全部不可用，而闭环恰恰按这些数排名和晋升。**

4. **VERIFIED（P0）：样本外验证形同虚设。** `core/adaptive/walk_forward_validator.py:68-76` 在 expanding 模式（默认）下所有切分完全相同（与 `i` 无关）——"4 窗口验证"实为同一切分重复 4 次；`overfit_ratio`（:141-144）恒为 1/n 或 NaN，导致**从不退化的好策略必被拒绝**（NaN<0.3 为 False）、逐窗过拟合永远检不出。唯一生产调用方 `promotion_gate.py:119-120` 将 purge/embargo 全设为 0。无任何多重检验控制（无 PBO/DSR），晋升条件是坏引擎产出的 `mean_oos_sharpe > 0`。

5. **VERIFIED（P0）：因子库存在系统性未来函数。** `core/alpha/alpha101/operators.py:9-11` 的 `rank()` 是**全样本**时间序列百分位（WorldQuant 原义是横截面 rank），约 500 个因子中大量使用；`factor_combiner.py:225-226` 全样本 z-score；`factor_evaluator.py:34-50` 的"IC"是单个全样本相关系数（IR 无意义）。此外**没有连续合约**：回测统一加载"今天的主力合约"的全部历史（`main_contract_resolver.py:50-79` 按最近 30 天成交量选取）——点时违规 + 幸存者偏差 + 无换月处理。

6. **VERIFIED（P0）：灾备为零。** 全仓库无任何自动化 pg_dump/备份代码；`scripts/deploy.sh:24-26` 只备份配置文件；DEPLOYMENT.md:326-331 描述的每日备份 cron **无人实现**；已知生产 PG 18.3 与 pg_dump 16 客户端不匹配，连手工备份都可能失败。当前 RPO=∞。同时 `sync_scheduler.py:330-344` 还在**永久删除** 180 天前的分钟线——删的是无备份的数据。

7. **VERIFIED（P0）：安全边界一环失守即全失守。** `ENV` 默认 `development`（auth_routes.py:14），激活硬编码密码 `admin@admin` 与硬编码 HMAC secret——任何能访问 API 的人可**离线伪造**管理员 token（docker-compose 默认发布 8000 端口），进而获得 `agent_v3:approve`（人工审批形同虚设）并经 `/api/v1/llm/providers/{id}/edit` 解密导出全部 LLM 密钥（无审计日志）。此外约 35 个路由模块完全无鉴权，包括可烧钱的 LLM 调用端点和 `db_routes.py` 的直写端点；`AGENT_JWT_SECRET`/pepper 也有硬编码 dev 回退。

8. **VERIFIED（P0）：可复现性为零 + 定时任务在伪造数据。** 无 run_id/代码 SHA/配置哈希/种子记录（Phase 1 是纯绿地）；更严重的是 Celery 每日 07:00 的回测任务 `tasks/backtest_tasks.py:8-19` 用 `np.random` **合成 OHLCV** 跑回测并把结果写入 `backtest_results` 表——数据库里存着以假数据算出的"业绩"。

9. **VERIFIED（P1）：仓库外还有一套影子交易系统。** `loops/` + `trading_journal/`：Hermes Agent 通过服务器 crontab（盘中每 10 分钟）驱动"交易员/风控员"循环，写模拟持仓进 Git（基线提交本身就是 `fix: restore I2609 position`，作者 Hermes Agent），推送飞书。它绕过本仓库全部门禁（风控只是读 JSON 的独立脚本、路径硬编码 `/data/trading-strategy-center`），不在 anatomy/任务书视野内。属模拟性质未违反"不实盘"红线，但**必须纳管或冻结**。

10. **结论与改序建议：** 任务书对现状的判断大方向正确但显著低估了严重度（它以为回测"需要升级"，实际是"数字不可用"；以为 CI"分支条件有误"，实际是"测试根本不生效"）。Agent 3.0 内核（租约/审批/准入/fail-closed）是全仓库质量最高的部分，应保留为范本。建议：Phase 0 扩容为"完整性 + 止血"（仓库可启动、CI 生效、备份、密钥 fail-closed、鉴权覆盖）；**将原 Phase 2（回测可信）提到原 Phase 1（血缘）之前**——先让数字正确，再记录血缘；在可信度修复完成前冻结新功能（与任务书第 6 节一致）。

---

## 2. Verified Current State

| # | 项目 | 状态 | 结论 | 证据 |
|---|---|---|---|---|
| 2.1 | Git 基线 | VERIFIED | `main` @ `3616cf5`，浅克隆（depth-1，仅 1 个提交），工作树仅 `.wolf/*` 修改 + 本任务书未跟踪 | `git rev-parse HEAD`、`--is-shallow-repository`=true |
| 2.2 | 仓库规模 | VERIFIED | 1,574 tracked files / 1,244 `.py` / Python 118,452 行 / 前端 TS 21,913 行（任务书写 21,776，轻微漂移） | `git ls-files` + `wc -l` |
| 2.3 | 全新克隆可启动性 | VERIFIED | **失败**。`import main` → `ModuleNotFoundError: core.data`；根因 `.gitignore:7` `data/` 吞掉 `core/data/`（`git check-ignore -v` 证实），目录在本机不存在 | 本地运行输出 |
| 2.4 | 单测基线（本机、无 PG、py3.11） | VERIFIED | `1433 passed / 11 failed / 17 errors / 5 skipped`（排除无法收集的 `test_data_layer.py`）。17 errors 与多数 failed 为 PG 连接拒绝或可选依赖（pyarrow）缺失；真实损坏：`test_data_layer`（core.data 缺失）、`test_resonance` 收集失败（`market_state/__init__.py` 无条件导入 hmmlearn，而 hmmlearn 在 `[ml]` extra，CI 只装 `[dev]`） | 本地 pytest 输出 |
| 2.5 | 历史验收基线 1528 passed / release readiness=true / 139 万 K 线 / 8272 标的 / 642 观察 | REPO-CLAIMED | 本机无 PostgreSQL，无法复验；与 2.4 数量口径大体自洽（差额≈PG 依赖测试 + test_data_layer 未收集） | cerebrum 2026-08-11 记录 |
| 2.6 | CI 结构 | VERIFIED | 4 jobs；矩阵 3.10/3.11/3.12（job 名恒显 3.10）；跑 alembic + release gate + 前端构建；**pytest 步骤经 `\| tail -50` 且无 pipefail，退出码恒 0**；docker-build 条件 `ref_name == 'master'` 而分支是 `main`（永不发布）；无覆盖率门槛、无 secret/依赖扫描；`npm ci \|\| npm install` 掩盖 lockfile 漂移 | main.yml:41-43,67,71,109,130 |
| 2.7 | 迁移链 | VERIFIED | 17 个版本，经 `merge_storage_heads` 合并后线性，HEAD=`add_instrument_commission_model` | `core/db/migrations/versions/` |
| 2.8 | 前端类型债 | VERIFIED | `frontend/src` 无显式 `: any`（任务书判断成立）；tsc/lint/build 本轮未运行 | grep=0；构建为 REPO-CLAIMED |
| 2.9 | 回测引擎分工 | VERIFIED | trusted engine 仅 `/backtest/trusted` + paper broker；vectorized 驱动 run/quick/batch、tournament_runner、promotion_gate、evolve/runner | backtest_routes.py:140,182,218,368；tournament_runner.py:19；promotion_gate.py:118-135；core/evolve/runner.py:431-438 |
| 2.10 | Agent 内核安全性 | VERIFIED | SKIP LOCKED 租约 + 属主 CAS 续约；状态机穷举；`live_execution_allowed` 全仓库硬编码 False；Champion 晋升结构上必须 APPROVED 审批；准入 fail-closed；LLM planner 15s 超时 + 非法即回退确定性计划 | active_tasks.py:17-32,65-79；release_gate.py:34-35；decision_pipeline.py:97-98；llm_planner.py:44-99 |
| 2.11 | 备份/灾备 | VERIFIED | 无自动备份代码；deploy.sh 只备份配置；DEPLOYMENT.md 的备份 cron 是虚构；分钟线 180 天定期 DELETE | scripts/deploy.sh:24-26；sync_scheduler.py:330-344 |
| 2.12 | 健康检查 | VERIFIED | Dockerfile HEALTHCHECK 与 scripts/deploy.sh 均打 `/health`，但唯一健康路由是 `/api/v1/health` → 容器恒 unhealthy、部署健康门恒失败（root deploy.sh:150-155 已把 404 当"已知警告"） | Dockerfile:50；scripts/deploy.sh:31-37；health_routes.py:7 |
| 2.13 | 双 Celery app | VERIFIED | 活的 `tasks/celery_app.py`（无时限、无 DLQ、`reports` 队列无人消费）；死的 `core/tasks/celery_app.py`（讽刺地配了时限/软时限）仅被测试与过期文档引用 | compose 与 deploy.sh 均 `-A tasks.celery_app` |
| 2.14 | loops/ 影子系统 | VERIFIED | crontab 驱动 5 个 Agent Loop；trading_journal/account.json 存模拟持仓；基线提交作者 Hermes Agent；路径硬编码 `/data/...`、脚本引用 `~/.hermes/`（仓库外） | loops/README.md、orchestrator.py、git log |
| 2.15 | 密钥卫生 | VERIFIED | `.env`、`data/` 已 ignore；`git ls-files` 未发现已提交凭据（`.wolf/token-ledger.json` 为 8.7MB 的用量统计非凭据）；本轮未输出任何密钥内容 | git ls-files / check-ignore |

---

## 3. Critical Findings

> 格式：每条含 状态 / 影响 / 证据 / 不修后果。P0 = 结论不可信或系统性风险；P1 = 有界但必须修；P2 = 加固与卫生；P3 = 可选。

### P0（10 项）

**P0-1 仓库完整性：`core/data` 被 .gitignore 吞掉，克隆即坏** — VERIFIED
影响：`main.py` 无法导入；生产运行未版本化代码；"代码 SHA 可复现"在根上不成立。
证据：`.gitignore:7`；`git check-ignore -v core/data/__init__.py`；`api/routes/data_routes.py:6`；本地 `import main` 失败。
不修后果：一切基线、回滚、灾备承诺无效——换机即灾难。

**P0-2 CI 测试步骤退出码被管道吞掉** — VERIFIED
影响：测试从未真正门禁；绿灯给出虚假安全感（并已掩盖 test_data_layer 损坏）。
证据：main.yml:67,71 `| tail -50`，无 `shell: bash`（无 pipefail）。
不修后果：后续所有 Phase 的"验收=CI 绿"全部失去意义。

**P0-3 VectorizedBacktest 资金核算错误 + 同 bar 成交** — VERIFIED
影响：闭环（feedback/standings/degradation/promotion/evolve）所有指标为算术垃圾；高换手策略被虚构成本惩罚，动量策略被偷看抬升。
证据：vectorized_engine.py:65-68,88-93（同 bar 收盘成交）、:108,116-125（平仓不返还本金）、:133-134（权益=现金+12%持仓）、:95-96（保证金无数量项）、:149（线性年化）。
不修后果：策略淘汰与晋升在噪声上随机行走，且方向性偏见（惩罚真实交易、奖励低频偷看）。

**P0-4 WalkForwardValidator 切分全同 + overfit_ratio 公式错误；无多重检验** — VERIFIED
证据：walk_forward_validator.py:68-76（切分与 i 无关）、:141-144（`np.mean([1,...])/n` ⇒ 1/n 或 NaN）；promotion_gate.py:119-120（purge/embargo=0）、:165（`mean_oos>0` 即晋升）；tests/unit/test_adaptive.py:333-341 反而固化了该 bug。
不修后果：晋升门禁既拒好策略（NaN 路径）又放过拟合（1/n 恒小于 0.4），选择偏差不受任何控制。

**P0-5 因子库未来函数（rank/zscore/IC）** — VERIFIED
证据：operators.py:9-11；factor_combiner.py:225-226；factor_evaluator.py:34-64。
不修后果：因子研究（含 loops/ 的因子研究员周任务）产出全部 IC 均被未来信息污染。

**P0-6 无连续合约；按"今日主力"回测历史** — VERIFIED
证据：main_contract_resolver.py:50-79；backtest_routes.py:98-126、tournament_runner.py:24-31、promotion_gate.py:45-52（fallback 硬编码 `{code}2510`）。
不修后果：期货回测样本被今日信息选择、含新合约不活跃期、无换月跳空，结果系统性失真。

**P0-7 数据库零备份 + pg_dump 版本不匹配 + 定期删分钟线** — VERIFIED
证据：见 2.11；cerebrum 2026-08-10 记录 PG 18.3 vs pg_dump 16.14。
不修后果：单盘故障 = 139 万 K 线、全部信号观察与审计记录永久丢失；RPO=∞、RTO=∞。

**P0-8 认证：dev 默认硬编码密码/HMAC secret 可离线伪造管理员 token；大面积无鉴权路由** — VERIFIED
证据：auth_routes.py:14-18,55-60（token=`user:ts:HMAC[:16]`，secret 在源码里）；agent_routes.py:59-66（web token ⇒ `agent_v3:approve`）；llm_routes.py:683-690（edit 返回解密 key、无审计）；仅 5 个路由文件使用 `Depends`；llm_routes.py:517-591,637,748-760 无鉴权 LLM 调用；settings.py:11,75-80（JWT/pepper dev 回退）；docker-compose.yml:8 暴露 8000。
不修后果：网络可达者即管理员：可批准 Champion、导出全部 LLM 密钥、烧尽 LLM 额度、直写业务表。

**P0-9 /health 契约断裂 + CI 永不发布镜像** — VERIFIED
证据：见 2.12；main.yml:130。
不修后果：容器恒 unhealthy、scripts/deploy.sh 恒失败于健康门（迫使人工绕过——绕过习惯本身是风险）；生产镜像路径从未被验证。

**P0-10 复现性为零；每日定时回测使用合成随机数据写库** — VERIFIED
证据：无 run_id/SHA/seed 持久化（全仓 grep 空）；tasks/backtest_tasks.py:8-19 `np.random.normal` 造 OHLCV，:39-53 写 `backtest_results`（`params=None`）；beat 每日 07:00 触发（tasks/celery_app.py）。
不修后果：数据库中真假回测结果不可区分，任何"历史业绩"引用均可疑。

### P1（14 项）

**P1-1 Agent step 恢复是死代码** — VERIFIED。`AgentStep.status` 从未被置 "completed"（repository.py:59 创建后无写方），worker.py:84 的断点续跑永远全量重跑；幂等目前仅靠"所有工具只读"这一事实兜底。
**P1-2 无毒任务上限/死信** — VERIFIED。lease 过期恢复无 attempt 计数（models.py:478-496），可无限循环 crash→recover。
**P1-3 admission 计数泄漏 + "每日"预算永不重置** — VERIFIED。worker 崩溃不释放 `running_count`/预算（admission.py:27-41；active_tasks.py:49-60 只清租约字段）；无任何预算重置代码 ⇒ fail-closed 自锁。
**P1-4 审批无时效；策略名靠解析 reason 字符串** — VERIFIED。无 `expires_at`；agent_kernel_routes.py:710,850 用 `split("Challenger ")` 定位策略。
**P1-5 LLM 密钥治理** — VERIFIED。edit 端点返回明文无审计；解密失败静默回退明文（config_store.py:334-335）；密钥文件与加密 key 同目录（:434-448）。
**P1-6 新闻→LLM prompt 注入通道** — VERIFIED。news/ai/analyzer.py:73-78 直接插值原文，无标记/防护；影响面被限制在情绪分/证据污染（不触发工具），但证据会进入决策 blockers。
**P1-7 活 Celery app 无时限/无 DLQ/`reports` 队列无消费者；裸机 celery 用 nohup 无监督** — VERIFIED。tasks/celery_app.py vs 死 app 的正确配置；deploy.sh:103-109。
**P1-8 realtime sync 在每个 uvicorn worker 内自启动** — VERIFIED。main.py:62 无条件 `autostart_if_enabled()`，`--workers 4`（deploy.sh:118）⇒ 4 份并发采集循环（正是当年迁 Celery 要解决的竞态）。
**P1-9 无指标、无 request_id、告警不送达** — VERIFIED。无 prometheus/structlog；MonitorAlert 只写库；Feishu/email 通道是死代码（monitoring/ 包无人接线）。
**P1-10 点时存储缺失** — VERIFIED。kline 无 revised_at，`ON CONFLICT DO NOTHING`（首值冻结）与 `DO UPDATE`（破坏性覆盖）并存；macro 无 available_time；news `published_at` 解析失败静默回退抓取时间 + 重抓破坏性覆盖 + Agent 读取无 as-of 截断（news_tools.py:34-42）。
**P1-11 幸存者偏差在采集侧** — VERIFIED。TDX 只采最近 3 个合约（futures_collector_tdx.py:63-70）；股票只列当前上市（stocks_collector.py:100-144）；`symbols.status` 从不更新。
**P1-12 置信度"校准"是分组收缩而非校准，且静默旁路** — VERIFIED。<20 样本或存储异常直接返回原始置信度（outcome_store.py:138-143；alert_aggregator.py:1034-1046 裸 except）。无可靠性曲线/Brier。另 trusted engine 的涨跌停拒单在实践中死路（trusted_backtest.py:74-76 从不加载 limit_up/down）。
**P1-13 双检查点系统 + 内存态任务互斥** — VERIFIED。DB collect_checkpoints 与 JSON download_checkpoint.json 并行两套真相；collect_jobs.py 内存锁重启即失。
**P1-14 loops/ 影子系统治理缺位** — VERIFIED。见 Exec Summary #9；产物（持仓 JSON、LOGS.md）直接进 Git 造成噪声提交，风控逻辑独立于 signals/quality 门禁。

### P2（10 项）

**P2-1** 死模块困惑成本：`core/tasks/` celery、`core/tournament/tournament_system.py`、`monitoring/` 全包、4 个未注册路由文件（strategy_pool/strategy_builder/product_strategy_map/agent_routes 的 router 本体）、nginx.prod.conf（prod compose 实挂 nginx.conf）、根目录与 scripts/ 两个行为不同的 deploy.sh。均 VERIFIED。
**P2-2** 仓库卫生：`=3.0`（pip 输出误存文件）、`celerybeat-schedule`（运行时 dbm）、`api.log` 与 `logs/*.log` 已跟踪、两份合约 txt 数据转储、8.7MB `.wolf/token-ledger.json`、约 30 个一次性采集/修复脚本、5 个 Windows 启动脚本。VERIFIED。
**P2-3** 文档漂移：ARCHITECTURE.md 与 docs/system-architecture.md 仍写 DuckDB 仓库（系统已 PG-only）、引用死 celery app；DEPLOYMENT.md 虚构备份 cron 与错误 `/health` 示例；QUICK_START/STARTUP Windows 优先。VERIFIED。
**P2-4** CORS `allow_origins=["*"]`（settings.py:40）+ 内存态限流（重启清零、多进程无效、client.host 可伪造）。VERIFIED。
**P2-5** 管理员 token MAC 截断 64-bit、无吊销/轮换。VERIFIED。
**P2-6** SSRF 防护未覆盖 DNS rebinding（config_store.py:409-426）。VERIFIED。
**P2-7** 无 dependabot/secret scanning/容器扫描/SBOM。VERIFIED。
**P2-8** mojibake：runtime_monitor 告警文案、main.py:27、cerebrum 多处。VERIFIED。
**P2-9** `hmmlearn` 无条件导入在 `market_state/__init__.py`，但依赖在 `[ml]` extra ⇒ 基础安装即坏收集。VERIFIED。
**P2-10** Dockerfile `COPY . .` 依赖 .dockerignore 完整性（.dockerignore 存在但需随 P2-2 清理复核）。VERIFIED（存在）/需复核。

### P3（4 项）

**P3-1** MFE/MAE 统计窗口越过出场 bar 轻微高估（outcomes.py:30-35）；跳空穿越止损按精确止损价计（乐观）。VERIFIED。
**P3-2** 年化收益线性外推而非复利（vectorized_engine.py:149）——随引擎退役一并消失。VERIFIED。
**P3-3** 负夏普在锦标赛评分被截断为 0（test_tournament_runner.py:72-77 自我记录的已知缺陷）。VERIFIED。
**P3-4** `min_periods=d//2` 与 docstring 声称的全窗口不符（operators.py:36-38）。VERIFIED。

---

## 4. Keep / Improve / Freeze / Retire Candidates

> 仅提名，删除需用户批准（任务书 4.1.3）。

### Keep（质量合格，作为范本/事实源）
| 模块 | 理由 |
|---|---|
| `backtest/trusted_engine.py` + `trusted_backtest.py` | 语义正确（次开盘、乘数、保证金、费率类型、涨跌停拒单），测试扎实；应晋升为唯一执行事实源 |
| `core/agents/` 内核（租约/状态机/准入/审批/发布门禁/LLM planner 回退） | 全仓最佳工程质量；fail-closed 设计正确 |
| `instrument_specifications`（effective_from/to 版本化）与 `trading/instrument_store.py` | 唯一接近 bitemporal 的表 |
| `signal_observations` 结果闭环（outcome_store 持久化 + 15min 评估任务） | 真实的点时结果回填循环 |
| `signals/quality.py` 门禁 + 数据新鲜度 gate | fail-closed，方向正确（需去静默旁路） |
| Alembic 迁移链、PG-only 存储层、`api/router_registry.py` 集中注册 | 结构清晰 |
| 前端 TS 无 any、集中路由/菜单配置 | 类型债已清 |

### Improve（保留但按 Phase 计划修）
vectorized 引擎的消费方（改接 trusted）、WalkForwardValidator、promotion_gate、factor operators/evaluator/combiner、outcome 校准、auth_routes、llm_routes 鉴权、tasks/celery_app、main.py lifespan（sync 自启动归属）、news_snapshot_service（append-only）、macro_collector（available_time）、collectors（合约生命周期/股票宇宙标注）、health 路由契约、CI workflow。

### Freeze（冻结：不再投入，不接入决策链，等 P0/P1 完成后再议）
| 模块 | 理由 |
|---|---|
| `core/rl/`（PPO/SAC/TD3/DDPG/MADDPG/CQL 全家桶）| 约 2 万行，无证据接入任何决策路径；在回测可信之前训练无意义 |
| `quant_models/`（Heston/Copula/HAR-RV 等）与 `ml/` 高级管线 | 同上；且 sklearn 训练依赖同一失真数据 |
| `core/llm/strategy_factory.py` 等 LLM 生成策略代码路径 | 在鉴权与注入防护完成前属高风险面 |
| Vibe/VStock/ChinaFinance/MarketIntelligence 研究页 | 展示性强、决策贡献低；维持只读即可 |
| `loops/` 影子系统 | 待 Open Decision D3：纳管或停 cron；冻结期间至少停止向 Git 写持仓 |

### Retire（退役候选：确认后删除或出库）
| 对象 | 理由 |
|---|---|
| `core/tasks/`（死 Celery app 及其任务） | 无运行时引用；其正确配置先移植到活 app |
| `core/tournament/tournament_system.py` | 确认死代码（np.random 假数据，无导入方） |
| `monitoring/` 全包 | 未接线死代码；其 Feishu/email 通道可先"抢救移植"到告警送达任务再删壳 |
| 4 个未注册路由文件（保留 `agent_routes.py` 中被依赖的 `get_current_agent`） | 生产 404，纯困惑源 |
| `backtest/vectorized_engine.py` | 迁移完成、对照期结束后退役 |
| 根目录一次性脚本（collect_*/check_rb/sync_2025_2026/_download_quantsplaybook 等）、Windows 启动脚本、`=3.0`、`celerybeat-schedule`、跟踪的 `api.log`/`logs/*.log`、两份合约 txt、`.wolf/token-ledger.json`（改 ignore） | 仓库卫生；归档到 `archive/` 或移出版本控制 |
| `nginx.prod.conf`、根目录 `deploy.sh`（保留 scripts/deploy.sh 为唯一入口） | 双真相源消除 |
| `docs/` 根的十余份"完成报告"类历史文档 | 移入 `docs/archive/`，消除与现状冲突 |

---

## 5. Target Architecture & Trust Boundaries

**原则：不引入新组件。** 仍是 FastAPI + PostgreSQL + Redis/Celery + React 单机部署；变化全部是"收敛与接线"，不是新建。

```
┌──────────────────────────── Untrusted ────────────────────────────┐
│  外部数据源(akshare/TDX/Sina)   新闻原文   浏览器/网络调用方        │
└──────┬───────────────────────────┬──────────────┬─────────────────┘
       │ collectors(标注来源/       │ news snapshot │ Nginx
       │ available_time/校验)      │ (append-only, │   │
       ▼                           │  注入隔离标记) ▼   ▼
┌────────────────────── Trust Zone A: API 进程 ─────────────────────┐
│ 全局鉴权中间件(默认拒绝; web-admin / agent-jwt / 只读)             │
│ 路由 → 服务层 → PostgreSQL(唯一事实源)                            │
│ /health 契约 ── 只读诊断                                          │
└──────┬────────────────────────────────────────────────────────────┘
       │ Celery(单一 app: tasks/celery_app, 时限+DLQ+幂等键)
       ▼
┌────────────────── Trust Zone B: 研究与决策(确定性) ────────────────┐
│ TrustedExecutionEngine = 唯一执行语义                              │
│  ├ 回测 /run /batch /trusted (统一)                                │
│  ├ tournament → promotion_gate(修复后 WFV+多重检验)                │
│  └ 全部结果挂 run_id(SHA+config hash+seed+数据范围)                │
│ 信号: quality gate → 校准(可靠性曲线) → signal_observations 回填    │
└──────┬────────────────────────────────────────────────────────────┘
       │ 只读证据                       ▲ 只能提"待审批建议"
┌──────▼──────────── Trust Zone C: Agent/LLM(受限) ──────────────────┐
│ LLM planner(15s 超时/回退) → ToolRegistry allowlist(只读工具)       │
│ 副作用工具 = 必须 APPROVED AgentApproval(有 expires_at)             │
│ 新闻/外部文本 = data 不是 instruction(定界标记)                      │
└──────┬────────────────────────────────────────────────────────────┘
       ▼
┌────────────── Trust Zone D: 人工闸门(不可绕过) ────────────────────┐
│ Champion 晋升 / 破坏性迁移 / 密钥读取(带审计) / 实盘=永久禁止        │
└───────────────────────────────────────────────────────────────────┘
灾备平面(独立): 每日 pg_dump(版本匹配) → 异机/对象存储 → 月度恢复演练
```

关键收敛点（对照现状的差异）：
1. **执行语义单一化**：Zone B 只承认 trusted engine；vectorized 仅作迁移对照后退役。
2. **鉴权前移**：从"5 个路由文件各自 Depends"改为 app 级默认拒绝 + 显式豁免只读公开端点清单。
3. **Celery 单 app**：死 app 的时限配置移植后删除；`reports` 队列要么接消费者要么删除。
4. **后台任务单属主**：realtime sync 自启动移出 uvicorn lifespan（归 Celery beat 或独立单进程服务），杜绝多 worker 竞态。
5. **loops/ 要么进 Zone C**（作为受 ToolRegistry/审批约束的调度器），**要么停摆**；不允许第三条平行决策路径。

---

## 6. Detailed Phase Plan（修订版）

### 6.0 对任务书 Phase 0–7 的裁定

| 任务书阶段 | 裁定 | 说明 |
|---|---|---|
| Phase 0 事实对齐 | **保留并扩容** | 必须并入"止血项"：仓库完整性、CI 生效、备份、密钥 fail-closed、鉴权覆盖、health 契约。纯文档对齐不足以建立可信基线 |
| Phase 1 血缘 | **拆分并后移** | 最小运行清单(run manifest)前移进新 Phase 1；完整 PIT/血缘存储改为新 Phase 2。理由：先修引擎再记血缘，否则在为垃圾数字建审计链 |
| Phase 2 回测可信 | **前移为新 Phase 1，且改路线** | 不是"升级 vectorized"，而是"晋升 trusted 为唯一事实源"——修复成本更低、已有测试背书 |
| Phase 3 信号闭环 | 保留（新 Phase 3） | 增补：消除静默旁路、MFE/MAE 修正 |
| Phase 4 运维灾备 | 备份前移至 Phase 0；其余保留（新 Phase 4） | 增补：Agent 运行时鲁棒性(P1-1..4) |
| Phase 5 安全治理 | P0 项前移至 Phase 0；其余保留（新 Phase 5） | |
| Phase 6 前端 / Phase 7 性能 | 保留 P2，顺序不变 | 本轮不出详细任务，待 P0/P1 完成后立项 |

依赖关系：Phase 0 无前置；Phase 1 依赖 0（CI 生效才有验收意义）；Phase 2 依赖 1（run_id 挂在正确引擎上）；Phase 3 依赖 1（校准依赖可信成本）；Phase 4/5 与 1–3 可部分并行（不同文件域）。

每个任务的完整实施模板（现状证据/范围/设计/迁移/测试先行/验收命令/可观测性/回滚/停止条件）在 **§12 Implementation Prompt Pack** 中逐项给出，避免重复；本节只列任务索引、文件域与验收要点。

### Phase 0 — 基线完整性与止血（P0，预估 1–2 周）

| 任务 | 文件域 | 验收要点 |
|---|---|---|
| TASK-0.1 恢复 `core/data` 并修 `.gitignore` | `.gitignore`、`core/data/`（从生产机取回）或退而移除死导入 | 全新克隆 `pip install -e ".[dev]"` 后 `python -c "import main"` 通过 |
| TASK-0.2 CI 真正生效 | `.github/workflows/main.yml`、`pyproject.toml`、`market_state/__init__.py` | 故意注入失败测试 ⇒ CI 变红；docker 条件改 `main` 或显式移除并记录决策 |
| TASK-0.3 /health 契约 | `main.py` 或 `api/routes/health_routes.py`、Dockerfile、scripts/deploy.sh | `curl :8000/health` 200；容器 healthy；部署健康门真实通过 |
| TASK-0.4 自动备份 + 恢复演练 | `scripts/backup_db.sh`、`scripts/restore_drill.sh`、runbook 文档、（服务器）cron/systemd timer | 恢复到隔离库并校验行数/迁移 head；RPO≤24h 有证据 |
| TASK-0.5 密钥 fail-closed | `api/routes/auth_routes.py`、`core/config/settings.py`、compose | 无显式密钥环境变量 ⇒ 网络可达部署拒绝启动认证功能（503），dev 便利仅限 localhost 绑定 |
| TASK-0.6 鉴权覆盖 | `main.py`（全局依赖）、`api/router_registry.py`、llm_routes | 未带 token 访问任何写端点/LLM 调用端点 ⇒ 401；只读公开清单显式化 |
| TASK-0.7 仓库卫生与文档对齐 | 根目录、docs/、.wolf/token-ledger | CURRENT_STATE.md + CAPABILITY_MATRIX.md 产出；DuckDB/虚构备份等断言清零 |
| TASK-0.8 loops/ 治理执行 | loops/、服务器 crontab | 按 Open Decision D3 的用户选择执行；默认先停 Git 写入 |

回滚：0.1–0.3、0.5–0.7 纯代码/文档，按提交回滚；0.4 只新增脚本不动数据。

### Phase 1 — 回测与验证可信（P0，预估 2–4 周）

| 任务 | 文件域 | 验收要点 |
|---|---|---|
| TASK-1.1 可信语义黄金测试集（先行，先红后绿） | `tests/unit/test_execution_semantics_golden.py`（新） | 同 bar 偷看、本金返还、乘数、费率、涨跌停各有会击败 vectorized 的用例 |
| TASK-1.2 trusted 引擎成为唯一事实源 | backtest_routes、tournament/tournament_runner、core/adaptive/promotion_gate、core/evolve/runner、trusted_backtest（加载 limit_up/down） | run/quick/batch/tournament 全走 trusted；黄金测试全绿；vectorized 仅 `LEGACY_ENGINE=1` 对照 |
| TASK-1.3 WFV 修复 + 晋升门禁重构 | walk_forward_validator、promotion_gate、tests | 各窗口切分互不相同；purge/embargo 默认>0；overfit 比率语义正确；加入最小样本+成本敏感门槛与简单多重检验控制 |
| TASK-1.4 历史主力映射与拼接 | data_center/knowledge/、`futures_main_switches` 表、各 `_load_kline` 调用方 | 回测按"当日主力"分段取数，禁止今日主力全历史；换月日处理有测试 |
| TASK-1.5 因子算子点时修复 | core/alpha/alpha101/operators.py、factor_combiner、factor_evaluator | `rank`→滚动 ts_rank（或显式横截面版）；zscore 滚动化；IC 为滚动序列；受影响因子清单产出 |
| TASK-1.6 删除合成数据定时回测 | tasks/backtest_tasks.py、tasks/celery_app.py、迁移（清理假行） | `backtest_results` 不再产生合成数据行；历史假行标记或清除（用户批准） |
| TASK-1.7 最小运行清单 | core/db/models.py + 新迁移（nullable 列）、trusted_backtest、promotion_gate | 每条回测结果带 git SHA/config hash/seed/数据范围；重跑同配置指纹一致 |

### Phase 2 — 血缘与点时存储（P1，预估 2–3 周）

TASK-2.1 宏观/新闻点时（macro `available_time`、news append-only + as-of 查询、published_at 回退标记）；
TASK-2.2 K 线修订与幸存者治理（统一 upsert 策略并记录修订、`symbols.status` 生命周期回填、双检查点合一、明确股票退市宇宙为"已知限制"并在报告中披露）；
TASK-2.3 完整 `ResearchRun` + 重放命令（`python -m research.replay <run_id>` 输出差异报告，浮点容差按指标定义）。
全部采用 expand→backfill→contract 迁移，禁一次性破坏旧记录。

### Phase 3 — 信号校准与组合闭环（P1，预估 2 周）

TASK-3.1 真校准：按置信度分桶的可靠性曲线 + Brier，最小样本/桶；校准不可用时**显式降级标记**而非静默透传（消除 alert_aggregator.py:1034-1046 裸 except）。
TASK-3.2 结果评估修正：MFE/MAE 截至出场 bar；跳空穿越止损按开盘价保守成交；成熟窗口按品种/周期配置。
组合级约束（相关性/风险预算/集中度）沿任务书 Phase 3 设计，依赖 3.1 产出。

### Phase 4 — 运行可靠性与可观测性（P1，预估 2 周）

TASK-4.1 Celery 整备：单一 app（移植死 app 的 time_limit/soft_time_limit/max_tasks_per_child 后删除 core/tasks/）、`task_reject_on_worker_lost` 与毒消息上限、`reports` 队列裁决、systemd 单元替代 nohup、realtime sync 自启动移出 uvicorn lifespan。
TASK-4.2 Agent 运行时鲁棒性：step 完成状态真实写入（修复断点续跑）、lease 恢复带 attempt 上限 + 死信状态、`running_count`/预算对账任务、每日预算重置 beat 任务、审批 `expires_at`。
TASK-4.3 最小可观测性：loguru 增加 request_id/task_id/run_id 结构化字段、健康快照定时任务、把 monitoring/channels/feishu.py 抢救接线为 MonitorAlert 送达通道（然后退役 monitoring/ 包其余部分）。
不引入 Prometheus/Grafana（单机个人系统，先用 DB 快照 + 飞书告警达成"5 分钟内知道哪坏了"）。

### Phase 5 — 安全与 LLM 治理收尾（P1→P2，预估 1–2 周）

TASK-5.1：LLM 密钥读取审计事件、解密失败不再静默回退明文、提示词中外部文本定界标记、LLM token 用量记账与月度上限、CI 加 gitleaks + pip-audit/npm audit + dependabot、CORS 收紧、（可选）token MAC 加长与轮换。

### Phase 6 / Phase 7（P2）

维持任务书原设计，在 Phase 0–4 验收后立项；本轮不出任务卡（避免在数字可信前打磨展示层与性能）。

---

## 7. Quant Research Credibility Review

> 全部 VERIFIED，证据为具体文件行号。回答任务书 §4.2 的六个问题。

### 7.1 点时正确性（问题 1、2）——不合格

- **执行时点**：vectorized 引擎在 bar `ts` 上用截至 `ts` 的窗口算信号并按 `ts` 收盘价成交（vectorized_engine.py:65-68,88-93）——日线上不可实现。trusted 引擎正确（`signal_time < bar.timestamp` 才可成交，trusted_engine.py:65，按次 bar 开盘 ±tick 滑点成交 :74,129-135），但只服务一个端点。
- **因子未来函数**：`rank()` 全样本百分位（operators.py:9-11，如 alpha001.py:35 `rank(arg)-0.5`）；`factor_combiner.py:225-226` 全样本 z-score。约 500 个因子文件中大量受染。前向收益对齐本身正确（factor_cli.py:157 `shift(-1)`；ml/auto_pipeline.py:106,115-118 时序切分），但 h 日重叠标签在切分边界无 purge。
- **主力合约选择泄漏**：`main_contract_resolver.py:50-79` 按"最近 30 天成交量"（即今日信息）选合约，再加载其全部历史回测（backtest_routes.py:98-126、tournament_runner.py:24-31、promotion_gate.py:45-52）；fallback 硬编码 `f"{code}2510"`。无连续合约、无换月建模（`core/data/continuous_contract.py` 在 anatomy 中存在但实际不在仓库/磁盘——见 P0-1）。
- **宏观/新闻**：macro_data 无 `available_time`（warehouse_tables_v1.py:170-183），修订不可重建；news `published_at` 解析失败静默用抓取时刻（news_snapshot_service.py:14-21），重抓 `ON CONFLICT DO UPDATE` 覆盖历史（:64-77）；Agent 新闻工具读"最新 200 条"无 as-of 截断（news_tools.py:34-42）。

### 7.2 成本与执行现实性（问题 3）——两极分化

- trusted 路径：InstrumentSpec 乘数/固定或比例手续费/初始保证金（trusted_engine.py:75,93,112-115）、涨跌停锁死拒单（:137-141，但 runner 从不加载 limit_up/down ⇒ 实践中死路，trusted_backtest.py:74-76）、成本三情景（trusted_backtest.py:39-42）。缺：强平（只有 maintenance_call 布尔）、成交量参与率。
- vectorized 路径（决策事实源）：无乘数、保证金校验无数量项恒通过（:95-96）、滑点既抬价又另扣现金（双重计）、只能做多（:113-130）、**平仓不返还本金**（:108,116-125）——每往返蒸发约 position_pct 的资金，权益曲线在持仓期按 12% 保证金计值（:133-134）⇒ Sharpe/回撤全部失真。
- 结果评估成本侧是亮点：`_estimate_round_trip_cost`（outcome_store.py:80-98）用 instrument_specifications 真实费率+tick，经济性门禁 fail-closed（`missing_cost_evidence` blocker，economics.py:30-54），有测试（test_signal_economics_store.py）。

### 7.3 样本外验证与多重检验（问题 4）——不合格

- `backtest/walkforward.py:17-22`：train 切片**从未使用**——名为 walk-forward 实为固定参数滚动回测；被 agent 工具引用（strategy_tools.py:170）。
- `core/adaptive/walk_forward_validator.py`：expanding 模式（默认）下 `train_start=0, train_end=const, test_start=const`——**所有切分相同**（:68-76）；purge/embargo 参数存在但生产调用方全传 0（promotion_gate.py:119-120）；`overfit_ratio = np.mean([1,...])/n` ⇒ 恒 1/n 或 NaN（:141-144），`check_robustness` 对"从不退化"的策略返回 NaN<0.3=False ⇒ 拒绝（:151-155）。测试固化了 bug（test_adaptive.py:333-341 断言常量切分）。
- 多重检验：全仓库无 PBO/DSR/Bonferroni；promotion_gate 对全部注册策略跑贝叶斯优化（8 iter × 4 "窗口"）后按 `mean_oos_score > 0` 晋升（:165）——教科书式选择偏差机器。市态分组用整段序列最后一根 bar 的 HMM 标签（:94-110）。

### 7.4 置信度校准（问题 5）——部分建成，非真校准

- `signals/quality.py:56-61` Beta 收缩数学正确，但按 (品种,方向,市态) 分组给**同组内 0.9 与 0.6 的原始置信度同一个历史锚**——是分组命中率估计，不是校准映射（无分桶、无可靠性曲线、无 Brier）。
- `outcome_store.py:118-143`：≥20 成熟样本才混合（raw*0.35+hist*0.65），不足**原样透传**；alert_aggregator.py:1034-1046 裸 `except` ⇒ 存储故障时静默未校准。
- 结果回填循环真实存在（signal_observations + 15 分钟评估任务），止损先于止盈的保守 tie-break 正确（outcomes.py:39-49）；MFE/MAE 统计越过出场 bar（:30-35）、跳空按精确止损价成交（乐观）为小瑕疵。

### 7.5 可复现性（问题 6）——零

无 ResearchRun/run_id 实体（唯一 "run_id" 是从 JSON 读的展示标记，alert_aggregator.py:443-456）；无代码 SHA/配置哈希/种子持久化（BacktestResult 写入时甚至 `params=None`，tasks/backtest_tasks.py:39-53）；种子全靠约定 42（hmm/rf/cluster/GP/优化器等十余处）或未设种子（RL episode、Monte Carlo）。**且每日 07:00 定时回测在 `np.random` 合成的 OHLCV 上跑**（tasks/backtest_tasks.py:8-19）并写库——库中真假结果不可区分（P0-10）。

### 7.6 幸存者偏差与容量

- 采集侧：TDX 期货只采最近 3 个合约并过滤已到期（futures_collector_tdx.py:63-70）；股票宇宙=当前上市（stocks_collector.py:100-144，无退市源）；`symbols.status` 永远 'active'。已采数据不删除（除 180 天分钟线清理），所以历史合约的既有数据尚在——偏差在增量采集侧持续累积。
- 容量/流动性：除 trusted 引擎的 1 手固定仓位外无任何容量建模；vectorized 无成交量约束。个人模拟系统可接受，但报告必须披露。

### 7.7 测试覆盖评价

trusted 执行（次开盘/乘数/保证金/涨跌停/固定费+盯市）与信号经济学 fail-closed 的测试**质量高**；`test_backtest.py` 全部 35 行只断言返回对象有属性——P0-3 的算术 bug 对它不可见；`test_adaptive.py` 固化切分 bug；`backtest/walkforward.py` 无测试；无任何"故意含未来函数的策略必须被击败"类测试（任务书 Phase 2 验收 5 的要求目前无处落地）。

---

## 8. Security & LLM Governance Review

> 全部 VERIFIED。回答任务书 §4.4。

### 8.1 认证与授权

**做对的部分**：双 principal 分离（web admin token 与 Agent JWT/API-key 显式不可互换，agent_routes.py:52-79）；Agent API key 以 HMAC-SHA256(pepper) 哈希存储、仅创建时打印一次（api/services/agent_credentials.py:22-28；scripts/create_agent_api_key.py:48-49）；外部 key 权限上限 `read_data/read_strategies/simulate_trade` 且路由层二次校验（agent_kernel_routes.py:295-298）；登录常数时间比较 + 每 IP 10 次/5 分钟限流（auth_routes.py:72-90）；`ENV=production` 且缺 `ADMIN_PASSWORD`/`AUTH_TOKEN_SECRET` 时登录端点 fail-closed 503。相关测试（test_agent_auth_security.py 共 6 项）本轮本机全绿。

**失守的部分（P0-8 / P2-4 / P2-5）**：
1. `ENV` 默认 `development`（auth_routes.py:14）⇒ 硬编码密码 `admin@admin` + 硬编码 HMAC secret 生效；token 格式 `user:ts:HMAC前16hex` 且 secret 在源码中 ⇒ **任何读过源码的人可离线伪造 admin token**；compose 默认对外发布 8000 端口且未设 `ENV=production`。
2. 该伪造 token 直通 `agent_v3:approve`（agent_routes.py:59-66 将任何合法 web token 映射为全权限 principal）⇒ Champion 人工审批被架空。
3. 全 API 约 40 个路由模块中仅 5 个使用鉴权依赖；无鉴权面包括：`db_routes.py` 直写端点、`llm_routes.py` 的 `analyze/generate/tasks/run`（可耗尽付费 LLM 额度）、数据同步触发端点。
4. 限流为进程内存态：多 worker 无效、重启清零、以 `client.host` 为键可被代理头影响。
5. token 无吊销、无轮换、MAC 截断 64-bit。

### 8.2 密钥处理

- `.env`、`data/`（含 `data/llm_providers.json` 密文存储）均在 .gitignore；`git ls-files` 未发现已提交凭据；本轮未输出任何密钥内容。（VERIFIED）
- LLM provider key 静态加密：macOS/Linux 回退为本地 secret 文件 XOR/AES 方案，密钥文件与密文**同目录**（config_store.py:434-448）——对文件系统读取者无保护（P1-5）。
- `GET /api/v1/llm/providers/{id}/edit` 返回**解密明文 key**（llm_routes.py:683-690，为编辑体验设计，cerebrum 有记录）且**无审计事件**；解密失败时静默把密文当明文返回（config_store.py:334-335）。
- Git 远程凭据：用户已明确选择保留（cerebrum 2026-08-12），本评审遵守——不输出、不修改；建议项见 §10 D6。

### 8.3 LLM 治理

- **计划层是好的**：LLM planner 15s 超时、输出 JSON schema 校验、非法/超时回退确定性安全计划（llm_planner.py:44-99）；工具经 ToolRegistry allowlist + 结构化参数，副作用工具注册时强制要求审批标记，占位工具拒绝注册（tool_registry.py）。LLM 无法自由拼接 SQL/命令。（VERIFIED）
- **注入通道存在（P1-6）**：新闻原文直接插值进分析 prompt（news/ai/analyzer.py:73-78），无定界标记、无"外部文本非指令"防护。影响面有界：该路径产出情绪分/摘要（数据），不触发工具调用；但污染的情绪分会作为 evidence 进入 fused_signal 与 blockers ⇒ 可被构造新闻操纵研究结论方向。
- **成本控制不完整**：Agent 内核有 per-task 成本预算与准入（admission.py），但预算"每日重置"无实现（P1-3）；无鉴权 LLM 端点绕过一切预算（P0-8.3）；无全局月度用量记账。
- LLM 输出未用作训练标签（任务书 §7.4.5 边界当前满足）。（VERIFIED）

### 8.4 供应链

无 dependabot / secret scanning (gitleaks) / pip-audit / npm audit / 容器扫描 / SBOM（P2-7）；依赖为下限约束（`>=`）无锁文件（Python 侧），CI `npm ci || npm install` 回退掩盖前端 lockfile 漂移。

### 8.5 审计链

AgentApproval/AgentEvent/trading_evidence 构成较好的决策审计基础（VERIFIED）；缺口：审批无 `expires_at`（P1-4）、密钥读取无审计（P1-5）、web admin 操作（非 Agent 路径）基本无审计事件。"不可抵赖"未达成但地基存在。

---

## 9. Operations & Disaster Recovery Review

> 全部 VERIFIED。回答任务书 §4.3。

### 9.1 备份与恢复（当前 RPO=∞，RTO=∞）

- 全仓库唯一的"备份"是 scripts/deploy.sh:24-26 打包 `.env` 与配置文件；DEPLOYMENT.md:326-331 的每日 pg_dump cron 是**文档虚构**，无对应脚本、无 crontab 证据。
- 已知生产 PG 服务器 18.3 而 pg_dump 客户端 16.14（REPO-CLAIMED，cerebrum 2026-08-10）——即便手工备份也大概率版本拒绝。
- `sync_scheduler.py:330-344` 每日**永久 DELETE** 180 天前分钟线——在零备份前提下的定期数据销毁。
- 无恢复演练、无异机副本、无备份校验。任务书 Phase 4 的判断正确但排期太晚：**备份必须进 Phase 0**。

### 9.2 任务系统

- 活 app `tasks/celery_app.py`：8 个 beat 任务，但**无 time_limit/soft_time_limit、无 max_retries 策略、无死信队列**；`reports` 队列被路由却无消费者（deploy.sh 启动 `-Q celery,backtest,training`）。
- 死 app `core/tasks/celery_app.py` 反而配置了时限——被测试与文档引用造成双真相源（P2-1）。
- 裸机部署以 `nohup` 启动 worker/beat（deploy.sh:103-109），无 systemd 监督、无自动重启。
- Agent 内核任务：SKIP LOCKED 租约 + CAS 续约正确；但 step 恢复是死代码（P1-1）、无毒任务上限（P1-2）、admission 计数崩溃泄漏 + 每日预算永不重置 ⇒ fail-closed 自锁（P1-3）。
- realtime sync 在每个 uvicorn worker 的 lifespan 内自启动（main.py:62），`--workers 4` ⇒ 4 份并发采集（P1-8，正是 2026-07-10 迁 Celery 想解决的竞态的回归）。

### 9.3 可观测性

- 无 Prometheus/OTel/结构化 request_id——loguru 文本日志 + `MonitorAlert` 写库但**无送达通道**（monitoring/channels/feishu.py 是从未接线的死代码）。
- "5 分钟内回答哪里坏了"目前不可能：无仪表盘、无告警推送、`/health` 契约断裂（P0-9：Dockerfile 与 deploy.sh 打 `/health`，实际路由 `/api/v1/health`，根 deploy.sh:150-155 已把 404 注释为"已知警告"——**坏健康检查被制度化**）。
- Agent 运行时自带 runtime_monitor 指标快照（好），但仅 API 拉取无推送。

### 9.4 增长与保留

`signal_observations`（15 分钟评估任务持续写入）、`agent_events`、`news_snapshots`、`backtest_results`（每日被合成数据污染，P0-10）均无保留/归档策略；`.wolf/token-ledger.json` 8.7MB 且持续增长在 Git 内。分钟线反而有激进的 180 天删除。保留策略与备份需一并设计（Phase 4）。

### 9.5 CI/CD 与部署

- P0-2（pytest 管道吞退出码）+ P0-9（docker job 条件 `master`）+ `npm ci || npm install` ⇒ CI 的实际保障远低于表面。
- 生产镜像从未经 CI 构建验证；prod compose 实挂 `nginx.conf` 而 `nginx.prod.conf` 是弃儿（P2-1）。
- 文档漂移严重（P2-3）：两份架构文档仍描述 DuckDB 仓库；部署文档含虚构备份与错误健康检查示例；QUICK_START 面向已弃用的 Windows 环境。

---

## 10. Open Decisions（需用户批准）

| # | 决策 | 推荐 | 代价/备注 |
|---|---|---|---|
| D1 | **`core/data` 恢复方式**：(a) 从生产机把目录拷回并提交（推荐，保全 anatomy 所列能力）；(b) 若生产机也没有 ⇒ 移除 data_routes 等死导入，接受能力缩水并更新文档 | (a) | 需要你在生产机执行一次 `tar` 取回；(b) 是不可逆的能力放弃 |
| D2 | **历史合成回测数据处置**：(a) 迁移打标 `is_synthetic=true` 保留审计；(b) 直接删除 `backtest_results` 中 07:00 任务产生的行 | (a) | (b) 属破坏性操作，需备份先行（依赖 TASK-0.4） |
| D3 | **loops/ 影子系统**：(a) 停 crontab + 冻结目录，产物移出 Git（推荐，待 Phase 1 完成后重评估）；(b) 纳管——重写为调用本仓库 API 并受 quality gate 约束；(c) 保持现状 | (a) | (b) 工作量约 1–2 周且依赖 Phase 1；(c) 意味着接受一条绕过全部门禁的决策路径继续运行 |
| D4 | **镜像发布策略**：(a) 修为 `main` 分支 push 触发；(b) 删除 docker-build job，仅本机构建 | 按你的部署形态定 | 你从未依赖过该 job（它从未跑过），(b) 最诚实 |
| D5 | **vectorized 引擎退役时点**：迁移完成后保留几轮对照（`LEGACY_ENGINE=1`）再删，或立即删 | 保留 2–4 周对照 | 对照期结果差异本身是有价值的校准证据 |
| D6 | **Git 凭据**：保持现状（你已确认）或迁移到 credential manager/SSH | 尊重你已有决定，仅在此登记建议 | 本评审未读取、未输出、未修改任何凭据 |
| D7 | **股票退市宇宙**：(a) 接受幸存者偏差并在所有报告强制披露（推荐，免费源无退市数据）；(b) 购买含退市的点时数据 | (a) | (b) 即任务书 §11.3 的数据预算问题 |
| D8 | **未来 6 个月主目标排序**（任务书 §11.1） | 可信度 > 稳定运行 > 收益探索 | 本评审全部排期基于此排序；若你选收益优先，Phase 1 仍不可跳过（否则探索建立在错误数字上） |

## 11. Rejected Ideas（明确不做，及理由）

1. **重写/修复 vectorized 引擎的资金核算** — 拒绝。trusted 引擎已实现正确语义且有测试；修 vectorized 是在死代码上镀金。策略=换血不输血。
2. **微服务/K8s/Kafka/向量数据库/事件溯源** — 拒绝（与任务书 §6.3 一致）。单机单人系统，PG+Celery 远未到瓶颈，且当前问题全是正确性问题不是规模问题。
3. **引入 Prometheus/Grafana 全家桶** — 本阶段拒绝。告警送达（飞书）+ DB 健康快照 + 结构化日志即可满足"5 分钟定位"；等有真实多机部署再议。
4. **新增 LLM provider、Agent 角色、策略、因子、深度模型** — 冻结（与任务书 §6.1/6.2 一致）。在 rank() 未来函数修复前，任何新因子的 IC 都不可信。
5. **全局测试覆盖率百分比门槛** — 拒绝。1,400+ 测试中已有大量弱断言（test_backtest.py 式"有属性即通过"）；覆盖率数字会奖励更多弱测试。改为关键域黄金用例制（TASK-1.1）。
6. **把 `.wolf/` OpenWolf 记忆迁库/系统化** — 拒绝。它是开发工具不是产品；只需把 8.7MB token-ledger 移出跟踪。
7. **立即实现完整 bitemporal（全表 valid_time/transaction_time）** — 拒绝。成本巨大；只对宏观/新闻/K 线修订做定向点时字段（Phase 2），instrument_specifications 已有的 effective_from/to 是够用范本。
8. **RL/深度学习管线的修复投入** — 拒绝（冻结而非修复）。约 2 万行无决策路径接入的代码，修复优先级排不进 6 个月。
9. **自动化 Champion 晋升（哪怕"高置信度自动"）** — 永久拒绝。人工闸门是任务书硬边界，且当前晋升统计的可信度恰恰是本评审否定的对象。
10. **用 LLM 做回测结果解读并写回数据库** — 拒绝。LLM 输出只能作展示层注释，不得成为持久化事实（任务书 §2.2.4 的自然延伸）。

---

## 12. Implementation Prompt Pack

> 使用方法：每次只把**一个** TASK 提示词交给实施模型（GPT），并附上仓库访问。每个提示词自包含：现状证据、范围、设计、迁移、测试先行、验收命令、可观测性、回滚、停止条件。全部提示词共享以下前言，请原样拼在每个任务前：

```text
【通用前言】你在私有仓库 trading-strategy-center（FastAPI + PostgreSQL + Redis/Celery + React）上实施一个单一任务。
规则：
- 只做本任务列出的范围，不顺手重构、不清理无关代码（遵守 AGENTS.md Karpathy Guidelines）。
- 先写失败测试再实现；每个行为变化必须有回归测试。
- 不接实盘/CTP；不弱化人工审批、风险门禁、成本模型、审计。
- 不输出/复制/写入任何密钥、token、.env 内容。
- JSON API 不得输出 NaN/Infinity。
- 数据库变更走 expand → backfill → contract；先加 nullable 列。
- 完成后提供：变更摘要、测试证据、迁移步骤、回滚方法、遗留风险。
- 遇到"停止条件"中的情形，立即停止并向用户报告，不要自行猜测绕过。
```

---

### TASK-0.1 恢复 core/data 包并修复 .gitignore

**目的**：让全新克隆可以 `import main`；消除"生产运行未版本化代码"。
**现状证据**：`.gitignore:7` 的 `data/` 无锚定，`git check-ignore -v core/data/__init__.py` 命中该行；`core/data/` 不在 git 也不在本机磁盘；`api/routes/data_routes.py:6` 无条件 `from core.data.market_data_manager import MarketDataManager` 且注册于 `api/router_registry.py:22`；实测 `import main` ⇒ ModuleNotFoundError。
**范围内**：`.gitignore`（`data/` → `/data/`，并显式 `!core/data/`）；从生产机取回的 `core/data/` 目录提交；若用户走 D1(b)，改为移除 `api/routes/data_routes.py` 注册与 `core/tasks/` 内死导入。
**范围外**：不改 core/data 内部逻辑；不动其他 ignore 规则。
**测试先行**：新增 `tests/unit/test_import_integrity.py`：(1) `importlib.import_module("main")` 成功；(2) 遍历 `api/router_registry.py` 引用的所有模块可导入。当前应红。
**验收命令**：
```
git ls-files core/data/ | head          # 非空
python -c "import main; print('OK')"
python -m pytest tests/unit/test_import_integrity.py -q
```
**可观测性**：无新增（结构性修复）。
**回滚**：revert 提交即可；无数据影响。
**停止条件**：生产机上也不存在 `core/data/`（说明生产另有部署方式）⇒ 停，向用户报告并等 D1 决策。

---

### TASK-0.2 让 CI 测试步骤真正生效

**目的**：使测试失败能让 CI 变红。
**现状证据**：`.github/workflows/main.yml:67,71` `python -m pytest ... | tail -50`，无 `shell: bash` 声明 ⇒ 默认 `bash -e {0}` 无 pipefail，退出码为 tail 的 0；`tests/unit/test_data_layer.py` 收集失败但 CI 绿证实此事；`market_state/__init__.py:1` 无条件导入 hmmlearn 而 hmmlearn 在 `[ml]` extra（pyproject.toml:47），CI 只装 `[dev]`（main.yml:57）。
**范围内**：main.yml（去掉 `| tail -50` 或加 `set -o pipefail`；job 名用 matrix 变量；docker job 分支条件按 D4 决策处理；`npm ci || npm install` 改为纯 `npm ci`）；`market_state/__init__.py` 把 hmmlearn 导入改为惰性/try-except（模仿 ml/pipeline.py:31 的做法）；修复或跳过 test_data_layer（依赖 TASK-0.1 结果）。
**范围外**：不加覆盖率门槛；不加新扫描（那是 TASK-5.1）。
**测试先行**：本地 `python -m pytest tests/unit/ -q` 先确认当前失败清单；在分支上故意提交一个 `assert False` 测试验证 CI 变红后移除。
**验收命令**：
```
grep -n "tail -50" .github/workflows/main.yml   # 无结果
python -c "import market_state"                  # 无 hmmlearn 环境下成功
# CI: 注入失败测试的提交显示红色，移除后绿色
```
**回滚**：revert workflow 提交。
**停止条件**：修复后 CI 暴露超过 20 个既有失败 ⇒ 停，产出失败清单给用户排优先级（不许为了绿灯跳过测试）。

---

### TASK-0.3 修复 /health 契约

**目的**：容器健康检查与部署健康门真实工作。
**现状证据**：Dockerfile:50 与 scripts/deploy.sh:31-37 均探测 `/health`；唯一健康路由是 `/api/v1/health`（health_routes.py:7 + router prefix）；根 deploy.sh:150-155 注释把 404 当"已知警告"。
**范围内**：在 `main.py` 加一个极简 `GET /health`（无鉴权、只读、返回 `{"status":"ok"}`，不查 DB——存活探针语义）；保留 `/api/v1/health` 为深度诊断；两个 deploy.sh 与 DEPLOYMENT.md 示例对齐。
**测试先行**：`tests/unit/test_web_api.py` 加 `test_health_root_returns_200`。
**验收命令**：
```
python -m pytest tests/unit/test_web_api.py -q
curl -s localhost:8000/health   # {"status":"ok"}
docker inspect --format='{{.State.Health.Status}}' <app容器>  # healthy
```
**回滚**：revert；无数据影响。
**停止条件**：无。

---

### TASK-0.4 自动备份 + 恢复演练脚本

**目的**：RPO 从 ∞ 降到 ≤24h，且恢复被证明可行。
**现状证据**：全仓库无 pg_dump 自动化；scripts/deploy.sh:24-26 只备份配置；DEPLOYMENT.md:326-331 备份 cron 是虚构；生产 pg_dump 16 vs 服务器 18.3（cerebrum 2026-08-10）；sync_scheduler.py:330-344 每日删 180 天前分钟线。
**范围内**：新增 `scripts/backup_db.sh`（pg_dump -Fc + 校验（pg_restore --list）+ 保留策略 7 天日备/4 周周备 + 异机/对象存储上传钩子（rsync/rclone 目标由环境变量给出））；`scripts/restore_drill.sh`（恢复到 `restore_drill_<date>` 隔离库 → `alembic current` 校验 head → 关键表行数对比 → 输出演练报告 JSON）；`docs/RUNBOOK_BACKUP.md`；DEPLOYMENT.md 虚构段落替换为真实脚本引用；服务器侧 cron/systemd timer 安装说明（脚本内 `--install-cron` 选项）。**先决**：在生产机安装 postgresql-client-18（脚本启动时校验 `pg_dump --version` 主版本 ≥ 服务器主版本，不匹配即退出码 2）。
**范围外**：不改 sync_scheduler 的删除逻辑（但在 RUNBOOK 中记录"分钟线保留 180 天"为既定策略，备份使其可恢复）。
**测试先行**：`tests/unit/test_backup_scripts.py`：shellcheck 通过 + `--dry-run` 输出预期命令序列（不真连库）。
**验收命令**：
```
bash scripts/backup_db.sh --dry-run
bash scripts/restore_drill.sh --dry-run
# 生产机（用户执行）：真实跑一轮 backup + drill，drill 报告 status=ok
```
**可观测性**：备份脚本结束时向 `data/ops/backup_status.json` 写时间戳+大小+校验结果（供 /api/v1/health 深度诊断读取，报"备份年龄"）。
**回滚**：脚本为新增文件，删除即回滚；演练库用后即删。
**停止条件**：生产机无法安装 PG18 客户端 ⇒ 停，报告替代方案（容器化 pg_dump）等用户批准。

---

### TASK-0.5 认证密钥 fail-closed

**目的**：消除离线伪造 admin token 的可能。
**现状证据**：auth_routes.py:14 `ENV` 默认 `development` ⇒ :55-60 硬编码密码与 HMAC secret 生效；token=`user:ts:HMAC[:16]`；agent_routes.py:59-66 将 web token 映射为含 `agent_v3:approve` 的全权限 principal；docker-compose.yml:8 对外发布 8000 且未设 ENV；settings.py:75-80 AGENT_JWT_SECRET/pepper 同样有 dev 回退。
**范围内**：将"允许 dev 回退"的条件从 `ENV != production` 收紧为 `ENV == development 且监听地址为 127.0.0.1`（从 uvicorn 启动参数/环境变量判定，无法判定则视为非本地）；否则缺密钥时登录与 agent 鉴权端点返回 503 并打日志；compose 两个文件显式 `ENV: production` 并要求注入密钥（用 `${VAR:?err}` 语法使 compose 启动即失败）；`.env.example` 增补三项密钥说明。
**范围外**：token 格式升级、吊销、轮换（P2-5，另立任务）；不动 Agent API key 体系（已合格）。
**测试先行**：扩展 tests/unit/test_agent_auth_security.py：(1) ENV=production 无密钥 ⇒ login 503；(2) ENV=development 且非 localhost ⇒ 503；(3) 显式密钥 ⇒ 200。
**验收命令**：
```
python -m pytest tests/unit/test_agent_auth_security.py -q
docker compose config   # 缺密钥环境变量时报错退出
```
**回滚**：revert 提交；部署侧回滚需同时移除 compose 的必填变量（在变更摘要中写明）。
**停止条件**：发现还有其他消费硬编码 secret 的路径（grep 确认）⇒ 一并列出报告，不扩大本任务范围。

---

### TASK-0.6 全局默认拒绝鉴权

**目的**：写端点与烧钱端点不再裸奔。
**现状证据**：约 40 个路由模块中仅 5 个使用鉴权 Depends；无鉴权面包括 db_routes.py 写端点、llm_routes.py:517-591,637,748-760（analyze/generate/tasks/run）、数据同步触发端点；CORS `allow_origins=["*"]`（settings.py:40）。
**范围内**：在 `api/router_registry.py` 的 `register_all` 为每个 router 附加全局鉴权依赖（复用 auth_routes 的 token 校验）；建立显式公开清单 `PUBLIC_PATHS`（`/health`、`/api/v1/auth/login`、只读行情/K线查询等——逐条列出并在 PR 描述中说明理由）；CORS 收紧为环境变量配置的 origin 列表（默认 `http://localhost:3000`）。
**范围外**：细粒度 RBAC（当前单用户，admin 即全权）；限流改造。
**测试先行**：`tests/unit/test_auth_coverage.py`：用 TestClient 遍历 app 全部路由，断言"非 PUBLIC_PATHS 的路由未带 token 返回 401/403"；对 PUBLIC_PATHS 断言 200/4xx-非鉴权错误。当前应大面积红。
**验收命令**：
```
python -m pytest tests/unit/test_auth_coverage.py tests/unit/test_web_api.py tests/unit/test_llm_config.py -q
```
**可观测性**：401 响应打 WARNING 日志含 path 与 client IP。
**回滚**：revert；前端如有页面因此失效（未带 token 的调用），失败清单随变更摘要给出。
**停止条件**：前端超过 10 处调用未走 AuthContext token ⇒ 停，报告清单，前端修复另立任务。

---

### TASK-0.7 仓库卫生与文档对齐

**目的**：产出可信的 CURRENT_STATE 与能力矩阵；消除误导性文档。
**现状证据**：见 §3 P2-1/P2-2/P2-3（死模块、`=3.0`、跟踪的日志/dbm/8.7MB token-ledger、DuckDB 文档、虚构备份段落等，均有行号）。
**范围内**：(1) `git rm --cached` 运行时文件并补 .gitignore（`=3.0`、celerybeat-schedule、api.log、logs/*.log、.wolf/token-ledger.json）；(2) 一次性脚本移入 `archive/scripts/`（git mv，不删）；(3) docs/ 根的历史"完成报告"移入 `docs/archive/`；(4) ARCHITECTURE.md/system-architecture.md 的 DuckDB 段落改为 PG 现状（或整文件标注"历史设计，见 CURRENT_STATE"）；(5) 新写 `docs/CURRENT_STATE.md`（以本评审 §2 为底）与 `docs/CAPABILITY_MATRIX.md`（功能→入口→模块→表→测试→成熟度→是否启用；Freeze/Retire 候选照 §4 标注）。
**范围外**：不删除任何 .py 死代码（Retire 需用户批准后另立任务执行）。
**测试先行**：无（纯文档/跟踪状态变更）；验收改用命令断言。
**验收命令**：
```
git ls-files | grep -E "^=3.0|celerybeat-schedule|api.log|^logs/" | wc -l   # 0
git ls-files .wolf/token-ledger.json | wc -l                                # 0
grep -rn "DuckDB" ARCHITECTURE.md docs/system-architecture.md | grep -v "历史\|archive" | wc -l  # 0
test -f docs/CURRENT_STATE.md && test -f docs/CAPABILITY_MATRIX.md
```
**回滚**：git revert（git mv 可逆）。
**停止条件**：无。

---

### TASK-0.8 loops/ 治理（按 D3 决策执行）

**目的**：消除绕过门禁的平行决策路径（或将其纳管）。
**现状证据**：loops/orchestrator.py 与 graph_engine.py 硬编码 `/data/trading-strategy-center` 与 `~/.hermes/scripts`；loop-trader 盘中每 10 分钟推飞书；trading_journal/account.json 模拟持仓被提交进 Git（基线提交即 Hermes Agent 的持仓恢复）；loops/scripts/risk_check.py 独立读 JSON，不经 signals/quality 门禁。
**范围内（D3(a) 默认）**：服务器 crontab 移除相关条目（提供命令清单由用户执行）；`loops/` 与 `trading_journal/` 加入 .gitignore 的运行时白名单策略（保留 README 契约文件，STATE/LOGS/持仓 JSON 不再跟踪）；loops/README.md 顶部加"FROZEN 2026-08 — 待 Phase 1 完成后重评估"标注。
**范围外**：不删除 loops 代码；不实现 D3(b) 纳管方案。
**验收命令**：
```
git ls-files loops/ | grep -E "STATE|LOGS|state.json|graph_state" | wc -l   # 0
git ls-files trading_journal/ | wc -l                                        # 0（或仅 README）
```
**回滚**：revert + 恢复 crontab（命令在变更摘要中）。
**停止条件**：用户选 D3(b)/(c) ⇒ 本任务改写为对应方案，重新报设计。

---

### TASK-1.1 可信执行语义黄金测试集（先行，先红）

**目的**：把执行语义规范固化为可执行验收，作为引擎切换的裁判。
**现状证据**：test_backtest.py 仅断言属性存在（35 行）；vectorized 引擎五类缺陷见 §3 P0-3（行号齐全）；trusted 引擎语义见 trusted_engine.py:65,74,93,112-115,129-141。
**范围内**：新增 `tests/unit/test_execution_semantics_golden.py`，用手工构造的小型 OHLCV（10–20 bar，数值可手算）断言：(1) T bar 产生的信号最早在 T+1 开盘成交；(2) 一次完整往返后 `final_equity == initial + qty*multiplier*(exit-entry) - costs`（本金守恒）；(3) 乘数正确参与 PnL；(4) 固定/比例两种手续费；(5) 涨跌停 bar 拒单；(6) 做空对称；(7) 权益曲线持仓期逐 bar 盯市（非保证金计值）。测试以"引擎工厂"参数化，先只对 trusted 跑（应绿），对 vectorized 跑标记 xfail（记录其失败即证据）。
**范围外**：不改任何引擎代码。
**验收命令**：
```
python -m pytest tests/unit/test_execution_semantics_golden.py -q   # trusted 全绿，vectorized xfail
```
**回滚**：新增文件，删除即回滚。
**停止条件**：trusted 引擎在黄金用例上出现意外失败 ⇒ 停，报告（这将改变 TASK-1.2 的前提）。

---

### TASK-1.2 trusted 引擎成为唯一决策事实源

**目的**：让锦标赛/晋升/进化/回测 API 的数字变得可用。
**现状证据**：backtest_routes.py:140,182,218（run/quick/batch 用 VectorizedBacktest）、:368（/trusted 用 TrustedBacktestRunner）；tournament/tournament_runner.py:19；core/adaptive/promotion_gate.py:118-135；core/evolve/runner.py:431-438；trusted_backtest.py:74-76 从不加载 limit_up/down。
**范围内**：(1) 为 TrustedBacktestRunner 增加批量接口与 BacktestResult 兼容适配层（保持现有 API 响应 schema 字段不变，新增 `engine:"trusted"` 字段）；(2) 四个调用方切换；(3) K 线加载补 limit_up/limit_down（PG kline 表已有列则直读，无则按品种规则推导并标注估算）；(4) 环境变量 `LEGACY_ENGINE=1` 可切回 vectorized 用于对照（默认关）。
**范围外**：不删 vectorized（D5 决策后另行退役）；不改策略 compute 逻辑；不改 WFV（TASK-1.3）。
**迁移**：`backtest_results` 表加 nullable `engine` 列（expand）；旧行 engine=NULL 视为 legacy。
**测试先行**：黄金测试集对 `/backtest/run` 路径参数化跑（当前红）；test_tournament_runner/test_promotion_gate 适配后须全绿。
**验收命令**：
```
python -m pytest tests/unit/test_execution_semantics_golden.py tests/unit/test_backtest.py tests/unit/test_tournament_runner.py tests/unit/test_promotion_gate.py tests/unit/test_trusted_backtest_runner.py -q
# 对照：LEGACY_ENGINE=1 与默认各跑一次 /backtest/batch，输出差异报告存 docs/evidence/
```
**可观测性**：回测响应与日志均带 engine 标记。
**回滚**：`LEGACY_ENGINE=1` 环境变量即刻回退行为；代码 revert；engine 列保留无害。
**停止条件**：切换后锦标赛排名剧变导致现有 Champion/Challenger 状态失义 ⇒ 停，报告差异，由用户决定是否重置锦标赛状态。

---

### TASK-1.3 WalkForwardValidator 修复 + 晋升门禁重构

**目的**：样本外验证真实化，晋升有统计门槛。
**现状证据**：walk_forward_validator.py:68-76（expanding 切分与 i 无关）、:141-144（overfit_ratio=1/n 或 NaN）、:151-155（NaN<0.3 拒好策略）；promotion_gate.py:119-120（purge/embargo=0）、:165（mean_oos>0 即过）、:94-110（末 bar HMM 市态）；test_adaptive.py:333-341 固化 bug；backtest/walkforward.py:17-22 train 未用。
**范围内**：(1) 修 expanding 切分（train_end 随 i 递增，test 段逐窗前移）；(2) purge=标签跨度、embargo≥1 bar 为默认；(3) overfit_ratio 改为 IS/OOS 绩效比或逐窗 OOS 衰减率（语义写进 docstring 与测试）；(4) NaN 一律返回"证据不足"而非 False 拒绝；(5) promotion_gate 门槛改为：最小样本数（可配置，默认≥30 笔 OOS 交易）+ OOS Sharpe 下限 + 成本 2x 情景仍为正 + 简单多重检验控制（对 N 个候选用 Bonferroni 校正的 t 检验或至少记录候选总数 N 于结果中）；(6) backtest/walkforward.py 标注 deprecated 并让 strategy_tools.py:170 改用修复后的 validator；(7) 修正 test_adaptive.py 的错误断言。
**范围外**：PBO/DSR 完整实现（记为后续增强）；市态分组重设计（末 bar HMM 问题记录为 known limitation）。
**测试先行**：新测试断言：不同窗口切分互异；含未来函数的合成策略（在信号中直接使用 t+1 收盘）IS 表现极好但被 OOS+扰动组合拒绝——这即任务书 Phase 2 验收 5 的落地。
**验收命令**：
```
python -m pytest tests/unit/test_adaptive.py tests/unit/test_promotion_gate.py tests/unit/test_lookahead_detection.py -q
```
**可观测性**：晋升决策记录写入含全部门槛值与实际值的 JSON（进现有 promotion 结果结构）。
**回滚**：revert；晋升门槛变化不影响已有 Champion 状态（只影响未来晋升）。
**停止条件**：修复后现役全部策略无一通过新门槛 ⇒ 不是停止而是**预期结果**，如实报告；但若连合成的"完美策略"（无未来函数、强信号）也不通过 ⇒ 门槛实现有 bug，停下排查。

---

### TASK-1.4 历史主力合约映射与分段回测

**目的**：消除"用今日主力回测全历史"的点时违规。
**现状证据**：main_contract_resolver.py:50-79（按最近 30 天成交量选今日主力）；promotion_gate.py:45-52（fallback `{code}2510`）；`futures_main_switches` 表存在（warehouse_tables_v1.py）但回测路径未使用。
**范围内**：(1) 新增 `build_main_contract_schedule(product, start, end)`：按逐日成交量/持仓量从 kline 表重建历史主力序列，结果写入/复用 `futures_main_switches`（幂等 upsert）；(2) 回测 K 线加载器按 schedule 分段拼接真实合约数据（不做价格后复权——分段之间不跨段持仓：换月日强制平仓再开仓，成本按两笔计）；(3) backtest_routes/tournament_runner/promotion_gate 的 `_load_kline` 统一走新加载器；(4) 删除 `{code}2510` 硬编码 fallback（改为显式报错"无法解析主力"）。
**范围外**：后复权连续合约（记为后续增强；分段+换月强平已消除主要偏差）；股票/期权路径。
**迁移**：`futures_main_switches` 回填历史（幂等脚本，可重跑）。
**测试先行**：构造两个合约交叠的合成数据：断言 schedule 切换日正确、回测在切换日发生平仓+开仓、无任何 bar 使用切换日之后才成为主力的合约。
**验收命令**：
```
python -m pytest tests/unit/test_main_contract_schedule.py tests/unit/test_backtest.py -q
```
**可观测性**：回测结果新增 `roll_count`、`roll_cost` 字段。
**回滚**：加载器以环境变量 `PIT_CONTRACTS=0` 切回旧行为（默认开）；revert 可完全回退。
**停止条件**：某品种 kline 覆盖不足以重建 schedule（如 ZC 已知数据源异常）⇒ 该品种标记 `schedule_incomplete` 并从回测宇宙剔除，列入报告，不得静默回退旧逻辑。

---

### TASK-1.5 因子算子点时修复

**目的**：消除 rank/zscore/IC 的全样本未来函数。
**现状证据**：operators.py:9-11（rank=全样本 pct 百分位）；factor_combiner.py:225-226（全样本 zscore）；factor_evaluator.py:34-64（单值全样本 IC，IR 无意义）；alpha001.py:35 等约 500 文件消费 rank。
**范围内**：(1) `operators.rank` 改为滚动窗口 ts_rank（默认窗口如 252，可配置）并保留 `rank_full_sample` 旧名显式标注 lookahead（供对照）；(2) factor_combiner 的 zscore 改滚动；(3) factor_evaluator.calculate_ic 改为滚动窗口 IC 序列，IR=mean(IC)/std(IC)；(4) 产出受影响因子清单（grep rank( 的因子文件列表）进 docs/evidence/；(5) min_periods 与 docstring 对齐（P3-4 顺带，因为同文件同函数）。
**范围外**：横截面 rank 的真实实现（需要横截面数据管道，另立任务）；不逐个验证 500 个因子公式正确性。
**测试先行**：断言 rank(series)[t] 只依赖 [t-window, t]（对前缀不变性测试：截断未来数据后前缀结果不变）——这是可复用的"点时不变性"测试模式。
**验收命令**：
```
python -m pytest tests/unit/test_alpha101_base.py tests/unit/test_alpha.py tests/unit/test_factor_pipeline.py tests/unit/test_point_in_time_operators.py -q
```
**可观测性**：因子计算日志带 operator 版本号（v2-pit）。
**回滚**：revert；旧行为保留在 `rank_full_sample` 可对照。
**停止条件**：滚动化后某些 alpha 因子输出全 NaN（窗口不足）⇒ 列清单报告，不逐个魔改窗口。

---

### TASK-1.6 移除合成数据定时回测

**目的**：数据库不再被随机数"业绩"污染。
**现状证据**：tasks/backtest_tasks.py:8-19（np.random.normal 合成 OHLCV）、:39-53（写 backtest_results，params=None）；tasks/celery_app.py beat 每日 07:00 触发。
**范围内**：任务改为从 PG 仓库读真实 K 线（复用 TASK-1.2 的 trusted 批量接口）；无数据品种跳过并记日志；按 D2 决策处理历史行（打标或删除——删除需 TASK-0.4 备份完成后执行并留存删除脚本）。
**迁移**：D2(a) 路线：`backtest_results` 加 nullable `is_synthetic` 布尔，按时间窗口+params IS NULL 特征回填 true。
**测试先行**：断言任务函数在无真实数据时不写库；有数据时写入行带 engine=trusted 且 is_synthetic=false。
**验收命令**：
```
python -m pytest tests/unit/test_tasks.py -q
grep -n "np.random" tasks/backtest_tasks.py | wc -l   # 0
```
**回滚**：revert 代码；打标列保留无害；若执行了删除，用备份恢复。
**停止条件**：真实数据接入使每日任务耗时 >30 分钟 ⇒ 报告并缩小默认品种集，不得改回合成数据。

---

### TASK-1.7 最小运行清单（run manifest）

**目的**：每条回测/晋升结果可回答"什么代码、什么配置、什么数据、什么种子"。
**现状证据**：全仓库无 run_id/SHA/config hash 持久化；BacktestResult 入库 params=None（tasks/backtest_tasks.py:39-53）。
**范围内**：(1) 新增 `core/research/run_manifest.py`：采集 git SHA（subprocess，失败则 "unknown+dirty" 标注）、配置字典的 SHA256、显式随机种子、数据范围（symbol/timeframe/首末 bar 时间/行数）；(2) `backtest_results` 加 nullable `run_manifest`(JSONB)；(3) trusted 批量接口与 promotion_gate 写入 manifest；(4) 提供 `python -m core.research.fingerprint <run_id>` 打印指纹。
**范围外**：完整 ResearchRun 表与重放命令（Phase 2 TASK-2.3）；DatasetSnapshot 哈希。
**测试先行**：同配置两次运行 manifest 指纹一致；改任一配置项指纹变化。
**验收命令**：
```
python -m pytest tests/unit/test_run_manifest.py -q
```
**回滚**：nullable 列 + 新模块，revert 即可。
**停止条件**：无。

---

### Phase 2–5 任务提示词（索引）

以下任务设计已在 §6 中定界，实施提示词按上述同一模板生成即可；为控制本文件长度，列出关键设计锚点：

- **TASK-2.1 宏观/新闻点时**：macro_data 加 `available_time`（发布日历规则回填，标注 estimated）；news_snapshots 改 append-only（去掉 ON CONFLICT DO UPDATE，news_snapshot_service.py:64-77）+ `fetched_at` 列 + published_at 回退时打 `time_source:"fetch"` 标；news_tools.py 查询加 as-of 参数。迁移 expand-only。
- **TASK-2.2 K 线修订与幸存者治理**：统一 upsert 策略为 DO UPDATE + 触发器写 `kline_revisions` 审计表（或轻量方案：revised_at 列）；`symbols.status` 由合约到期规则每日回填 expired；双检查点合一（JSON→DB 单向迁移后删 JSON 路径，full_downloader.py 与 collect_jobs.py）；股票退市限制写入报告模板披露（D7(a)）。
- **TASK-2.3 ResearchRun + 重放**：`research_runs` 表（id、parent、manifest、status、指标 JSONB）；`python -m research.replay <run_id>` 按 manifest 重跑并输出逐指标差异（容差表：return/sharpe 1e-6 相对，trades 精确相等）。
- **TASK-3.1 真校准**：`signal_observations` 按置信度分桶（每桶最小 30 成熟样本）产出可靠性曲线 + Brier score，API `/api/v1/signals/calibration`；alert_aggregator.py:1034-1046 裸 except 改为显式 `calibration_status: unavailable` 字段透传到信号 payload；分桶不足时信号标 `uncalibrated`。
- **TASK-3.2 结果评估修正**：outcomes.py MFE/MAE 窗口截至出场 bar（:30-35）；跳空穿越止损按当日开盘价成交（:39-49 邻域）；per-品种成熟窗口配置表。
- **TASK-4.1 Celery 整备**：把 core/tasks/celery_app.py 的 time_limit/soft_time_limit/max_tasks_per_child 移植到 tasks/celery_app.py；加 `task_acks_late + task_reject_on_worker_lost` 与任务级 max_retries/退避；`reports` 队列删除或接消费者；deploy.sh worker/beat 改 systemd 单元（模板文件进 scripts/systemd/）；main.py:62 sync 自启动移到 beat 任务（幂等：advisory lock）；然后删除 core/tasks/（Retire 已批准前提下）。
- **TASK-4.2 Agent 运行时鲁棒性**：executor 完成 step 后写 status=completed（修 worker.py:84 死代码）；lease 恢复 attempt+1，≥3 转 dead_letter 状态并告警；对账任务修 running_count/预算泄漏；beat 每日预算重置；AgentApproval 加 expires_at（默认 7 天）+ 消费时校验。
- **TASK-4.3 最小可观测性**：loguru bind(request_id/task_id/run_id) 中间件；monitoring/channels/feishu.py 移植为 `tasks/alert_delivery.py` 供 MonitorAlert 送达（webhook URL 走环境变量）；健康快照（备份年龄/队列积压/数据新鲜度/信号成熟积压）每 15 分钟写 `ops_health_snapshots` 表并接 /api/v1/health/diagnostics。
- **TASK-5.1 安全收尾**：密钥读取（/edit 端点）产生 AgentEvent 审计；config_store.py:334-335 解密失败改为报错不回退明文；news→LLM prompt 加定界（`<external-content>` 包裹 + system 指令声明外部文本非指令）；LLM 用量记账表 + 月度上限熔断；CI 加 gitleaks + pip-audit + npm audit（阻断级别：高危）+ dependabot 配置；CORS 收紧已在 TASK-0.6。

---

## 附：验证环境说明

本轮本机验证环境：macOS / Python 3.11.15（uv 安装）/ 临时 venv 安装 dev 依赖 / **无 PostgreSQL、无 Redis**。因此：单测结论中依赖 PG 的 17 errors + 若干 failed 属环境限制而非代码缺陷（CI 有 PG 服务容器理论上可过——但因 P0-2，CI 从未证明过这一点）；`1528 passed` 历史基线维持 REPO-CLAIMED。所有 P0/P1 发现均基于代码阅读 + 可在无 DB 环境复现的运行证据，不受此限制影响。
