#!/usr/bin/env bash
# Dev-only database restore (plan.m NT.2.2). Requires explicit confirmation.
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: RESTORE_CONFIRM=YES $0 <backup_file.sql.gz>"
  echo "Dev only — never run against production without review."
  exit 1
fi

if [ "${RESTORE_CONFIRM:-}" != "YES" ]; then
  echo "[restore-db] ERROR: Set RESTORE_CONFIRM=YES to proceed."
  exit 1
fi

if [ "${NODE_ENV:-}" = "production" ]; then
  echo "[restore-db] ERROR: Restore blocked when NODE_ENV=production."
  exit 1
fi

BACKUP_FILE="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[restore-db] ERROR: DATABASE_URL not set"
  exit 1
fi

echo "[restore-db] WARNING: Overwriting database from $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction
echo "[restore-db] Database restored successfully."
