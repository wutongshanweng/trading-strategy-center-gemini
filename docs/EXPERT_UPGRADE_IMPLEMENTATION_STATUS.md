# Expert Upgrade Implementation Status

Updated: 2026-08-14

This document tracks implementation progress against `docs/EXPERT_UPGRADE_REVIEW.md`.
The review remains the authoritative plan. This status report deliberately separates
verified implementation from proposed follow-up work.

## Completed And Verified

### Phase 0: Integrity And Stop The Bleeding

- Restored the tracked `core/data` package and corrected the unanchored `data/` ignore rule.
- Added data cache and quality helpers with unit coverage.
- Made CI pytest steps fail correctly and switched frontend installation to `npm ci`.
- Added PostgreSQL backup, restore-drill scripts, retention rules, and an operations runbook.
- Made production authentication fail closed when required secrets are absent.
- Restricted local Compose bindings to loopback and required production secrets in production Compose.
- Removed synthetic daily OHLCV from the real backtest task path.
- Made optional ML imports non-blocking for the base image.
- Fixed Celery Agent async engine disposal so asyncpg connections do not cross event loops.
- Normalized the alert aggregator PostgreSQL OHLCV boundary to `float64`.
- Normalized every `PostgresStore.query()` DataFrame cell containing `Decimal` to `float`, preserving non-Decimal columns; added a shared-boundary regression test.
- Disabled scheduled fallback from an empty contracts table to embedded, unverified instrument parameters; legacy knowledge seeding now requires explicit opt-in.
- Removed the derived `maintenance_margin_rate = initial_margin_rate * 0.8` behavior; executable specifications must provide an explicit maintenance margin or preserve the supplied margin.

### Phase 1: Trusted Execution Slice

- Agent strategy backtests use `backtest.trusted_backtest`.
- Tournament, promotion-gate objectives, experiment evolution, `/run`, `/quick`, and `/batch` use trusted execution.
- Trusted results expose next-open execution, commission, stress-cost scenarios, trade count, drawdown, win rate, and profit factor.
- Walk-forward expanding windows advance correctly and overfit ratio semantics are corrected.
- Futures latest-sync uses the canonical public collector boundary.
- Integration fixtures now comply with the PostgreSQL non-null OHLCV contract.
- Trusted backtests and promotion verdicts now include deterministic run manifests with git revision, configuration hash, seed, data range, and a SHA-256 fingerprint.
- Added nullable `backtest_results.run_manifest` storage through Alembic migration `add_backtest_run_manifest`.
- Added `python -m core.research.fingerprint MANIFEST_JSON` for manifest fingerprint inspection.

### Phase 2: Point-In-Time Lineage Slice

- News snapshots are append-only by `(content_hash, fetched_at)` instead of updating historical rows.
- News records include `fetched_at` and `time_source`; missing publication timestamps are explicitly marked `time_source=fetch`.
- Agent news queries accept an ISO-8601 `as_of` boundary and only read snapshots fetched by that time.
- Macro observations include nullable `available_time` and `available_time_estimated` fields.
- Macro collection currently records collection time as the estimated availability boundary.
- Added a dry-run-by-default authoritative macro release calendar importer that replaces matching estimates with official availability timestamps and stores source URL, retrieval time, and document SHA-256 provenance.
- Agent macro queries accept `as_of` and exclude observations not yet available at that time.
- K-line revision audit storage and a transactional old/new-row trigger are installed at Alembic head `add_kline_revision_audit`.
- Added `research_runs` persistence with parent replay links, immutable manifests/metrics, and `python -m core.research.replay RUN_ID` metric comparison.
- Added strict provenance-aware instrument specification import; validation is dry-run by default and versioned writes require `--apply`.
- Agent and compatibility Celery walk-forward/backtest paths now use trusted next-open execution; legacy vectorized walk-forward is marked comparison-only.
- Added reliability bins, Brier score, and explicit calibrated/uncalibrated/unavailable signal status through `/api/v1/alerts/calibration`.
- Added Bonferroni-adjusted one-sided OOS significance checks to batch promotion decisions.
- Main-contract refresh now records historical switches atomically; point-in-time schedule queries expose switch gaps for roll-cost governance.
- Production mutation requests require administrator authentication outside the self-authenticated Agent namespaces.
- Frozen the legacy Hermes/cron loop system by default and removed its runtime logs/state/trading journal from version control.
- Added CI secret scanning, Python/npm dependency audits, and Dependabot update configuration.
- Factor normalization and Alpha101 single-series ranking are now point-in-time; IC is emitted as a rolling series rather than one full-sample scalar.
- Signal MFE/MAE stops at the actual exit bar, and gap-through stops fill conservatively at the opening price.
- Celery now rejects work on worker loss, enforces hard/soft limits, recycles worker children, and no longer declares an unconsumed reports queue.
- Agent leases are dead-lettered after three recoveries, approvals expire after seven days, and scheduled reconciliation repairs leaked running counts and resets daily budgets.
- API startup no longer autostarts realtime synchronization; periodic work remains under Celery Beat ownership.
- HTTP responses carry `X-Request-ID`, with the same identifier bound to request logs.
- LLM key decryption fails closed for tampered or plaintext values, and external task context is wrapped as untrusted content rather than instructions.
- Signal maturity windows accept explicit per-symbol/per-product governance through `SIGNAL_MATURITY_WINDOWS`, without inventing product defaults.
- LLM token usage is persisted by month and `LLM_MONTHLY_TOKEN_LIMIT` opens a fail-closed circuit breaker when configured.
- Added the broker integration contract and fail-closed disabled adapter in `docs/BROKER_INTEGRATION.md`; no real broker API or credentials are required.
- Removed the duplicate `core/tasks` Celery app; `tasks.celery_app` is the sole task source and bare-metal deployment uses supervised systemd API/worker/beat units.
- Unified all collection entrypoints on PostgreSQL checkpoints, removed JSON checkpoint read/write paths, and made overwrite operations key-scoped instead of rewriting the full checkpoint table.
- Persisted Agent step completion/failure state for real checkpoint resume, including no-tool internal steps.
- Moved realtime synchronization ownership to a Beat one-shot task protected by a PostgreSQL advisory lock; API workers do not run a local scheduler loop.
- Added durable `ops_health_snapshots`, monitor-alert delivery state/retries, database-backed LLM usage events, and fail-closed secret-read auditing.
- Added expired-contract lifecycle updates and explicit survivorship/lifecycle disclosures to research metrics.
- Automated iteration no longer consumes legacy parameter-optimizer outputs before promotion.
- Added a manual, 60-minute-capped Heavy ML Validation workflow that installs `.[ml,dev]`, imports HMM/Arch/TensorFlow/Torch, and runs the ML unit plus intelligence integration suites.

