#!/usr/bin/env bash
# Blocks a release before migration when known integrity violations exist.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/production/lib.sh"

sidpro_init "$@"
sidpro_require_commands

MIGRATION_TABLE_EXISTS="$(sidpro_psql <<'SQL'
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = '_prisma_migrations'
);
SQL
)"

if [ "$MIGRATION_TABLE_EXISTS" != 't' ]; then
  APP_TABLE_COUNT="$(sidpro_psql <<'SQL'
SELECT COUNT(*)
FROM pg_tables
WHERE schemaname = 'public';
SQL
)"
  if [ "$APP_TABLE_COUNT" != '0' ]; then
    echo '[production-preflight] ERROR: database contains application tables but no Prisma migration history.' >&2
    exit 1
  fi
  printf '%s\n' '[production-preflight] Empty bootstrap database detected; tenant checks will run after the first migration.'
  exit 0
fi

printf '%s\n' '[production-preflight] Verifying tenant-link integrity...'
sidpro_assert_sql_file_empty \
  'domain tenant-link preflight' \
  "$SIDPRO_ROOT/scripts/db/verify-tenant-link-integrity.sql"
sidpro_assert_sql_file_empty \
  'identity tenant-link preflight' \
  "$SIDPRO_ROOT/scripts/db/verify-identity-tenant-link-integrity.sql"

printf '%s\n' '[production-preflight] Checking historical budget realization values...'
NEGATIVE_REALIZED="$(sidpro_psql <<'SQL'
SELECT id || '|' || realized::text
FROM budget_items
WHERE realized < 0
ORDER BY id;
SQL
)"
if [ -n "${NEGATIVE_REALIZED//[[:space:]]/}" ]; then
  echo '[production-preflight] ERROR: negative budget_items.realized values must be reconciled before the ledger migration.' >&2
  printf '%s\n' "$NEGATIVE_REALIZED" >&2
  exit 1
fi

printf '%s\n' '[production-preflight] PASS: release preflight completed.'
