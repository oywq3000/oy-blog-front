#!/usr/bin/env bash
# oyblog-front 部署脚本（Windows git-bash / Linux 均可）
# 流程: 本地 build -> tar-over-ssh 上传 dist（就地覆盖）-> docker compose up -d
#       默认只部署 dist；传 --sync-config 才同步 nginx.conf/docker-compose.yml
#       （MD5 有变化才上传），nginx.conf 变化时容器内 nginx -t + reload（零中断）
# 用法: ./deploy/deploy.sh [--skip-build] [--clean] [--rollback] [--sync-config]
set -euo pipefail

# ============ 配置区（按需修改） ============
SERVER_HOST="100.110.148.14"          # 首次部署建议先用服务器 IP
SERVER_USER="oy"                # 非 root 需对 /opt/oyblog-front 有写权限
REMOTE_DIR="/home/oy/app/oyblogdeploy/oyblog-front"
COMPOSE_CMD="docker compose"      # compose v1 改为 "docker-compose"
# ===========================================

SSH_TARGET="${SERVER_USER}@${SERVER_HOST}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SKIP_BUILD=0; CLEAN=0; ROLLBACK=0; SYNC_CONFIG=0
for arg in "$@"; do
  case "$arg" in
    --skip-build)  SKIP_BUILD=1 ;;
    --clean)       CLEAN=1 ;;
    --rollback)    ROLLBACK=1 ;;
    --sync-config) SYNC_CONFIG=1 ;;
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

echo "==> [3/5] 同步配置文件（仅 --sync-config 时）"
if [ "$SYNC_CONFIG" = "1" ]; then
  # 两端 MD5 比对，一致则跳过；远程文件不存在时旧 MD5 为空 -> 视为有变化
  OLD_NGINX_MD5=$(ssh "$SSH_TARGET" "md5sum $REMOTE_DIR/nginx.conf 2>/dev/null | awk '{print \$1}'" || true)
  NEW_NGINX_MD5=$(md5sum "$REPO_ROOT/deploy/nginx.conf" | awk '{print $1}')
  OLD_COMPOSE_MD5=$(ssh "$SSH_TARGET" "md5sum $REMOTE_DIR/docker-compose.yml 2>/dev/null | awk '{print \$1}'" || true)
  NEW_COMPOSE_MD5=$(md5sum "$REPO_ROOT/deploy/docker-compose.yml" | awk '{print $1}')

  if [ "$OLD_NGINX_MD5" != "$NEW_NGINX_MD5" ]; then
    scp -q "$REPO_ROOT/deploy/nginx.conf" "$SSH_TARGET:$REMOTE_DIR/nginx.conf.tmp"
    # bind mount 钉住 inode：必须就地覆盖（cat >），不能 mv 换文件名
    ssh "$SSH_TARGET" "cat $REMOTE_DIR/nginx.conf.tmp > $REMOTE_DIR/nginx.conf && rm -f $REMOTE_DIR/nginx.conf.tmp"
    echo "    nginx.conf 已更新"
  else
    echo "    nginx.conf 未变化，跳过"
  fi

  if [ "$OLD_COMPOSE_MD5" != "$NEW_COMPOSE_MD5" ]; then
    scp -q "$REPO_ROOT/deploy/docker-compose.yml" "$SSH_TARGET:$REMOTE_DIR/docker-compose.yml"
    echo "    docker-compose.yml 已更新"
  else
    echo "    docker-compose.yml 未变化，跳过"
  fi
else
  echo "    跳过（默认只部署 dist）"
fi

echo "==> [4/5] 确保容器运行（up -d 幂等）"
ssh "$SSH_TARGET" "cd $REMOTE_DIR && $COMPOSE_CMD up -d"

echo "==> [5/5] nginx.conf 有变化时热加载"
if [ "$SYNC_CONFIG" = "1" ] && [ "${OLD_NGINX_MD5:-}" != "${NEW_NGINX_MD5:-}" ]; then
  ssh "$SSH_TARGET" "cd $REMOTE_DIR && $COMPOSE_CMD exec -T nginx nginx -t && $COMPOSE_CMD exec -T nginx nginx -s reload"
  echo "    nginx.conf 已变化，已 reload（零中断）"
else
  echo "    跳过 reload（未同步配置或无变化）"
fi

echo ""
echo "==> 部署完成。验证: ssh $SSH_TARGET \"curl -s -o /dev/null -w '%{http_code}' http://localhost/\"  # 期望 200"
