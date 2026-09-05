# Agent 3.0 PostgreSQL 鍙戝竷 Runbook

## 鐩殑涓庤竟鐣?

鏈?Runbook 鐢ㄤ簬鎶婂凡鏈夌殑 PostgreSQL warehouse 鏁版嵁搴撳榻愬埌 Agent 3.0 鐨?Alembic 杩佺Щ澶淬€傚畠**涓嶉噸缃暟鎹簱銆佷笉閲嶅懡鍚?`kline`銆佷笉鍒犻櫎鏃ф暟鎹€佷笉鍚敤 Agent feature gate**銆傛墍鏈夋湁鍓綔鐢ㄧ殑 Agent 宸ュ叿鍜屽疄鐩?Champion/璧勯噾鍔ㄤ綔浠嶉渶浜哄伐瀹℃壒銆?

鐢熶骇鏁版嵁搴撶殑鏉冨▉琛屾儏琛ㄦ槸 `kline`锛沗klines` 鏄巻鍙?ORM/鏂板畨瑁呰縼绉婚仐鐣欒〃鍚嶃€俠aseline 闃舵涓嶅鍒跺ぇ琛紝涔熶笉鑷姩 rename銆傜敓浜ф墽琛屽墠蹇呴』纭鎵€鏈変笟鍔¤矾鐢变娇鐢?`kline` 鍏煎鏌ヨ銆?

## 鍓嶇疆鏉′欢

- PostgreSQL 澶囦唤宸叉垚鍔熷畬鎴愬苟鍙仮澶嶉獙璇併€?
- 宸插湪鍚岀増鏈?PostgreSQL 鐨?template clone 涓婂畬鎴愭紨缁冦€?
- 涓氬姟璐熻矗浜烘壒鍑嗙淮鎶ょ獥鍙ｏ紱鍋滄鍐欏叆浠诲姟鍜?Celery worker銆?
- 璁剧疆姝ｇ‘鐨?`DB_URL_OVERRIDE`锛屽苟浣跨敤 `--expected-database` 鍋氱洰鏍囩‘璁ゃ€?
- `AGENT_V3_ENABLED` 淇濇寔榛樿 `false`锛岃縼绉诲畬鎴愬悗鍐嶇敱浜哄伐瀹℃壒寮€鍚€?

## Clone 婕旂粌

```powershell
$env:PGPASSWORD='postgres'
psql -h localhost -p 5433 -U postgres -d postgres -c "DROP DATABASE IF EXISTS tsc_phase8_legacy_clone"
psql -h localhost -p 5433 -U postgres -d postgres -c "CREATE DATABASE tsc_phase8_legacy_clone TEMPLATE trading_strategy_center"
$env:DB_URL_OVERRIDE='postgresql+asyncpg://postgres:postgres@localhost:5433/tsc_phase8_legacy_clone'
python scripts/align_legacy_alembic_baseline.py --apply --expected-database tsc_phase8_legacy_clone
python scripts/verify_agent_release.py
```

棰勬湡缁撴灉锛歚ready: true`锛孉lembic head 涓哄綋鍓嶅彂甯?head `add_instrument_commission_model`锛堝寘鍚彲淇′氦鏄撴墽琛屻€佺焊闈氦鏄撱€佽瘉鎹拰鎴愭湰鍚庝俊鍙疯縼绉伙級銆?
## 鐢熶骇澶囦唤

浣跨敤涓庢湇鍔″櫒 PostgreSQL 涓荤増鏈竴鑷寸殑 `pg_dump`锛涗笉瑕佷娇鐢ㄤ綆浜庢湇鍔″櫒涓荤増鏈殑瀹㈡埛绔€傜ず渚嬶細

```powershell
$env:PGPASSWORD='<password>'
& '<matching-pg_dump.exe>' -h <host> -p <port> -U <user> -Fc -f 'trading_strategy_center_pre_agent3.dump' trading_strategy_center
```

鎭㈠楠岃瘉蹇呴』鍦ㄩ殧绂绘暟鎹簱鎵ц锛?

```powershell
createdb ... trading_strategy_center_restore_check
pg_restore ... -d trading_strategy_center_restore_check trading_strategy_center_pre_agent3.dump
```

## 鐢熶骇鎵ц

```powershell
$env:DB_URL_OVERRIDE='postgresql+asyncpg://<user>:<password>@<host>:<port>/trading_strategy_center'
python scripts/align_legacy_alembic_baseline.py --apply --expected-database trading_strategy_center
python scripts/verify_agent_release.py
alembic current
```

鑴氭湰鍏堢敤 `checkfirst=True` 鍒涘缓缂哄け鐨勯潪鐮村潖鎬?ORM 鏍稿績琛紝鍐?stamp `reconcile_legacy_core_tables`锛屾渶鍚庢墽琛?Agent migrations銆傝剼鏈粯璁?dry-run锛涚己灏戠洰鏍囨暟鎹簱纭鏃朵細鎷掔粷 `--apply`銆?

## 楠岃瘉娓呭崟

```sql
SELECT version_num FROM alembic_version;
SELECT to_regclass('public.agent_runtime_controls');
SELECT to_regclass('public.agent_tasks');
SELECT to_regclass('public.agent_approvals');
SELECT to_regclass('public.kline');
```

姝ゅ鎵ц锛?

- `python scripts/verify_agent_release.py`
- Agent focused tests 鍜屽畬鏁?Python/鍓嶇 CI 闂ㄧ
- 涓€鏉″彧璇荤爺绌?淇″彿铻嶅悎閾捐矾
- 涓€鏉￠渶瑕佸鎵圭殑绛栫暐/Champion 閾捐矾锛岀‘璁ゆ湭瀹℃壒涓嶄細浜х敓鍓綔鐢?

## 澶辫触涓庢仮澶?

- 浠讳竴姝ュけ璐ワ細鍋滄 worker锛屼繚鐣欐棩蹇楀拰 `alembic current` 杈撳嚭锛屼笉缁х画閲嶈瘯鍐欐搷浣溿€?
- 杩佺Щ澶辫触涓斾簨鍔℃湭鎻愪氦锛氭鏌?PostgreSQL 鏃ュ織鍚庨噸璺?clone 婕旂粌銆?
- 杩佺Щ宸叉彁浜や絾搴旂敤寮傚父锛氫粠澶囦唤鎭㈠鍒伴殧绂诲簱锛岀‘璁ゆ仮澶嶆祦绋嬪悗鍐嶅喅瀹氱敓浜у洖婊氾紱涓嶈鎵ц鐩茬洰 `alembic downgrade`锛屽洜涓?legacy baseline 鐨?downgrade 鏄?no-op銆?
- 鏈粡浜哄伐纭涓嶅緱鍚敤 `AGENT_V3_ENABLED`銆?
