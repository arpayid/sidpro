#!/usr/bin/env bash
# Shared helpers for the production Docker Compose release gate.
set -euo pipefail

SIDPRO_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIDPRO_ROOT="$(cd "$SIDPRO_LIB_DIR/../.." && pwd)"

sidpro_init() {
  SIDPRO_ENV_FILE="${SIDPRO_ENV_FILE:-$SIDPRO_ROOT/.env}"
  SIDPRO_COMPOSE_FILE="${SIDPRO_COMPOSE_FILE:-$SIDPRO_ROOT/docker-compose.prod.yml}"

  while [ "$#" -gt 0 ]; do
    case "$1" in
      --env-file)
        SIDPRO_ENV_FILE="$2"
        shift 2
        ;;
      --compose-file)
        SIDPRO_COMPOSE_FILE="$2"
        shift 2
        ;;
      *)
        echo "[production-release] ERROR: unsupported argument: $1" >&2
        exit 2
        ;;
    esac
  done

  if [ ! -f "$SIDPRO_ENV_FILE" ]; then
    echo "[production-release] ERROR: environment file not found: $SIDPRO_ENV_FILE" >&2
    exit 1
  fi
  if [ ! -f "$SIDPRO_COMPOSE_FILE" ]; then
    echo "[production-release] ERROR: Compose file not found: $SIDPRO_COMPOSE_FILE" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$SIDPRO_ENV_FILE"
  set +a

  : "${POSTGRES_USER:?POSTGRES_USER is required}"
  : "${POSTGRES_DB:?POSTGRES_DB is required}"
  : "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
  : "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
  : "${MINIO_BUCKET:?MINIO_BUCKET is required}"

  export SIDPRO_ENV_FILE
  export SIDPRO_COMPOSE_ENV_FILE="$SIDPRO_ENV_FILE"
  SIDPRO_COMPOSE=(docker compose --env-file "$SIDPRO_ENV_FILE" -f "$SIDPRO_COMPOSE_FILE")
}

sidpro_compose() {
  "${SIDPRO_COMPOSE[@]}" "$@"
}

sidpro_require_commands() {
  local command_name
  for command_name in docker gzip sha256sum tar; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "[production-release] ERROR: required command not found: $command_name" >&2
      exit 1
    fi
  done

  if ! docker compose version >/dev/null 2>&1; then
    echo "[production-release] ERROR: Docker Compose v2 is required" >&2
    exit 1
  fi
}

sidpro_wait_for_service() {
  local service="$1"
  local timeout_seconds="${2:-180}"
  local container_id
  local state
  local elapsed=0

  container_id="$(sidpro_compose ps -q "$service")"
  if [ -z "$container_id" ]; then
    echo "[production-release] ERROR: Compose service is not running: $service" >&2
    exit 1
  fi

  while [ "$elapsed" -lt "$timeout_seconds" ]; do
    state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
    case "$state" in
      healthy|running)
        echo "[production-release] $service is $state"
        return 0
        ;;
      unhealthy|exited|dead)
        echo "[production-release] ERROR: $service is $state" >&2
        sidpro_compose logs --tail=120 "$service" >&2 || true
        exit 1
        ;;
    esac
    sleep 2
    elapsed=$((elapsed + 2))
  done

  echo "[production-release] ERROR: timed out waiting for $service" >&2
  sidpro_compose logs --tail=120 "$service" >&2 || true
  exit 1
}

sidpro_psql() {
  sidpro_compose exec -T postgres sh -ec 'exec psql -X -A -t -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

sidpro_assert_sql_file_empty() {
  local label="$1"
  local sql_file="$2"
  local output

  if [ ! -f "$sql_file" ]; then
    echo "[production-release] ERROR: SQL verification file not found: $sql_file" >&2
    exit 1
  fi

  output="$(sidpro_psql < "$sql_file")"
  if [ -n "${output//[[:space:]]/}" ]; then
    echo "[production-release] ERROR: $label returned integrity violations:" >&2
    printf '%s\n' "$output" >&2
    exit 1
  fi
}

sidpro_current_revision() {
  if command -v git >/dev/null 2>&1 && git -C "$SIDPRO_ROOT" rev-parse --verify HEAD >/dev/null 2>&1; then
    git -C "$SIDPRO_ROOT" rev-parse --short=12 HEAD
  else
    printf '%s' 'unknown'
  fi
}
