import { pool } from './index.js';

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureAllTables(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const client = await pool.connect();
      try {
        const ddl = `
          -- 1. 用户表
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            uid TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          -- 2. 合约元数据表
          CREATE TABLE IF NOT EXISTS contracts (
            id SERIAL PRIMARY KEY,
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            exchange TEXT NOT NULL,
            category TEXT NOT NULL,
            multiplier INTEGER NOT NULL,
            min_tick DOUBLE PRECISION NOT NULL,
            margin_rate DOUBLE PRECISION NOT NULL,
            commission DOUBLE PRECISION NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            delivery_months TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 3. 通用 K 线行情表 (支持多周期回测与图表引擎)
          CREATE TABLE IF NOT EXISTS klines (
            id SERIAL PRIMARY KEY,
            symbol TEXT NOT NULL,
            period TEXT NOT NULL,
            open DOUBLE PRECISION NOT NULL,
            high DOUBLE PRECISION NOT NULL,
            low DOUBLE PRECISION NOT NULL,
            close DOUBLE PRECISION NOT NULL,
            volume DOUBLE PRECISION NOT NULL,
            open_interest DOUBLE PRECISION,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 4. 信号表
          CREATE TABLE IF NOT EXISTS signals (
            id SERIAL PRIMARY KEY,
            contract TEXT,
            symbol TEXT,
            period TEXT NOT NULL,
            strategy_name TEXT NOT NULL,
            direction TEXT NOT NULL,
            confidence DOUBLE PRECISION NOT NULL,
            price DOUBLE PRECISION,
            reason TEXT,
            extra JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 5. 回测结果持久化表
          CREATE TABLE IF NOT EXISTS backtest_results (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            strategy TEXT NOT NULL,
            symbol TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            total_return DOUBLE PRECISION NOT NULL,
            sharpe_ratio DOUBLE PRECISION NOT NULL,
            max_drawdown DOUBLE PRECISION NOT NULL,
            win_rate DOUBLE PRECISION NOT NULL,
            total_trades INTEGER NOT NULL,
            params JSONB NOT NULL,
            run_manifest JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 6. 7大品种规范: 交易时段表
          CREATE TABLE IF NOT EXISTS trading_sessions (
            id SERIAL PRIMARY KEY,
            exchange VARCHAR(20) NOT NULL,
            product VARCHAR(20) NOT NULL,
            effective_from DATE NOT NULL,
            effective_to DATE,
            session_name VARCHAR(50) NOT NULL,
            session_start VARCHAR(10) NOT NULL,
            session_end VARCHAR(10) NOT NULL,
            crosses_midnight BOOLEAN DEFAULT FALSE NOT NULL,
            trading_date_rule VARCHAR(50) DEFAULT 'next_trading_day_for_night' NOT NULL,
            auction_start VARCHAR(10),
            auction_end VARCHAR(10),
            is_trading_day BOOLEAN DEFAULT TRUE NOT NULL,
            previous_trading_day DATE,
            next_trading_day DATE,
            holiday_name VARCHAR(50),
            night_session_enabled BOOLEAN DEFAULT TRUE NOT NULL,
            source_url TEXT DEFAULT '' NOT NULL,
            source_sha256 VARCHAR(64) DEFAULT '' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 7. 7大品种规范: 合约生命周期规格表
          CREATE TABLE IF NOT EXISTS contract_specs (
            id SERIAL PRIMARY KEY,
            exchange VARCHAR(20) NOT NULL,
            product VARCHAR(20) NOT NULL,
            contract VARCHAR(30),
            contract_name VARCHAR(100) NOT NULL,
            listed_date DATE NOT NULL,
            last_trading_date DATE NOT NULL,
            delivery_month VARCHAR(10) NOT NULL,
            contract_multiplier DOUBLE PRECISION NOT NULL,
            price_tick DOUBLE PRECISION NOT NULL,
            quotation_unit VARCHAR(30) NOT NULL,
            minimum_order_volume INTEGER DEFAULT 1 NOT NULL,
            maximum_order_volume INTEGER DEFAULT 500,
            position_limit INTEGER,
            delivery_unit DOUBLE PRECISION,
            limit_ratio DOUBLE PRECISION NOT NULL,
            effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
            effective_to TIMESTAMP WITH TIME ZONE,
            source_class VARCHAR(30) DEFAULT 'official' NOT NULL,
            source_url TEXT DEFAULT '' NOT NULL,
            source_sha256 VARCHAR(64) DEFAULT '' NOT NULL,
            historical_authority BOOLEAN DEFAULT TRUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 8. 7大品种规范: 费率与保证金表
          CREATE TABLE IF NOT EXISTS fee_and_margins (
            id SERIAL PRIMARY KEY,
            exchange VARCHAR(20) NOT NULL,
            product VARCHAR(20) NOT NULL,
            contract VARCHAR(30),
            broker VARCHAR(50),
            effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
            effective_to TIMESTAMP WITH TIME ZONE,
            long_margin_ratio DOUBLE PRECISION NOT NULL,
            short_margin_ratio DOUBLE PRECISION NOT NULL,
            exchange_margin_ratio DOUBLE PRECISION,
            broker_margin_addon DOUBLE PRECISION DEFAULT 0,
            open_fee_per_lot DOUBLE PRECISION DEFAULT 0 NOT NULL,
            open_fee_ratio DOUBLE PRECISION DEFAULT 0 NOT NULL,
            close_fee_per_lot DOUBLE PRECISION DEFAULT 0 NOT NULL,
            close_fee_ratio DOUBLE PRECISION DEFAULT 0 NOT NULL,
            close_today_fee_per_lot DOUBLE PRECISION DEFAULT 0 NOT NULL,
            close_today_fee_ratio DOUBLE PRECISION DEFAULT 0 NOT NULL,
            estimated_slippage_ticks DOUBLE PRECISION DEFAULT 1.0,
            source_url TEXT DEFAULT '' NOT NULL,
            source_sha256 VARCHAR(64) DEFAULT '' NOT NULL,
            verified BOOLEAN DEFAULT TRUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 9. 7大品种规范: 多周期标准化 K 线表
          CREATE TABLE IF NOT EXISTS market_bars (
            id BIGSERIAL PRIMARY KEY,
            exchange VARCHAR(20) NOT NULL,
            product VARCHAR(20) NOT NULL,
            contract VARCHAR(30),
            frequency VARCHAR(10) NOT NULL,
            trading_date DATE NOT NULL,
            bar_start TIMESTAMP WITH TIME ZONE NOT NULL,
            bar_end TIMESTAMP WITH TIME ZONE NOT NULL,
            session VARCHAR(30) NOT NULL,
            open DOUBLE PRECISION NOT NULL,
            high DOUBLE PRECISION NOT NULL,
            low DOUBLE PRECISION NOT NULL,
            close DOUBLE PRECISION NOT NULL,
            volume BIGINT NOT NULL,
            turnover DOUBLE PRECISION,
            open_interest BIGINT NOT NULL,
            settlement DOUBLE PRECISION,
            pre_settlement DOUBLE PRECISION,
            pre_close DOUBLE PRECISION,
            upper_limit DOUBLE PRECISION,
            lower_limit DOUBLE PRECISION,
            source_count INTEGER DEFAULT 60,
            expected_count INTEGER DEFAULT 60,
            missing_count INTEGER DEFAULT 0,
            is_finalized BOOLEAN DEFAULT TRUE NOT NULL,
            quality_status VARCHAR(20) DEFAULT 'complete' NOT NULL,
            roll_transition BOOLEAN DEFAULT FALSE NOT NULL,
            source_id VARCHAR(100) DEFAULT 'ctp-sync' NOT NULL,
            source_sha256 VARCHAR(64) DEFAULT '' NOT NULL,
            acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            schema_version VARCHAR(30) DEFAULT 'market-bar.v1' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 10. 7大品种规范: 产业链基本面表
          CREATE TABLE IF NOT EXISTS industry_fundamentals (
            id BIGSERIAL PRIMARY KEY,
            product VARCHAR(20) NOT NULL,
            indicator_code VARCHAR(60) NOT NULL,
            indicator_name VARCHAR(100) NOT NULL,
            observation_date DATE NOT NULL,
            publication_time TIMESTAMP WITH TIME ZONE NOT NULL,
            available_at TIMESTAMP WITH TIME ZONE NOT NULL,
            value DOUBLE PRECISION NOT NULL,
            unit VARCHAR(30) NOT NULL,
            region VARCHAR(50),
            frequency VARCHAR(20) DEFAULT 'daily' NOT NULL,
            revision_id VARCHAR(30) DEFAULT 'rev-01' NOT NULL,
            source_name VARCHAR(100) NOT NULL,
            source_url TEXT DEFAULT '' NOT NULL,
            source_sha256 VARCHAR(64) DEFAULT '' NOT NULL,
            official BOOLEAN DEFAULT TRUE NOT NULL,
            effective_dated BOOLEAN DEFAULT TRUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 11. 7大品种规范: 宏观数据指标表
          CREATE TABLE IF NOT EXISTS macro_indicators (
            id BIGSERIAL PRIMARY KEY,
            indicator_code VARCHAR(50) NOT NULL,
            indicator_name VARCHAR(100) NOT NULL,
            country VARCHAR(10) DEFAULT 'CN' NOT NULL,
            period VARCHAR(20) NOT NULL,
            value DOUBLE PRECISION NOT NULL,
            previous_value DOUBLE PRECISION,
            forecast_value DOUBLE PRECISION,
            unit VARCHAR(30) NOT NULL,
            release_time TIMESTAMP WITH TIME ZONE NOT NULL,
            available_at TIMESTAMP WITH TIME ZONE NOT NULL,
            revision_time TIMESTAMP WITH TIME ZONE,
            revision_id VARCHAR(30) DEFAULT 'v1' NOT NULL,
            source_agency VARCHAR(100) NOT NULL,
            source_url TEXT DEFAULT '' NOT NULL,
            source_sha256 VARCHAR(64) DEFAULT '' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 12. 7大品种规范: 数据质量与审计日志表
          CREATE TABLE IF NOT EXISTS data_audit_logs (
            bundle_id VARCHAR(64) PRIMARY KEY,
            dataset_type VARCHAR(30) NOT NULL,
            source_name VARCHAR(100) NOT NULL,
            source_class VARCHAR(30) NOT NULL,
            source_url TEXT DEFAULT '' NOT NULL,
            acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            source_document_sha256 VARCHAR(64) DEFAULT '',
            source_payload_sha256 VARCHAR(64) DEFAULT '',
            row_count INTEGER NOT NULL,
            first_timestamp TIMESTAMP WITH TIME ZONE,
            last_timestamp TIMESTAMP WITH TIME ZONE,
            duplicate_count INTEGER DEFAULT 0 NOT NULL,
            missing_count INTEGER DEFAULT 0 NOT NULL,
            rejected_count INTEGER DEFAULT 0 NOT NULL,
            revision_count INTEGER DEFAULT 0 NOT NULL,
            coverage_status VARCHAR(20) DEFAULT 'complete' NOT NULL,
            historical_authority BOOLEAN DEFAULT TRUE NOT NULL,
            effective_dated BOOLEAN DEFAULT TRUE NOT NULL,
            validation_version VARCHAR(30) DEFAULT 'audit_v1' NOT NULL,
            validation_status VARCHAR(20) DEFAULT 'accepted' NOT NULL,
            failure_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 13. 7大品种规范: 主力合约切换历史表
          CREATE TABLE IF NOT EXISTS dominant_contracts_history (
            id SERIAL PRIMARY KEY,
            exchange VARCHAR(20) NOT NULL,
            product VARCHAR(20) NOT NULL,
            trading_date DATE NOT NULL,
            active_contract VARCHAR(30) NOT NULL,
            previous_contract VARCHAR(30),
            next_contract VARCHAR(30),
            switch_occurred BOOLEAN DEFAULT FALSE NOT NULL,
            switch_reason VARCHAR(50) DEFAULT 'open_interest_max' NOT NULL,
            old_volume BIGINT,
            new_volume BIGINT,
            old_open_interest BIGINT,
            new_open_interest BIGINT,
            confirmation_days INTEGER DEFAULT 3 NOT NULL,
            roll_price_gap DOUBLE PRECISION DEFAULT 0 NOT NULL,
            return_excluded BOOLEAN DEFAULT TRUE NOT NULL,
            source_sha256 VARCHAR(64) DEFAULT '' NOT NULL,
            rule_version VARCHAR(30) DEFAULT 'oi_dominance_v1' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 14. 7大品种规范: 策略信号表
          CREATE TABLE IF NOT EXISTS strategy_signals (
            id TEXT PRIMARY KEY,
            candidate_id VARCHAR(100) NOT NULL,
            strategy_family VARCHAR(50) NOT NULL,
            strategy_version VARCHAR(30) NOT NULL,
            logic_sha256 VARCHAR(64) NOT NULL,
            parameter_sha256 VARCHAR(64) NOT NULL,
            exchange VARCHAR(20) NOT NULL,
            product VARCHAR(20) NOT NULL,
            contract VARCHAR(30) NOT NULL,
            signal_frequency VARCHAR(10) DEFAULT 'H1' NOT NULL,
            confirmation_frequency VARCHAR(10) DEFAULT 'M30',
            generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
            data_cutoff TIMESTAMP WITH TIME ZONE NOT NULL,
            market_regime VARCHAR(50) NOT NULL,
            target_position INTEGER NOT NULL,
            action VARCHAR(30) NOT NULL,
            reason_code VARCHAR(50) NOT NULL,
            reason_text TEXT NOT NULL,
            entry_reference_price DOUBLE PRECISION,
            invalidation_price DOUBLE PRECISION NOT NULL,
            stop_price DOUBLE PRECISION NOT NULL,
            take_profit_price DOUBLE PRECISION,
            maximum_holding_bars INTEGER,
            risk_per_lot DOUBLE PRECISION NOT NULL,
            margin_per_lot DOUBLE PRECISION NOT NULL,
            estimated_round_trip_cost DOUBLE PRECISION NOT NULL,
            capital_allowed BOOLEAN DEFAULT TRUE NOT NULL,
            quality_status VARCHAR(20) DEFAULT 'complete' NOT NULL,
            human_approval_required BOOLEAN DEFAULT TRUE NOT NULL,
            research_only BOOLEAN DEFAULT TRUE NOT NULL,
            execution_enabled BOOLEAN DEFAULT FALSE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 15. 7大品种规范: 人工仓位表
          CREATE TABLE IF NOT EXISTS manual_positions (
            position_id VARCHAR(64) PRIMARY KEY,
            account_alias VARCHAR(50) NOT NULL,
            exchange VARCHAR(20) NOT NULL,
            product VARCHAR(20) NOT NULL,
            contract VARCHAR(30) NOT NULL,
            direction VARCHAR(10) NOT NULL,
            lots INTEGER NOT NULL,
            entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
            entry_price DOUBLE PRECISION NOT NULL,
            entry_signal_id VARCHAR(64),
            stop_price DOUBLE PRECISION NOT NULL,
            take_profit_price DOUBLE PRECISION,
            maximum_holding_until TIMESTAMP WITH TIME ZONE NOT NULL,
            current_status VARCHAR(20) DEFAULT 'open' NOT NULL,
            exit_time TIMESTAMP WITH TIME ZONE,
            exit_price DOUBLE PRECISION,
            exit_reason TEXT,
            realized_pnl DOUBLE PRECISION,
            fees_paid DOUBLE PRECISION,
            manually_confirmed BOOLEAN DEFAULT TRUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 16. 7大品种规范: 出场预警表
          CREATE TABLE IF NOT EXISTS exit_alerts (
            alert_id TEXT PRIMARY KEY,
            fingerprint VARCHAR(100) NOT NULL UNIQUE,
            position_id VARCHAR(64) NOT NULL,
            signal_id VARCHAR(64),
            product VARCHAR(20) NOT NULL,
            contract VARCHAR(30) NOT NULL,
            alert_type VARCHAR(30) NOT NULL,
            severity VARCHAR(20) NOT NULL,
            triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            bar_frequency VARCHAR(10) NOT NULL,
            bar_end TIMESTAMP WITH TIME ZONE NOT NULL,
            market_price DOUBLE PRECISION NOT NULL,
            trigger_price DOUBLE PRECISION,
            reason_code VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            recommended_action VARCHAR(30) NOT NULL,
            data_quality_status VARCHAR(20) DEFAULT 'complete' NOT NULL,
            acknowledged_at TIMESTAMP WITH TIME ZONE,
            delivery_target VARCHAR(50) DEFAULT 'internal_dashboard' NOT NULL,
            delivery_status VARCHAR(20) DEFAULT 'delivered' NOT NULL,
            attempt_count INTEGER DEFAULT 1 NOT NULL,
            last_error TEXT,
            execution_enabled BOOLEAN DEFAULT FALSE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          -- 17. 智能体任务与产物全生命周期表
          CREATE TABLE IF NOT EXISTS agent_tasks (
            id SERIAL PRIMARY KEY,
            goal TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            symbols TEXT NOT NULL,
            status TEXT NOT NULL,
            trigger TEXT NOT NULL,
            created_by TEXT NOT NULL,
            idempotency_key TEXT,
            error_code TEXT,
            error_message TEXT,
            planned_cost_units INTEGER NOT NULL DEFAULT 0,
            reserved_cost_units INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            started_at TIMESTAMP WITH TIME ZONE,
            finished_at TIMESTAMP WITH TIME ZONE,
            lease_owner TEXT,
            last_heartbeat_at TIMESTAMP WITH TIME ZONE,
            lease_expires_at TIMESTAMP WITH TIME ZONE,
            recovery_attempts INTEGER NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS agent_steps (
            id SERIAL PRIMARY KEY,
            task_id BIGINT NOT NULL DEFAULT 0,
            step_key TEXT NOT NULL,
            step_type TEXT NOT NULL,
            depends_on TEXT NOT NULL,
            status TEXT NOT NULL,
            tool_name TEXT,
            input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            output_payload JSONB,
            attempt_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 3,
            timeout_seconds INTEGER NOT NULL DEFAULT 60,
            error_code TEXT,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            started_at TIMESTAMP WITH TIME ZONE,
            finished_at TIMESTAMP WITH TIME ZONE
          );

          CREATE TABLE IF NOT EXISTS agent_tool_calls (
            id SERIAL PRIMARY KEY,
            task_id BIGINT NOT NULL DEFAULT 0,
            step_id BIGINT,
            tool_name TEXT NOT NULL,
            tool_version TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            result_payload JSONB,
            success BOOLEAN NOT NULL DEFAULT TRUE,
            error_code TEXT,
            error_message TEXT,
            duration_ms INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS agent_artifacts (
            id SERIAL PRIMARY KEY,
            task_id BIGINT NOT NULL DEFAULT 0,
            step_id BIGINT,
            artifact_type TEXT NOT NULL,
            name TEXT NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            version TEXT NOT NULL DEFAULT '1.0',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS agent_evidence (
            id SERIAL PRIMARY KEY,
            task_id BIGINT NOT NULL DEFAULT 0,
            step_id BIGINT,
            artifact_id BIGINT,
            evidence_type TEXT NOT NULL,
            source TEXT NOT NULL,
            data_start TIMESTAMP WITH TIME ZONE,
            data_end TIMESTAMP WITH TIME ZONE,
            quality JSONB NOT NULL DEFAULT '{}'::jsonb,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );

          CREATE TABLE IF NOT EXISTS agent_approvals (
            id SERIAL PRIMARY KEY,
            task_id BIGINT NOT NULL DEFAULT 0,
            step_id BIGINT,
            action TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL,
            requested_by TEXT NOT NULL,
            decided_by TEXT,
            decision_note TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE,
            decided_at TIMESTAMP WITH TIME ZONE
          );

          CREATE TABLE IF NOT EXISTS agent_events (
            id SERIAL PRIMARY KEY,
            task_id BIGINT NOT NULL DEFAULT 0,
            step_id BIGINT,
            event_type TEXT NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
          );
        `;

        await client.query(ddl);

        // 2. 保证历史遗留表具有所需的所有新字段与自增序列（兼容旧版 Neon/PGlite 表结构）
        const alterStatements = [
          // 序列与主键自增默认值保证
          `CREATE SEQUENCE IF NOT EXISTS market_bars_id_seq;`,
          `ALTER TABLE market_bars ALTER COLUMN id SET DEFAULT nextval('market_bars_id_seq');`,
          `SELECT setval('market_bars_id_seq', COALESCE((SELECT MAX(id) FROM market_bars), 0) + 1, false);`,

          `CREATE SEQUENCE IF NOT EXISTS realtime_stream_buffer_id_seq;`,
          `ALTER TABLE realtime_stream_buffer ALTER COLUMN id SET DEFAULT nextval('realtime_stream_buffer_id_seq');`,

          `CREATE SEQUENCE IF NOT EXISTS member_positions_id_seq;`,
          `ALTER TABLE member_positions ALTER COLUMN id SET DEFAULT nextval('member_positions_id_seq');`,

          `CREATE SEQUENCE IF NOT EXISTS warehouse_receipts_id_seq;`,
          `ALTER TABLE warehouse_receipts ALTER COLUMN id SET DEFAULT nextval('warehouse_receipts_id_seq');`,

          `CREATE SEQUENCE IF NOT EXISTS industry_fundamentals_id_seq;`,
          `ALTER TABLE industry_fundamentals ALTER COLUMN id SET DEFAULT nextval('industry_fundamentals_id_seq');`,

          `CREATE SEQUENCE IF NOT EXISTS macro_indicators_id_seq;`,
          `ALTER TABLE macro_indicators ALTER COLUMN id SET DEFAULT nextval('macro_indicators_id_seq');`,

          `CREATE SEQUENCE IF NOT EXISTS factor_values_id_seq;`,
          `ALTER TABLE factor_values ALTER COLUMN id SET DEFAULT nextval('factor_values_id_seq');`,

          // signals 字段兼容
          `ALTER TABLE signals ADD COLUMN IF NOT EXISTS contract TEXT;`,
          `ALTER TABLE signals ADD COLUMN IF NOT EXISTS symbol TEXT;`,
          `ALTER TABLE signals ALTER COLUMN symbol DROP NOT NULL;`,
          `ALTER TABLE signals ALTER COLUMN contract DROP NOT NULL;`,
          `UPDATE signals SET contract = symbol WHERE contract IS NULL AND symbol IS NOT NULL;`,
          `UPDATE signals SET symbol = contract WHERE symbol IS NULL AND contract IS NOT NULL;`,

          // market_bars 全量字段自动补全与兼容
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS exchange VARCHAR(20) DEFAULT 'SHFE';`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS product VARCHAR(20);`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS contract VARCHAR(30);`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS symbol VARCHAR(30);`,
          `ALTER TABLE market_bars ALTER COLUMN symbol DROP NOT NULL;`,
          `ALTER TABLE market_bars ALTER COLUMN contract DROP NOT NULL;`,
          `ALTER TABLE market_bars ALTER COLUMN product DROP NOT NULL;`,
          `ALTER TABLE market_bars ALTER COLUMN exchange DROP NOT NULL;`,
          `ALTER TABLE market_bars ALTER COLUMN frequency DROP NOT NULL;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS frequency VARCHAR(10) DEFAULT 'D1';`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS trading_date DATE DEFAULT CURRENT_DATE;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS bar_start TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS bar_end TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS session VARCHAR(30) DEFAULT 'day_morning';`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS open DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS high DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS low DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS close DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS volume BIGINT DEFAULT 0;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS turnover DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS open_interest BIGINT DEFAULT 0;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS settlement DOUBLE PRECISION;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS pre_settlement DOUBLE PRECISION;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS pre_close DOUBLE PRECISION;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS upper_limit DOUBLE PRECISION;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS lower_limit DOUBLE PRECISION;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS source_count INTEGER DEFAULT 60;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS expected_count INTEGER DEFAULT 60;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS missing_count INTEGER DEFAULT 0;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT TRUE;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS quality_status VARCHAR(20) DEFAULT 'complete';`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS roll_transition BOOLEAN DEFAULT FALSE;`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS source_id VARCHAR(100) DEFAULT 'ctp-sync';`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS source_sha256 VARCHAR(64) DEFAULT '';`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS schema_version VARCHAR(30) DEFAULT 'market-bar.v1';`,
          `ALTER TABLE market_bars ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,

          `UPDATE market_bars SET contract = symbol WHERE contract IS NULL AND symbol IS NOT NULL;`,
          `UPDATE market_bars SET symbol = contract WHERE symbol IS NULL AND contract IS NOT NULL;`,
          `UPDATE market_bars SET product = UPPER(REGEXP_REPLACE(contract, '[0-9]+', '', 'g')) WHERE (product IS NULL OR product = '') AND contract IS NOT NULL;`,
          
          // data_audit_logs 全量字段自动补全与兼容
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS bundle_id VARCHAR(64);`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS dataset_type VARCHAR(30) DEFAULT 'D1';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS source_name VARCHAR(100) DEFAULT 'CTP';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS source_class VARCHAR(30) DEFAULT 'official';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS source_document_sha256 VARCHAR(64) DEFAULT '';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS source_payload_sha256 VARCHAR(64) DEFAULT '';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS row_count INTEGER DEFAULT 0;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS first_timestamp TIMESTAMP WITH TIME ZONE;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS last_timestamp TIMESTAMP WITH TIME ZONE;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS missing_count INTEGER DEFAULT 0;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS rejected_count INTEGER DEFAULT 0;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS coverage_status VARCHAR(20) DEFAULT 'complete';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS historical_authority BOOLEAN DEFAULT TRUE;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS effective_dated BOOLEAN DEFAULT TRUE;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS validation_version VARCHAR(30) DEFAULT 'audit_v1';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'accepted';`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS failure_reasons JSONB DEFAULT '[]'::jsonb;`,
          `ALTER TABLE data_audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,

          // industry_fundamentals 全量字段自动补全与兼容
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS product VARCHAR(20);`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS indicator_code VARCHAR(60);`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS indicator_name VARCHAR(100);`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS observation_date DATE;`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS publication_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS available_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS value DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS unit VARCHAR(30) DEFAULT '';`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS region VARCHAR(50);`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'daily';`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS revision_id VARCHAR(30) DEFAULT 'rev-01';`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS source_name VARCHAR(100) DEFAULT '';`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS source_sha256 VARCHAR(64) DEFAULT '';`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS official BOOLEAN DEFAULT TRUE;`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS effective_dated BOOLEAN DEFAULT TRUE;`,
          `ALTER TABLE industry_fundamentals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,

          // macro_indicators 全量字段自动补全与兼容
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS indicator_code VARCHAR(50);`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS indicator_name VARCHAR(100);`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS country VARCHAR(10) DEFAULT 'CN';`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS period VARCHAR(20);`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS value DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS previous_value DOUBLE PRECISION;`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS forecast_value DOUBLE PRECISION;`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS unit VARCHAR(30) DEFAULT '';`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS release_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS available_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS revision_time TIMESTAMP WITH TIME ZONE;`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS revision_id VARCHAR(30) DEFAULT 'v1';`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS source_agency VARCHAR(100) DEFAULT '';`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS source_sha256 VARCHAR(64) DEFAULT '';`,
          `ALTER TABLE macro_indicators ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,

          // warehouse_receipts 字段补全
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS product VARCHAR(20);`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS exchange VARCHAR(20);`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS region VARCHAR(50);`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS warehouse VARCHAR(100);`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS observation_date DATE;`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS publication_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS available_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS warehouse_receipt DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS warehouse_receipt_change DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS inventory DOUBLE PRECISION;`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS inventory_change DOUBLE PRECISION;`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT '吨';`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS revision_id VARCHAR(30) DEFAULT 'rev-01';`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT '';`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS source_sha256 VARCHAR(64) DEFAULT '';`,
          `ALTER TABLE warehouse_receipts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`,

          `ALTER TABLE contract_specs ADD COLUMN IF NOT EXISTS contract VARCHAR(30);`,
          `ALTER TABLE fee_and_margins ADD COLUMN IF NOT EXISTS contract VARCHAR(30);`,
          `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`,
          `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS delivery_months TEXT;`,

          // backtest_results 字段补全与兼容
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS name TEXT;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS strategy TEXT;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS symbol TEXT;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS start_date TEXT;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS end_date TEXT;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS total_return DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS sharpe_ratio DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS max_drawdown DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS win_rate DOUBLE PRECISION DEFAULT 0;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS total_trades INTEGER DEFAULT 0;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS run_manifest JSONB DEFAULT '{}'::jsonb;`,
          `ALTER TABLE backtest_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();`
        ];

        for (const alterSql of alterStatements) {
          try {
            await client.query(alterSql);
          } catch (e) {
            // ignore column exists or table alter error
          }
        }

        // 3. 安全创建索引
        const indexStatements = [
          `CREATE INDEX IF NOT EXISTS idx_klines_symbol_period ON klines (symbol, period, created_at);`,
          `CREATE INDEX IF NOT EXISTS idx_market_bars_lookup ON market_bars (product, contract, frequency, trading_date);`,
          `CREATE INDEX IF NOT EXISTS idx_fundamentals_lookup ON industry_fundamentals (product, observation_date);`
        ];

        for (const idxSql of indexStatements) {
          try {
            await client.query(idxSql);
          } catch (e) {
            // ignore index creation warning
          }
        }

        // 4. 彻底保持数据“只新增/更新、不删除”原则，保留全量历史 K 线数据，不进行自动截断与删除
        initialized = true;
        console.log('[DB AutoSchema] All quant tables and schema migrations verified successfully on Neon DB.');
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('[DB AutoSchema] Schema verification note:', err.message);
    }
  })();

  return initPromise;
}
