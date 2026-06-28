#!/usr/bin/env bash
# Safe production Compose release flow: backup -> restore verification -> preflight -> migration -> deploy -> validation.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/production/lib.sh"

sidpro_init "$@"
sidpro_require_commands

if [ "${NODE_ENV:-production}" != 'production' ]; then
  echo '[production-release] ERROR: NODE_ENV must be production for this release runner' >&2
  exit 1
fi

if command -v git >/dev/null 2>&1 && git -C "$SIDPRO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git -C "$SIDPRO_ROOT" diff --quiet || ! git -C "$SIDPRO_ROOT" diff --cached --quiet; then
    echo '[production-release] ERROR: repository contains uncommitted tracked changes; release a committed revision only' >&2
    exit 1
  fi
fi

RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-$(sidpro_current_revision)"
BACKUP_DIR="${SIDPRO_BACKUP_DIR:-/var/backups/sidpro}"
MANIFEST_FILE="$BACKUP_DIR/release_${RELEASE_ID}.manifest"

on_failure() {
  local status="$?"
  if [ "$status" -ne 0 ]; then
    echo "[production-release] FAILED. Services were not automatically rolled back. Backup manifest: $MANIFEST_FILE" >&2
    echo '[production-release] Review migration compatibility before restoring the verified backup.' >&2
  fi
  exit "$status"
}
trap on_failure EXIT

printf '%s\n' '[production-release] Validating production Compose configuration...'
sidpro_compose config -q

printf '%s\n' '[production-release] Starting required infrastructure...'
sidpro_compose up -d postgres redis minio
for service in postgres redis minio; do
  sidpro_wait_for_service "$service"
done

printf '%s\n' '[production-release] Creating and verifying release backup...'
SIDPRO_RELEASE_ID="$RELEASE_ID" \
SIDPRO_BACKUP_DIR="$BACKUP_DIR" \
SIDPRO_BACKUP_MANIFEST_FILE="$MANIFEST_FILE" \
bash "$SIDPRO_ROOT/scripts/production-backup.sh" --env-file "$SIDPRO_ENV_FILE" --compose-file "$SIDPRO_COMPOSE_FILE"

bash "$SIDPRO_ROOT/scripts/verify-production-backup.sh" \
  --env-file "$SIDPRO_ENV_FILE" \
  --compose-file "$SIDPRO_COMPOSE_FILE" \
  --manifest "$MANIFEST_FILE"

printf '%s\n' '[production-release] Running migration preflight...'
bash "$SIDPRO_ROOT/scripts/production-preflight.sh" \
  --env-file "$SIDPRO_ENV_FILE" \
  --compose-file "$SIDPRO_COMPOSE_FILE"

printf '%s\n' '[production-release] Applying Prisma migrations...'
sidpro_compose --profile maintenance run --rm --build db-maintenance \
  pnpm exec prisma migrate deploy --schema=prisma/schema.prisma

printf '%s\n' '[production-release] Building and starting application services...'
sidpro_compose up -d --build --remove-orphans

printf '%s\n' '[production-release] Running post-deploy validation...'
bash "$SIDPRO_ROOT/scripts/production-post-deploy-validate.sh" \
  --env-file "$SIDPRO_ENV_FILE" \
  --compose-file "$SIDPRO_COMPOSE_FILE"

trap - EXIT
printf '%s\n' "[production-release] PASS: release $RELEASE_ID deployed successfully. Verified backup manifest: $MANIFEST_FILE"
