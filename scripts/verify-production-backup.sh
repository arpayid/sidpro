#!/usr/bin/env bash
# Verifies backup checksums and restores database and object archives into disposable targets.
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
sidpro_wait_for_service minio
TEMP_DB="sidpro_restore_verify_$(date -u +%Y%m%d%H%M%S)_$RANDOM"
TEMP_BUCKET="sidpro-restore-verify-$(date -u +%Y%m%d%H%M%S)-$RANDOM"
OBJECT_STAGE="$(mktemp -d)"
MINIO_CONTAINER_ID="$(sidpro_compose ps -q minio)"
MINIO_NETWORK="$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$MINIO_CONTAINER_ID" | head -n 1)"

cleanup_verification_targets() {
  sidpro_compose exec -T postgres sh -ec "psql -X -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d postgres -c 'DROP DATABASE IF EXISTS \"$TEMP_DB\" WITH (FORCE)'" >/dev/null 2>&1 || true
  if [ -n "${MINIO_NETWORK:-}" ]; then
    docker run --rm \
      --network "$MINIO_NETWORK" \
      -e MINIO_ROOT_USER \
      -e MINIO_ROOT_PASSWORD \
      --entrypoint /bin/sh \
      minio/mc \
      -ec "mc alias set local http://minio:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null && mc rb --force \"local/$TEMP_BUCKET\"" >/dev/null 2>&1 || true
  fi
  rm -rf "$OBJECT_STAGE"
}
trap cleanup_verification_targets EXIT

printf '%s\n' '[verify-production-backup] Restoring database dump into a disposable database...'
sidpro_compose exec -T postgres sh -ec "psql -X -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d postgres -c 'CREATE DATABASE \"$TEMP_DB\"'" >/dev/null

gzip -cd "$DB_FILE" \
  | sidpro_compose exec -T postgres sh -ec "exec psql -X -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"$TEMP_DB\"" >/dev/null

MIGRATION_TABLE_EXISTS="$(sidpro_compose exec -T postgres sh -ec "psql -X -A -t -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"$TEMP_DB\" -c \"SELECT to_regclass('public.\\\"_prisma_migrations\\\"') IS NOT NULL\"")"
if [ "$MIGRATION_TABLE_EXISTS" = 't' ]; then
  MIGRATION_COUNT="$(sidpro_compose exec -T postgres sh -ec "psql -X -A -t -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"$TEMP_DB\" -c 'SELECT COUNT(*) FROM \"_prisma_migrations\"'")"
  if ! [[ "$MIGRATION_COUNT" =~ ^[1-9][0-9]*$ ]]; then
    echo '[verify-production-backup] ERROR: restored database has an empty Prisma migration history' >&2
    exit 1
  fi
else
  APP_TABLE_COUNT="$(sidpro_compose exec -T postgres sh -ec "psql -X -A -t -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"$TEMP_DB\" -c \"SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'\"")"
  if [ "$APP_TABLE_COUNT" != '0' ]; then
    echo '[verify-production-backup] ERROR: restored database has application tables but no Prisma migration history' >&2
    exit 1
  fi
  printf '%s\n' '[verify-production-backup] Restored an empty bootstrap database; migration history will be created by the first release.'
fi

printf '%s\n' '[verify-production-backup] Restoring object archive into a disposable bucket...'
tar -xzf "$OBJECT_FILE" -C "$OBJECT_STAGE"
if [ -z "$MINIO_NETWORK" ]; then
  echo '[verify-production-backup] ERROR: unable to resolve MinIO network' >&2
  exit 1
fi

docker run --rm \
  --network "$MINIO_NETWORK" \
  -v "$OBJECT_STAGE:/restore-data:ro" \
  -e MINIO_ROOT_USER \
  -e MINIO_ROOT_PASSWORD \
  --entrypoint /bin/sh \
  minio/mc \
  -ec "mc alias set local http://minio:9000 \"\$MINIO_ROOT_USER\" \"\$MINIO_ROOT_PASSWORD\" >/dev/null && mc mb \"local/$TEMP_BUCKET\" >/dev/null && mc mirror --quiet /restore-data \"local/$TEMP_BUCKET\" && mc ls \"local/$TEMP_BUCKET\" >/dev/null"

cleanup_verification_targets
trap - EXIT
printf '%s\n' '[verify-production-backup] PASS: database and object archives restore successfully into disposable targets.'
