#!/usr/bin/env bash
# Verifies a deployed production Compose release without mutating or reseeding data.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/production/lib.sh"

sidpro_init "$@"
sidpro_require_commands

if ! command -v curl >/dev/null 2>&1; then
  echo '[production-post-deploy] ERROR: curl is required for live health validation' >&2
  exit 1
fi

printf '%s\n' '[production-post-deploy] Waiting for production services...'
for service in postgres redis minio api web worker nginx; do
  sidpro_wait_for_service "$service"
done

printf '%s\n' '[production-post-deploy] Checking Prisma migration status...'
sidpro_compose --profile maintenance run --rm db-maintenance \
  pnpm exec prisma migrate status --schema=prisma/schema.prisma

printf '%s\n' '[production-post-deploy] Re-running tenant and ledger integrity checks...'
sidpro_assert_sql_file_empty \
  'domain tenant-link post-deploy verification' \
  "$SIDPRO_ROOT/scripts/db/verify-tenant-link-integrity.sql"
sidpro_assert_sql_file_empty \
  'identity tenant-link post-deploy verification' \
  "$SIDPRO_ROOT/scripts/db/verify-identity-tenant-link-integrity.sql"
sidpro_assert_sql_file_empty \
  'budget realization ledger verification' \
  "$SIDPRO_ROOT/scripts/db/verify-budget-realization-ledger.sql"

HTTP_PORT="${NGINX_HTTP_PORT:-80}"
printf '%s\n' '[production-post-deploy] Checking public HTTP endpoints...'
curl --fail --silent --show-error "http://127.0.0.1:${HTTP_PORT}/api/v1/health" >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:${HTTP_PORT}/" >/dev/null

if [ "${SIDPRO_RUN_AUTH_SMOKE:-0}" = '1' ]; then
  : "${STAGING_ADMIN_PASSWORD:?STAGING_ADMIN_PASSWORD is required when SIDPRO_RUN_AUTH_SMOKE=1}"
  printf '%s\n' '[production-post-deploy] Running authenticated smoke suite without reseeding...'
  SMOKE_RUN_SEED=0 bash "$SIDPRO_ROOT/scripts/smoke-test.sh"
else
  printf '%s\n' '[production-post-deploy] Authenticated smoke suite skipped (set SIDPRO_RUN_AUTH_SMOKE=1 to enable).'
fi

printf '%s\n' '[production-post-deploy] PASS: production release validation completed.'
