#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "[staging] ERROR: .env not found. Copy .env.example and set non-default credentials."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

LOG_DIR="${STAGING_LOG_DIR:-logs}"
mkdir -p "$LOG_DIR"

echo "[staging] Starting infrastructure (postgres, redis, minio)..."
docker compose up -d postgres redis minio

echo "[staging] Waiting for containers..."
sleep 5

if docker ps --format '{{.Names}}' | grep -q '^sidpro-minio$'; then
  echo "[staging] Ensuring MinIO bucket exists..."
  docker run --rm --network container:sidpro-minio \
    -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD -e MINIO_BUCKET \
    --entrypoint /bin/sh minio/mc -c \
    'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc mb local/${MINIO_BUCKET:-sidpro-files} --ignore-existing' \
    2>/dev/null || echo "[staging] WARN: MinIO bucket setup skipped — verify MINIO_* in .env"
fi

if pgrep -f 'node dist/main' >/dev/null 2>&1; then
  echo "[staging] API already running — skip start"
else
  echo "[staging] Starting API..."
  nohup pnpm --filter @sidpro/api start:prod >>"$LOG_DIR/api.log" 2>&1 &
  echo $! >"$LOG_DIR/api.pid"
fi

if pgrep -f 'next start' >/dev/null 2>&1; then
  echo "[staging] Web already running — skip start"
else
  echo "[staging] Starting Web..."
  nohup pnpm --filter @sidpro/web start >>"$LOG_DIR/web.log" 2>&1 &
  echo $! >"$LOG_DIR/web.pid"
fi

echo "[staging] Waiting for application processes..."
sleep 8

echo "[staging] Running healthcheck..."
./scripts/healthcheck.sh

echo "[staging] Done. Logs: $LOG_DIR/api.log, $LOG_DIR/web.log"
