#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:4000/api/v1/health}"
WEB_URL="${WEB_URL:-http://localhost:3000}"

check_endpoint() {
  local name="$1"
  local url="$2"
  local status
  status=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$status" = "200" ]; then
    echo "[healthcheck] $name: OK ($status)"
    return 0
  else
    echo "[healthcheck] $name: FAIL ($status)"
    return 1
  fi
}

FAILED=0

check_endpoint "API" "$API_URL" || FAILED=1
check_endpoint "Web" "$WEB_URL" || FAILED=1

if [ -n "${DATABASE_URL:-}" ]; then
  if pg_isready -d "$DATABASE_URL" > /dev/null 2>&1; then
    echo "[healthcheck] Database: OK"
  else
    echo "[healthcheck] Database: FAIL"
    FAILED=1
  fi
fi

if [ -n "${REDIS_URL:-}" ]; then
  if redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; then
    echo "[healthcheck] Redis: OK"
  else
    echo "[healthcheck] Redis: FAIL"
    FAILED=1
  fi
fi

exit $FAILED
