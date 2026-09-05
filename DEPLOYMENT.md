# 交易策略中心 — 生产环境部署文档

> 目标环境: Ubuntu 22.04 VPS  
> Python 3.10+ | PostgreSQL 15+ | Redis 7+ | Node 18+
> 当前版本: 0.2.0 | 策略数: 62 | 因子组合方法: 9

---

## 0. 最新变更 (2026-07-07)

### 新增策略 (+6, 合计 62)
- **谐波形态** (harmonic_patterns): XABCD 5点形态 (Gartley/Bat/Butterfly/Crab)
- **K线形态** (candlestick_patterns): 15种K线形态识别
- **波动率市态** (volatility_regime): 历史波动率百分位市态判断
- **配对交易** (pair_trading_zscore): 跨品种价差Z-Score套利
- **HHT择时** (hht_timing): EMD/VMD分解 + Hilbert瞬时相位
- **QRS择时** (qrs_timing): 高低价波动率比率择时

### 因子组合增强
- 新增方法: `max_ic_ir` (Ledoit-Wolf压缩协方差最大化IC_IR), `pca` (PCA第一主成分), `half_life` (半衰期加权)
- 前端因子研究页支持5种方法选择器

### 锦标赛评分升级
- 从单因子评分升级为7因子加权系统 (总收益22%+年化12%+夏普18%+盈亏比14%+胜率9%+回撤15%+稳定性10%)
- 新增A-E五级字母等级评分

### 中国市场指数 (+4, 合计6中国卡片)
- 新增: 深证成指(399001.SZ), 创业板指(399006.SZ), 科创50(000688.SS), 中证500(000905.SS)

### 前端页面
- MacroNews: 快讯+快读简报移至新闻流tab, 仪表盘5分钟全量刷新, 联动分析并入左栏
- FactorResearch: 因子组合方法选择器 (等权/IC/最大IC_IR/半衰期/PCA)

### 新增可选依赖
```bash
pip install ".[signal]"    # HHT/VMD 信号处理 (PyEMD + vmdpy)
```

---

## 1. 环境依赖

| 组件 | 版本要求 | 用途 |
|------|---------|------|
| Python | >= 3.10 | 后端核心 |
| PostgreSQL | >= 15 | 主数据库 (K线/新闻/信号/报告) |
| Redis | >= 7 | Celery 任务队列 + 缓存 |
| Node.js | >= 18 | 前端构建 |
| Nginx | 任意 | 反向代理 + 静态文件服务 |

---

## 2. 数据库安装

### 2.1 PostgreSQL

```bash
sudo apt update
sudo apt install -y postgresql postgresql-client
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 创建用户和数据库
sudo -u postgres psql <<SQL
CREATE USER trading WITH PASSWORD 'your-strong-password';
CREATE DATABASE trading_strategy_center OWNER trading;
GRANT ALL PRIVILEGES ON DATABASE trading_strategy_center TO trading;
SQL

# 初始化表结构
psql -U trading -d trading_strategy_center -f data_center/db/init_schema.sql
```

### 2.2 Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## 3. 应用部署

### 3.1 方式一：Docker（推荐）

```bash
# 1. 克隆项目
git clone <repo-url> /opt/trading-strategy-center
cd /opt/trading-strategy-center

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，修改:
#   ENV=production
#   DEBUG=False
#   SECRET_KEY=<随机生成>
#   DB_HOST=<PostgreSQL IP>
#   DB_USER=trading
#   DB_PASS=<db-password>
#   REDIS_HOST=<Redis IP>
#   FRONTEND_URL=https://your-domain.com

# 3. 构建镜像
docker build -t trading-center:latest .

# 4. 运行
docker run -d \
  --name trading-center \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file .env \
  -v /opt/trading-center-data:/app/data \
  trading-center:latest

# 5. 验证
curl http://localhost:8000/health
```

### 3.2 方式二：裸机部署

```bash
# 1. 创建虚拟环境
cd /opt/trading-strategy-center
python3 -m venv venv
source venv/bin/activate

# 2. 安装依赖
pip install --upgrade pip
pip install .                # 核心依赖
pip install ".[ml]"          # ML 依赖 (可选)
pip install ".[signal]"      # 信号处理 (可选, HHT/VMD)

# 3. 配置
cp .env.example .env
# 编辑 .env 填入实际配置
```

