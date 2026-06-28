#!/usr/bin/env bash
# Blocks a release before migration when known integrity violations exist.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/production/lib.sh"

sidpro_init "$@"
sidpro_require_commands

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
