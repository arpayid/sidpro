#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${SIDPRO_ENV_FILE:-/etc/sidpro/sidpro.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[staging-post-deploy] ERROR: environment file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${STAGING_ADMIN_PASSWORD:?STAGING_ADMIN_PASSWORD is required for smoke validation}"

DB_URL="${DATABASE_URL%%\?*}"

resolve_psql() {
  if command -v psql >/dev/null 2>&1; then
    command -v psql
    return
  fi

  local candidate
  for candidate in /usr/lib/postgresql/*/bin/psql; do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return
    fi
  done

  echo "[staging-post-deploy] ERROR: psql client not found" >&2
  exit 1
}

PSQL="$(resolve_psql)"

printf '%s\n' '[staging-post-deploy] Checking tenant-link integrity preflight...'
preflight="$($PSQL "$DB_URL" -X -A -t -v ON_ERROR_STOP=1 -f scripts/db/verify-tenant-link-integrity.sql)"
if [ -n "${preflight//[[:space:]]/}" ]; then
  echo "[staging-post-deploy] ERROR: tenant-link integrity violations found; deployment validation stopped." >&2
  printf '%s\n' "$preflight" >&2
  exit 1
fi

printf '%s\n' '[staging-post-deploy] Checking migration status...'
pnpm exec prisma migrate status --schema=prisma/schema.prisma

printf '%s\n' '[staging-post-deploy] Checking running services...'
bash scripts/healthcheck.sh

printf '%s\n' '[staging-post-deploy] Running live smoke suite without reseeding...'
SMOKE_RUN_SEED=0 bash scripts/smoke-test.sh

printf '%s\n' '[staging-post-deploy] PASS: staging release validation completed.'