---

## 4. 生产环境 .env 关键配置

```bash
# 运行环境
ENV=production
DEBUG=False

# 安全 — 务必修改
SECRET_KEY=<openssl rand -hex 32>

# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USER=trading
DB_PASS=<strong-password>
DB_NAME=trading_strategy_center

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 服务器
HOST=0.0.0.0
PORT=8000
WORKERS=4                   # 建议 = CPU 核数

# CORS
CORS_ORIGINS=https://your-domain.com

# LLM (可选)
DEEPSEEK_API_KEY=sk-xxx
DEFAULT_LLM_PROVIDER=deepseek

# 日志
LOG_LEVEL=WARNING
LOG_FILE=/var/log/trading-center/app.log
```

---

## 5. Nginx 反向代理

```nginx
# /etc/nginx/sites-available/trading-center

server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    root /opt/trading-strategy-center/frontend/dist;
    index index.html;

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;    # 回测/ML 任务耗时较长
    }

    # WebSocket (行情推送)
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # 前端 SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/trading-center /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. Systemd 服务（裸机部署）

创建 `/etc/systemd/system/trading-center.service`:

```ini
[Unit]
Description=Trading Strategy Center API
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/trading-strategy-center
EnvironmentFile=/opt/trading-strategy-center/.env
ExecStart=/opt/trading-strategy-center/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable trading-center
sudo systemctl start trading-center
```

---

## 7. Celery Worker (异步任务)

后端大部分操作为同步（即时回测/训练已改造为线程池内即时执行）。
如需启用 Celery 分布式任务:

```bash
celery -A tasks worker --loglevel=info --concurrency=4
```

创建 systemd 服务 `/etc/systemd/system/trading-celery.service`:

```ini
[Unit]
Description=Trading Center Celery Worker
After=redis-server.service

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/trading-strategy-center
EnvironmentFile=/opt/trading-strategy-center/.env
ExecStart=/opt/trading-strategy-center/venv/bin/celery -A tasks worker --loglevel=info --concurrency=4
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 8. 前端构建

```bash
cd frontend
npm ci --omit=dev
npm run build          # 输出到 frontend/dist/
```

构建产物由 Nginx 直接托管，无需 Node 运行时。

---

## 9. HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 10. 监控与运维

### 健康检查

```bash
curl http://localhost:8000/health
# {"status":"ok","version":"0.1.0"}
```

### 日志

- 应用日志: `logs/app.log` (或 `/var/log/trading-center/app.log`)
- Nginx 日志: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- PostgreSQL 日志: `/var/log/postgresql/`

### 数据库备份

使用经过校验的备份和恢复演练脚本，完整流程见 `docs/RUNBOOK_BACKUP.md`：

```bash
bash scripts/backup_db.sh --dry-run
BACKUP_MODE=compose bash scripts/backup_db.sh
bash scripts/restore_drill.sh
```

### 常用维护命令

```bash
# 查看服务状态
sudo systemctl status trading-center

# 重启服务
sudo systemctl restart trading-center

# 查看日志
sudo journalctl -u trading-center -f

# PostgreSQL 连接检查
psql -U trading -d trading_strategy_center -c "SELECT count(*) FROM kline;"

# Redis 连接检查
redis-cli ping
```

---

## 11. 数据采集（首次部署）

首次部署后需要采集基础数据:

```bash
# 方式 1: 通过 API 触发
curl -X POST http://localhost:8000/api/v1/warehouse/collect \
  -H "Content-Type: application/json" \
  -d '{"asset_type":"futures","years":[2024,2025,2026]}'

# 方式 2: 通过前端「数据中心」页面手动采集
# DataCenter → 统一采集面板 → 选择品种/年份 → 开始采集

# 宏观指标采集
curl -X POST http://localhost:8000/api/v1/warehouse/macro \
  -H "Content-Type: application/json" \
  -d '{"indicator":"all"}'
```
