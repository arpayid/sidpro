#!/usr/bin/env bash
# Staging readiness gate — Wave 25 (Point 3 automation helper)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[staging-readiness] Running local validation stack..."
"$ROOT/scripts/staging-validate.sh"

echo ""
echo "[staging-readiness] Documentation checklist:"
docs=(
  "docs/STAGING_STABILIZATION.md"
  "docs/STAGING_2WEEK_RUNBOOK.md"
  "docs/2FA_ROLLOUT.md"
  "docs/OPERATIONS.md"
)
for doc in "${docs[@]}"; do
  if [ -f "$doc" ]; then
    echo "  [OK] $doc"
  else
    echo "  [MISSING] $doc"
    exit 1
  fi
done

if [ -z "${STAGING_ADMIN_PASSWORD:-}" ] && [ -z "${SEED_ADMIN_PASSWORD:-}" ]; then
  echo ""
  echo "[staging-readiness] WARN: Set STAGING_ADMIN_PASSWORD before full smoke on staging server."
  echo "[staging-readiness]       Local dev may use SEED_ADMIN_PASSWORD from .env instead."
else
  echo ""
  echo "[staging-readiness] Running smoke test..."
  "$ROOT/scripts/smoke-test.sh"
fi

echo ""
echo "[staging-readiness] PASS — ready for staging deploy + 2-week runbook (manual on server)."
