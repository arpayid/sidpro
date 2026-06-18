#!/usr/bin/env bash
# Database backup wrapper (plan.m NT.2.1). Delegates to scripts/backup.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/backup.sh" "$@"
