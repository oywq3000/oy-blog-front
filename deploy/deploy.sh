#!/usr/bin/env bash
# oyblog-front 部署脚本（Windows git-bash / Linux 均可）
# 流程: 本地 build -> tar-over-ssh 上传 dist（就地覆盖）-> nginx.conf 上传 +
#       一次性容器 nginx -t 预校验 -> docker compose up -d -> 配置变化时热 reload
# 用法: ./deploy/deploy.sh [--skip-build] [--clean] [--rollback]
set -euo pipefail

# ============ 配置区（按需修改） ============
SERVER_HOST="oyblog.top"          # 首次部署建议先用服务器 IP
SERVER_USER="root"                # 非 root 需对 /opt/oyblog-front 有写权限
REMOTE_DIR="/opt/oyblog-front"
COMPOSE_CMD="docker compose"      # compose v1 改为 "docker-compose"
# ===========================================

SSH_TARGET="${SERVER_USER}@${SERVER_HOST}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SKIP_BUILD=0; CLEAN=0; ROLLBACK=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --clean)      CLEAN=1 ;;
    --rollback)   ROLLBACK=1 ;;
    *) echo "未知参数: $arg"; exit 1 ;;
  esac
done

if [ "$ROLLBACK" = "1" ]; then
  echo "==> 回滚 dist（就地恢复上次构建备份）"
  ssh "$SSH_TARGET" "cp -a $REMOTE_DIR/dist.bak/. $REMOTE_DIR/dist/"
  exit 0
fi

echo "==> [1/5] 本地构建"
if [ "$SKIP_BUILD" != "1" ]; then
  (cd "$REPO_ROOT" && npm run build)
fi
[ -f "$REPO_ROOT/dist/index.html" ] || { echo "dist/index.html 不存在，构建未成功"; exit 1; }

echo "==> [2/5] 上传 dist（tar-over-ssh）"
# 红线: ./dist 是 bind mount 根目录，绝不可 mv/rm 整个目录 —— 容器 mount 钉住
# 旧 inode，改名后容器永远读到旧内容。必须就地覆盖；先快照 dist.bak 供回滚。
ssh "$SSH_TARGET" "mkdir -p $REMOTE_DIR/dist"
REMOTE_SCRIPT=$(cat <<EOF
set -e
cd $REMOTE_DIR
[ -d dist.bak ] && rm -rf dist.bak
cp -a dist dist.bak
if [ "$CLEAN" = "1" ]; then find dist -type f -delete; fi
tar -xzf - -C dist
EOF
)
tar -C "$REPO_ROOT/dist" -czf - . | ssh "$SSH_TARGET" "$REMOTE_SCRIPT"

echo "==> [3/5] 上传并预校验 nginx.conf / docker-compose.yml"
OLD_MD5=$(ssh "$SSH_TARGET" "md5sum $REMOTE_DIR/nginx.conf 2>/dev/null | awk '{print \$1}'" || true)
NEW_MD5=$(md5sum "$REPO_ROOT/deploy/nginx.conf" | awk '{print $1}')
scp -q "$REPO_ROOT/deploy/nginx.conf"         "$SSH_TARGET:$REMOTE_DIR/nginx.conf.tmp"
scp -q "$REPO_ROOT/deploy/docker-compose.yml" "$SSH_TARGET:$REMOTE_DIR/docker-compose.yml"
# 一次性容器校验。必须 --add-host=host.docker.internal，否则 nginx -t 解析
# proxy_pass 域名失败报 "host not found in upstream"。校验失败在此中止，
# 运行中的 nginx 完全不受影响。
ssh "$SSH_TARGET" "
  set -e
  docker run --rm \
    --add-host=host.docker.internal:host-gateway \
    -v $REMOTE_DIR/nginx.conf.tmp:/etc/nginx/nginx.conf:ro \
    nginx:alpine nginx -t
  cat $REMOTE_DIR/nginx.conf.tmp > $REMOTE_DIR/nginx.conf   # 就地覆盖，保留 inode
  rm -f $REMOTE_DIR/nginx.conf.tmp
"

echo "==> [4/5] 确保容器运行（up -d 幂等）"
ssh "$SSH_TARGET" "cd $REMOTE_DIR && $COMPOSE_CMD up -d"

echo "==> [5/5] nginx.conf 有变化时热加载"
if [ "${OLD_MD5:-}" != "$NEW_MD5" ]; then
  ssh "$SSH_TARGET" "cd $REMOTE_DIR && $COMPOSE_CMD exec -T nginx nginx -t && $COMPOSE_CMD exec -T nginx nginx -s reload"
  echo "    nginx.conf 已变化，已 reload（零中断）"
else
  echo "    nginx.conf 未变化，跳过 reload"
fi

echo ""
echo "==> 部署完成。验证: ssh $SSH_TARGET \"curl -s -o /dev/null -w '%{http_code}' http://localhost/\"  # 期望 200"
