#!/usr/bin/env bash
# Daily staging backup — sources env from outside repo.
set -euo pipefail

ENV_FILE="${SIDPRO_ENV_FILE:-/etc/sidpro/sidpro.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sidpro}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[backup] ERROR: env file not found: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

export BACKUP_DIR
export DATABASE_URL="${DATABASE_URL%%\?*}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/backup.sh"
