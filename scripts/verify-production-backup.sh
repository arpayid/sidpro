#!/usr/bin/env bash
# Verifies backup checksums and restores the database dump into a disposable database.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/production/lib.sh"

MANIFEST_FILE=""
PARSED_ARGS=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --manifest)
      MANIFEST_FILE="$2"
      shift 2
      ;;
    --env-file|--compose-file)
      PARSED_ARGS+=("$1" "$2")
      shift 2
      ;;
    *)
      if [ -z "$MANIFEST_FILE" ]; then
        MANIFEST_FILE="$1"
        shift
      else
        echo "[verify-production-backup] ERROR: unsupported argument: $1" >&2
        exit 2
      fi
      ;;
  esac
done

sidpro_init "${PARSED_ARGS[@]}"
sidpro_require_commands

if [ -z "$MANIFEST_FILE" ] || [ ! -f "$MANIFEST_FILE" ]; then
  echo '[verify-production-backup] ERROR: a backup manifest is required' >&2
  exit 1
fi

manifest_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub("^[^=]*=", ""); print; exit }' "$MANIFEST_FILE"
}

DB_FILE="$(manifest_value database_backup)"
DB_CHECKSUM_FILE="$(manifest_value database_checksum)"
OBJECT_FILE="$(manifest_value object_backup)"
OBJECT_CHECKSUM_FILE="$(manifest_value object_checksum)"

for artifact in "$DB_FILE" "$DB_CHECKSUM_FILE" "$OBJECT_FILE" "$OBJECT_CHECKSUM_FILE"; do
  if [ -z "$artifact" ] || [ ! -f "$artifact" ]; then
    echo "[verify-production-backup] ERROR: missing backup artifact: ${artifact:-unknown}" >&2
    exit 1
  fi
done

printf '%s\n' '[verify-production-backup] Checking backup checksums and archives...'
sha256sum --check "$DB_CHECKSUM_FILE"
sha256sum --check "$OBJECT_CHECKSUM_FILE"
gzip -t "$DB_FILE"
tar -tzf "$OBJECT_FILE" >/dev/null

sidpro_wait_for_service postgres
TEMP_DB="sidpro_restore_verify_$(date -u +%Y%m%d%H%M%S)_$RANDOM"

cleanup_temp_db() {
  sidpro_compose exec -T postgres sh -ec "psql -X -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d postgres -c 'DROP DATABASE IF EXISTS \"$TEMP_DB\" WITH (FORCE)'" >/dev/null 2>&1 || true
}
trap cleanup_temp_db EXIT

printf '%s\n' '[verify-production-backup] Restoring database dump into a disposable database...'
sidpro_compose exec -T postgres sh -ec "psql -X -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d postgres -c 'CREATE DATABASE \"$TEMP_DB\"'" >/dev/null

gzip -cd "$DB_FILE" \
  | sidpro_compose exec -T postgres sh -ec "exec psql -X -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"$TEMP_DB\"" >/dev/null

MIGRATION_COUNT="$(sidpro_compose exec -T postgres sh -ec "psql -X -A -t -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"$TEMP_DB\" -c 'SELECT COUNT(*) FROM \"_prisma_migrations\"'")"
if ! [[ "$MIGRATION_COUNT" =~ ^[1-9][0-9]*$ ]]; then
  echo '[verify-production-backup] ERROR: restored database has no Prisma migration history' >&2
  exit 1
fi

cleanup_temp_db
trap - EXIT
printf '%s\n' '[verify-production-backup] PASS: backup archive and disposable restore verified.'
