# 交易策略中心 — 启动运行文档

> 适用环境: 本地开发 (Windows / macOS / Linux)

---

## 1. 系统概览

| 服务 | 端口 | 说明 |
|------|------|------|
| **FastAPI 后端** | `8000` | REST API + WebSocket 推送 |
| **React 前端** | `3000` | Vite 开发服务器, 自动代理 `/api` → `8000` |
| **PostgreSQL** | `5432` | 主数据库 |
| **Redis** | `6379` | 缓存 + Celery 任务队列 (可选) |

---

## 2. 首次启动（完整步骤）

### 2.1 环境准备

```bash
# 1. 确认 Python 版本 >= 3.10
python --version

# 2. 确认 Node 版本 >= 18
node --version

# 3. 确认 PostgreSQL 已运行 (端口 5432)
# Windows: 服务管理器查看 postgresql 服务
# Linux: sudo systemctl status postgresql
# macOS: brew services list | grep postgresql
```

### 2.2 数据库初始化

```bash
# 创建数据库 (首次)
createdb -U postgres trading_strategy_center

# 或通过 psql
psql -U postgres -c "CREATE DATABASE trading_strategy_center;"
```

表结构由应用启动时自动创建（各路由模块的 `_init_db()`）。

### 2.3 安装后端依赖

```bash
cd trading-strategy-center

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 安装核心依赖
pip install --upgrade pip
pip install .

# 安装 ML 依赖（可选, 约 2-5GB 磁盘）
pip install ".[ml]"

# 安装开发工具（可选）
pip install ".[dev]"
```

### 2.4 配置环境变量

```bash
# 从模板创建 .env
copy .env.example .env    # Windows
cp .env.example .env      # Linux/macOS

# 编辑 .env, 至少修改:
#   ENV=development
#   DEBUG=True
#   DB_USER=<你的数据库用户名>
#   DB_PASS=<你的数据库密码>
```

### 2.5 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

---

## 3. 每日启动（最小命令）

每次启动只需要开 **两个终端**:

### 终端 1 — 后端 (FastAPI)

```bash
cd trading-strategy-center

# 激活虚拟环境
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/macOS

# 启动后端
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

启动成功标志:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Trading Strategy Center starting...
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 终端 2 — 前端 (Vite)

```bash
cd trading-strategy-center\frontend

npm run dev
```

启动成功标志:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### 打开浏览器

访问 `http://localhost:3000`，开始使用。

---

## 4. 服务端口清单

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Browser    │ ────→ │  Vite :3000  │ ────→ │ FastAPI :8000│
│              │       │  (前端)       │ /api  │  (后端)       │
└──────────────┘       └──────────────┘       └──────┬───────┘
                                                     │
                                        ┌────────────┼──────────┐
                                        │            │           │
                                   ┌────┴────┐  ┌───┴───┐  ┌───┴───┐
                                   │PostgreSQL│  │ Redis │  │AkShare│
                                   │  :5432   │  │ :6379 │  │(外网) │
                                   └─────────┘  └───────┘  └───────┘
```

Vite 开发服务器自动代理 `/api` 到 `http://localhost:8000`（配置在 [vite.config.ts](frontend/vite.config.ts)）。

---

## 5. 健康检查

```bash
# 后端健康检查
curl http://localhost:8000/health
# → {"status":"ok","timestamp":"...","version":"0.1.0"}

# 前端
curl http://localhost:3000
# → 返回 HTML 页面
```

---

## 6. 数据采集

启动后系统默认**没有历史 K 线数据**，需要通过数据中心页面采集。

### 方式 1：前端采集面板（推荐）

1. 访问 `http://localhost:3000/data` （数据中心）
2. 在统一采集面板选择资产类型（期货/股票/期权）、年份
3. 点击开始采集
4. 查看进度条，等待完成

### 方式 2：API 触发

```bash
# 采集期货 2025 全年数据
curl -X POST http://localhost:8000/api/v1/warehouse/collect \
  -H "Content-Type: application/json" \
  -d '{"asset_type":"futures","years":[2025]}'

# 查询采集进度
curl http://localhost:8000/api/v1/warehouse/collect/status

# 采集宏观指标
curl -X POST http://localhost:8000/api/v1/warehouse/macro \
  -H "Content-Type: application/json" \
  -d '{"indicator":"all"}'
```

### 方式 3：Python 脚本

```bash
python -c "from data_center.collectors.macro_collector import MacroCollector; MacroCollector().collect_all()"
```

---

## 7. 后端启动自动执行的任务

后端 `main.py` 启动时会自动执行:

