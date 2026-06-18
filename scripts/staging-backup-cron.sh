#!/usr/bin/env bash
# Daily staging backup — DB + MinIO/uploads. Sources env from outside repo.
set -euo pipefail

ENV_FILE="${SIDPRO_ENV_FILE:-/etc/sidpro/sidpro.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sidpro}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ ! -f "$ENV_FILE" ]; then
  echo "[backup] ERROR: env file not found: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"

export BACKUP_DIR
export DATABASE_URL="${DATABASE_URL%%\?*}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[backup] Starting database backup..."
"$ROOT/scripts/backup.sh"

backup_minio_bucket() {
  local backup_file="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
  local tmpdir

  if ! docker ps --format '{{.Names}}' | grep -q '^sidpro-minio$'; then
    echo "[backup] WARN: MinIO container not running — skip object storage backup"
    return 0
  fi

  tmpdir=$(mktemp -d)
  # shellcheck disable=SC2064
  trap "rm -rf '$tmpdir'" RETURN

  if ! docker run --rm \
    --network container:sidpro-minio \
    -v "${tmpdir}:/backup-data" \
    -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD -e MINIO_BUCKET \
    --entrypoint /bin/sh minio/mc -c \
    'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc mirror --quiet local/${MINIO_BUCKET:-sidpro-files} /backup-data/'; then
    echo "[backup] WARN: MinIO mirror failed — skip object storage backup"
    return 0
  fi

  if [ -n "$(find "$tmpdir" -mindepth 1 -print -quit 2>/dev/null)" ]; then
    tar -czf "$backup_file" -C "$tmpdir" .
    echo "[backup] Object storage backup saved: $backup_file"
  else
    tar -czf "$backup_file" --files-from /dev/null
    echo "[backup] Object storage backup saved (empty bucket): $backup_file"
  fi
}

echo "[backup] Starting object storage backup..."
backup_minio_bucket

echo "[backup] Backup completed at $TIMESTAMP"
