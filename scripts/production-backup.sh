#!/usr/bin/env bash
# Creates an atomic PostgreSQL + MinIO backup for a production Compose release.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/production/lib.sh"

sidpro_init "$@"
sidpro_require_commands

BACKUP_DIR="${SIDPRO_BACKUP_DIR:-/var/backups/sidpro}"
RELEASE_ID="${SIDPRO_RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$(sidpro_current_revision)}"
MANIFEST_FILE="${SIDPRO_BACKUP_MANIFEST_FILE:-$BACKUP_DIR/release_${RELEASE_ID}.manifest}"

mkdir -p "$BACKUP_DIR"
umask 077

DB_FILE="$BACKUP_DIR/db_${RELEASE_ID}.sql.gz"
DB_CHECKSUM_FILE="$DB_FILE.sha256"
OBJECT_FILE="$BACKUP_DIR/uploads_${RELEASE_ID}.tar.gz"
OBJECT_CHECKSUM_FILE="$OBJECT_FILE.sha256"

if [ -e "$DB_FILE" ] || [ -e "$OBJECT_FILE" ] || [ -e "$MANIFEST_FILE" ]; then
  echo "[production-backup] ERROR: release backup already exists for $RELEASE_ID" >&2
  exit 1
fi

DB_TMP="$(mktemp "$BACKUP_DIR/.db_${RELEASE_ID}.XXXXXX")"
OBJECT_TMP="$(mktemp "$BACKUP_DIR/.uploads_${RELEASE_ID}.XXXXXX")"
OBJECT_STAGE="$(mktemp -d "$BACKUP_DIR/.uploads_stage_${RELEASE_ID}.XXXXXX")"
MANIFEST_TMP="$(mktemp "$BACKUP_DIR/.release_${RELEASE_ID}.XXXXXX")"

cleanup() {
  rm -f "$DB_TMP" "$OBJECT_TMP" "$MANIFEST_TMP"
  rm -rf "$OBJECT_STAGE"
}
trap cleanup EXIT

printf '%s\n' '[production-backup] Waiting for database and object storage...'
sidpro_wait_for_service postgres
sidpro_wait_for_service minio

printf '%s\n' '[production-backup] Creating PostgreSQL dump...'
sidpro_compose exec -T postgres sh -ec 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' \
  | gzip -9 > "$DB_TMP"
gzip -t "$DB_TMP"
mv "$DB_TMP" "$DB_FILE"
sha256sum "$DB_FILE" > "$DB_CHECKSUM_FILE"

printf '%s\n' '[production-backup] Mirroring MinIO bucket...'
MINIO_CONTAINER_ID="$(sidpro_compose ps -q minio)"
if [ -z "$MINIO_CONTAINER_ID" ]; then
  echo '[production-backup] ERROR: MinIO service is not running' >&2
  exit 1
fi

MINIO_NETWORK="$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$MINIO_CONTAINER_ID" | head -n 1)"
if [ -z "$MINIO_NETWORK" ]; then
  echo '[production-backup] ERROR: unable to resolve MinIO network' >&2
  exit 1
fi

docker run --rm \
  --network "$MINIO_NETWORK" \
  -v "$OBJECT_STAGE:/backup-data" \
  -e MINIO_ROOT_USER \
  -e MINIO_ROOT_PASSWORD \
  -e MINIO_BUCKET \
  --entrypoint /bin/sh \
  minio/mc \
  -ec 'mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null && mc mb --ignore-existing "local/${MINIO_BUCKET}" >/dev/null && mc mirror --quiet "local/${MINIO_BUCKET}" /backup-data/'

tar -czf "$OBJECT_TMP" -C "$OBJECT_STAGE" .
tar -tzf "$OBJECT_TMP" >/dev/null
mv "$OBJECT_TMP" "$OBJECT_FILE"
sha256sum "$OBJECT_FILE" > "$OBJECT_CHECKSUM_FILE"

cat > "$MANIFEST_TMP" <<EOF
format=1
release_id=$RELEASE_ID
created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
revision=$(sidpro_current_revision)
database_backup=$DB_FILE
database_checksum=$DB_CHECKSUM_FILE
object_backup=$OBJECT_FILE
object_checksum=$OBJECT_CHECKSUM_FILE
EOF
mv "$MANIFEST_TMP" "$MANIFEST_FILE"

printf '%s\n' "[production-backup] Database backup: $DB_FILE"
printf '%s\n' "[production-backup] Object backup: $OBJECT_FILE"
printf '%s\n' "[production-backup] Manifest: $MANIFEST_FILE"