| 任务 | 触发时机 | 说明 |
|------|---------|------|
| 新闻缓存刷新 | 启动后 30s, 之后每 5min | 抓取多源新闻 |
| 信号扫描 | 启动后 30s, 之后每 5min | 多策略信号计算 |
| 实时同步恢复 | 启动时检查 | 如果上次为运行态则自动恢复 |
| VStock 热门扫描 | 启动后 30s | 自动分析 5 只热门股票 |
| 数据表自检 | 各模块懒加载 | 自动 CREATE TABLE IF NOT EXISTS |
| 早报自动生成 | 每天 8:00 AM | 生成当日交易简报 |

无需手动干预，所有后台任务随主进程启动。

---

## 8. 常见启动问题

### 8.1 PostgreSQL 连接失败

```
sqlalchemy.exc.OperationalError: could not connect to server
```

**解决**: 确认 PostgreSQL 服务已启动，`.env` 中 `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASS` 正确。

### 8.2 前端页面对接返回 404

检查 Vite 代理是否正确。确认 `vite.config.ts` 中:

```ts
server: {
  port: 3000,
  proxy: {
    "/api": {
      target: "http://localhost:8000",
      changeOrigin: true,
    },
  },
},
```

### 8.3 页面数据为空

大部分页面需要仓库中有 K 线数据。参考第 6 节「数据采集」先采集数据。

### 8.4 DeepSeek API key 未配置

一些 LLM 功能需要 DeepSeek API Key。在 `.env` 中配置:

```bash
DEEPSEEK_API_KEY=sk-your-key
```

不配置不影响其他功能，LLM 相关功能返回本地规则建议。

### 8.5 akshare 数据源报错

akshare 在线 API 不稳定时可能超时或返回空数据。免费数据源（akshare/baostock/通达信）无需 API Key，但受网络和接口变化影响。部分页面（如 VStock LHB、ChinaFinance）展示的是演示/合成数据。

### 8.6 Windows 端口被占用

```powershell
# 查看 8000 端口占用
netstat -ano | findstr :8000

# 查看 3000 端口占用
netstat -ano | findstr :3000

# 强制结束进程 (替换 PID)
taskkill /PID <PID> /F
```

### 8.7 Redis 未启动（可选）

当前系统不强制依赖 Redis（同步执行为主），Redis 连接失败会在日志中警告但不影响核心功能。如需 Celery 异步任务，则需启动 Redis。

---

## 9. 页面路由一览

| 路由 | 页面 | 依赖数据 |
|------|------|---------|
| `/` | Dashboard | 策略/指数/锦标赛 |
| `/macro-news` | 宏观新闻 | 新闻缓存/宏观指标 |
| `/trading` | 模拟交易 | 持仓/关注列表 |
| `/backtest` | 策略回测 | 策略列表/K线数据 |
| `/portfolio` | 模拟持仓 | 持仓数据 |
| `/data` | 数据中心 | 采集状态/仓库 |
| `/factors` | 因子研究 | K线数据/因子 |
| `/phase3` | 机器学习 | K线数据/ML特征 |
| `/strategy-library` | 策略工坊 | 策略注册表 |
| `/tournament` | 策略赛马 | 回测/排行榜 |
| `/feedback` | 反馈闭环 | 锦标赛历史 |
| `/llm-config` | LLM配置 | LLM API |
| `/iteration` | 智能中心 | 迭代/重训/ML模型 |
| `/research-center` | 研究中枢 | 多源聚合 |
| `/vstock` | 游资分析 | 龙虎榜/评审团 |
| `/china-finance` | 金融框架 | 投行/PE/财富技能 |
| `/settings` | 系统设置 | 无 (纯前端) |
| `/monitoring` | 系统监控 | 监控指标 |
| `/signal/:id` | 信号详情 | 告警/基本面 |

---

## 10. 一键启动脚本

### Windows (PowerShell)

```powershell
# start.ps1
$root = "D:\完整项目\trading-strategy-center"

# 启动后端
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $root; .\venv\Scripts\activate; uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

# 等待后端就绪
Start-Sleep 3

# 启动前端
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $root\frontend; npm run dev"

Write-Host "后端: http://localhost:8000"
Write-Host "前端: http://localhost:3000"
```

### Linux/macOS

```bash
#!/bin/bash
# start.sh
ROOT="/opt/trading-strategy-center"

# 启动后端
cd "$ROOT"
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 启动前端
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo "后端 PID: $BACKEND_PID (http://localhost:8000)"
echo "前端 PID: $FRONTEND_PID (http://localhost:3000)"
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
```

### 停止服务

```bash
# 终止所有 uvicorn/vite 进程
# Windows:
taskkill /F /IM node.exe     # 前端
taskkill /F /IM python.exe   # 后端 (谨慎, 会关掉所有 Python)

# Linux/macOS:
pkill -f uvicorn
pkill -f "vite"

# 或直接关掉两个终端窗口
```
