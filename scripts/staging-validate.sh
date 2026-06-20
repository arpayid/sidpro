#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[staging-validate] Running local validation suite..."

pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate

if command -v docker >/dev/null 2>&1; then
  docker compose config >/dev/null
  echo "[staging-validate] docker compose config OK"
fi

if [ -f scripts/healthcheck.sh ]; then
  bash scripts/healthcheck.sh || echo "[staging-validate] WARN: healthcheck skipped or API not running"
fi

echo "[staging-validate] PASS — ready for staging deploy (run smoke-test against live API separately)"
