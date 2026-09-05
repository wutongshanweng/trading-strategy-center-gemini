#!/usr/bin/env bash
# Trading Strategy Center — 一键部署脚本
# 用法:
#   ./deploy.sh              # 裸机部署 (默认)
#   ./deploy.sh --docker     # Docker Compose 部署
#   ./deploy.sh --no-build   # 跳过构建，仅重启
#   ./deploy.sh --init-only  # 仅执行 DB 初始化

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEPLOY_MODE="bare"       # bare | docker
NO_BUILD=false
INIT_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --docker)    DEPLOY_MODE="docker" ;;
    --no-build)  NO_BUILD=true ;;
    --init-only) INIT_ONLY=true ;;
    --help|-h)
      echo "用法: ./deploy.sh [--docker] [--no-build] [--init-only]"
      echo ""
      echo "  (无参数)     裸机部署 (systemd + uvicorn)"
      echo "  --docker     Docker Compose 部署"
      echo "  --no-build   跳过构建步骤，仅重启"
      echo "  --init-only  仅执行数据库初始化"
      exit 0 ;;
  esac
done

echo "========================================"
echo "  Trading Strategy Center — 部署"
echo "  模式: $DEPLOY_MODE | $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# ──── 1. 拉取最新代码 ────
if $INIT_ONLY; then
  echo "[跳过] 代码拉取 (--init-only)"
else
  echo "[1/8] 拉取最新代码 ..."
  git fetch origin main 2>/dev/null || { echo "  WARN: 无法 fetch，使用本地代码"; }
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL")
  if [ "$LOCAL" = "$REMOTE" ]; then
    echo "  已是最新 ($(git rev-parse --short HEAD))"
  else
    echo "  更新: $(git rev-parse --short HEAD) → $(git rev-parse --short origin/main)"
    git pull origin main
  fi
fi

# ──── 2. 裸机: 安装依赖 & 构建前端 ────
if [ "$DEPLOY_MODE" = "bare" ] && ! $INIT_ONLY; then
  echo "[2/8] 检查 Python 环境 ..."
  PYTHON="${PYTHON:-python3}"
  command -v "$PYTHON" >/dev/null 2>&1 || { echo "  ERROR: 未找到 $PYTHON"; exit 1; }
  echo "  OK ($($PYTHON --version))"

  if $NO_BUILD; then
    echo "[3/8] 跳过构建 (--no-build)"
  else
    echo "[3/8] 安装 Python 依赖 ..."
    "$PYTHON" -m pip install --upgrade pip -q
    "$PYTHON" -m pip install -e . -q 2>&1 | tail -3

    echo "[4/8] 构建前端 ..."
    if [ -d frontend ]; then
      cd frontend
      npm install --silent 2>&1 | tail -1
      npm run build 2>&1 | tail -3
      cd "$SCRIPT_DIR"
      echo "  前端构建完成 ($(ls -la frontend/dist/index.html 2>/dev/null | awk '{print $5}' || echo '?') bytes)"
    else
      echo "  WARN: 未找到 frontend/ 目录"
    fi
  fi

  # — Redis —
  echo "[5/8] 检查 Redis ..."
  if command -v redis-cli >/dev/null 2>&1 && redis-cli ping >/dev/null 2>&1; then
    echo "  OK (Redis PONG)"
  elif command -v redis-server >/dev/null 2>&1; then
    echo "  启动 Redis ..."
    nohup redis-server --daemonize yes --port 6379 > /dev/null 2>&1
    sleep 1
    if redis-cli ping >/dev/null 2>&1; then echo "  Redis 已启动"; else echo "  WARN: Redis 启动失败"; fi
  else
    echo "  WARN: 未安装 Redis — apt install redis-server"
  fi

  echo "[6/8] 安装 systemd API/Celery 单元 ..."
  sudo PROJECT_DIR="$SCRIPT_DIR" PYTHON_BIN="$(command -v "$PYTHON")" SERVICE_USER="${SERVICE_USER:-$USER}" \
    bash scripts/install_systemd_units.sh

  echo "[7/8] 重启 API/Celery 服务 ..."
  sudo systemctl restart trading-center trading-center-worker trading-center-beat
  sudo systemctl --no-pager --full status trading-center trading-center-worker trading-center-beat | head -30

elif [ "$DEPLOY_MODE" = "docker" ] && ! $INIT_ONLY; then
  echo "[2/8] 检查 Docker ..."
  command -v docker >/dev/null 2>&1 || { echo "  ERROR: 未安装 docker"; exit 1; }
  echo "  OK ($(docker --version))"

  if $NO_BUILD; then
    echo "[3/8] 跳过构建 (--no-build)"
  else
    echo "[3/8] 构建 Docker 镜像 ..."
    docker compose build --pull app 2>&1 | tail -5
  fi

  echo "[4/8] (跳过前端构建，Dockerfile 内处理)"

  echo "[5/8] 启动 Docker 服务 ..."
  docker compose up -d --remove-orphans 2>&1
fi

# ──── 等待服务就绪 ────
echo "  等待服务就绪 (8s) ..."
sleep 8

# ──── 3. 数据库初始化 ────
db_init() {
  echo "[8/8] 数据库初始化 (collect_checkpoints) ..."
  if [ "$DEPLOY_MODE" = "docker" ]; then
    docker compose exec -T app python -c "
from data_center.collect.checkpoint import ensure_table
ensure_table()
print('checkpoint table OK')
" 2>&1 || echo "  WARN: checkpoint 初始化失败"
  else
    cd "$SCRIPT_DIR"
    "$PYTHON" -c "
from data_center.collect.checkpoint import ensure_table
ensure_table()
print('checkpoint table OK')
" 2>&1 || echo "  WARN: checkpoint 初始化失败"
  fi
}
$INIT_ONLY || db_init

# ──── 验证 ────
echo ""
echo "========================================"
echo "  验证服务 ..."
echo "========================================"

check() {
  local path="$1"
  local label="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000${path}" 2>/dev/null || echo "fail")
  case "$code" in
    200) echo "  [OK]  $label → 200" ;;
    404) echo "  [WARN] $label → 404 (需要重新部署后端)" ;;
    *)   echo "  [WARN] $label → ${code}" ;;
  esac
}

check "/health"                     "健康检查"
check "/health/diagnostics"         "系统诊断 (直连)"
check "/api/v1/health/diagnostics"  "系统诊断 (API前缀)"
check "/api/v1/warehouse/sync/year-status" "同步状态"
check "/api/v1/briefing/"           "快读简报"

echo ""
echo "部署完成!"
echo "  前端: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_IP')"
echo "  诊断: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_IP')/settings → 系统环境检测"
