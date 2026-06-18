#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[restore] ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[restore] ERROR: DATABASE_URL not set"
  exit 1
fi

echo "[restore] WARNING: This will overwrite the current database!"
echo "[restore] Restoring from: $BACKUP_FILE"

read -r -p "Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "[restore] Aborted."
  exit 0
fi

gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
echo "[restore] Database restored successfully."