## Verification Evidence

- Backend unit and integration suite with PostgreSQL and base `.[dev]` dependencies: `1600 passed, 10 skipped, 44 warnings`; optional HMM tests account for six additional skips because the heavy `ml` extra is intentionally not installed in this job.
- Focused checkpoint migration, Agent release-readiness, operations, and sync-ownership tests: `11 passed`; the Heavy ML workflow YAML also parsed successfully.
- Frontend TypeScript check: passed.
- Frontend route check: `25 routes` and `24 menu entries` passed.
- Frontend ESLint and production build: passed; browser login-page acceptance rendered successfully with zero console warnings/errors.
- Heavy ML workflow definition is regression-tested and intentionally manual to avoid charging large runners on every commit.
- Agent migration/repository integration passed at Alembic head `add_collection_checkpoints`.
- API health: `http://127.0.0.1:8000/api/v1/health` returned `status: ok`.
- Nginx health: `http://127.0.0.1/health` returned `status: ok`.
- Post-redeploy Celery observation confirmed the worker and Beat are online and all new scheduled tasks are registered; missing authoritative instrument specifications are rejected fail-closed instead of using embedded values.
- Runtime instrument-sync acceptance: returned `0`, left `instrument_specifications` at `0` rows, and emitted no Celery error when authoritative source rows were absent.
- ResearchRun PostgreSQL acceptance: insert/read metrics and parent link succeeded, and the validation row was deleted.
- Instrument import dry-run acceptance: one authoritative-format record validated and the table count remained unchanged.
- Final Python compile, Ruff E9/F63/F7, and Alembic single-head checks passed.
- Python editable installation, sdist/wheel build, and Twine artifact checks pass with explicit flat-layout package discovery.
- Python 3.12 dependency installation uses maintained `empyrical-reloaded`; the existing risk-metrics compatibility suite passes.
- GitHub Actions delivery run `31700390506` passed all required jobs for final delivery commit `472a33d`: Python 3.10/3.11/3.12, frontend, security, Python packaging, and Docker build.
- Private GitHub `main` was pushed successfully and independently verified by a fresh blobless depth-1 clone at the same SHA, with required upgrade files present and no `.env`.
- Final rebuilt Docker stack has healthy PostgreSQL, Redis, API, Nginx, Celery worker, and Celery beat services; a fresh temporary database migrated to `add_collection_checkpoints` with all three governance tables present and was deleted after acceptance.
- Expert reliability and governance implementation commit after safe remote rebase: `43c8565`; verified delivery baseline: `472a33d`.

## External Preconditions

- Import indicator-specific official release calendars and verify target-row coverage; the importer is complete, but no source data is bundled or inferred.
- Populate instrument specifications from an authoritative fee/margin source; the current local database has zero main-contract rows and zero active instrument specifications, so no values were invented.
- Backfill historical main-contract switches from an authoritative archive; new switches are recorded, but past history cannot be reconstructed from an empty local database.
- Legacy parameter-optimization internals remain comparison-only; automatic reflection, iteration, and promotion do not consume their outputs.
- Replace the current Bonferroni normal approximation with PBO/DSR only after enough independent candidate history exists.
- Feishu delivery is implemented and reports `not_configured` until `FEISHU_WEBHOOK_URL` is supplied; no code work is blocked by the absent destination.
- The generic broker contract and safety policy are implemented; a real authenticated broker adapter remains intentionally disabled until broker credentials/API are supplied, as requested.

## Operational Notes

- The current Docker stack is rebuilt and running with PostgreSQL, Redis, API, Nginx, Celery worker, and Celery beat.
- The private GitHub token was not printed, changed, or removed.
- `docs/EXPERT_UPGRADE_REVIEW.md` was not modified; this file is the implementation status companion.
- The remaining legacy modules must not be used to publish promotion or tournament decisions until migrated or explicitly marked as comparison-only.
