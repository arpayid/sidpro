#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting database backup..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] ERROR: DATABASE_URL not set"
  exit 1
fi

DB_URL="${DATABASE_URL%%\?*}"

if [ -x /usr/lib/postgresql/17/bin/pg_dump ]; then
  PG_DUMP=/usr/lib/postgresql/17/bin/pg_dump
elif command -v pg_dump >/dev/null 2>&1; then
  PG_DUMP=pg_dump
else
  echo "[backup] ERROR: pg_dump not found"
  exit 1
fi

"$PG_DUMP" "$DB_URL" | gzip > "$DB_BACKUP_FILE"
echo "[backup] Database backup saved: $DB_BACKUP_FILE"

if [ -d "${UPLOAD_DIR:-./uploads}" ]; then
  UPLOAD_BACKUP="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
  tar -czf "$UPLOAD_BACKUP" -C "$(dirname "${UPLOAD_DIR:-./uploads}")" "$(basename "${UPLOAD_DIR:-./uploads}")"
  echo "[backup] Uploads backup saved: $UPLOAD_BACKUP"
fi

echo "[backup] Backup completed at $TIMESTAMP"
