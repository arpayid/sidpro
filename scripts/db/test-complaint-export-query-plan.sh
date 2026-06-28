#!/usr/bin/env bash
# AUDIT-5: verify the tenant-scoped complaint CSV export plan separately.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
DB_URL="${DATABASE_URL%%\?*}"
PSQL=(psql "$DB_URL" -X -v ON_ERROR_STOP=1)

"${PSQL[@]}" <<'SQL'
INSERT INTO tenants (id, name, code, level, status, created_at, updated_at)
VALUES
  ('audit5-perf-tenant', 'Audit 5 Performance Tenant', 'audit5-perf', 'desa', 'active', now(), now()),
  ('audit5-noise-tenant', 'Audit 5 Noise Tenant', 'audit5-noise', 'desa', 'active', now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO complaints (
  id, tenant_id, title, description, category, priority, status,
  reporter_name, reporter_phone, created_at, updated_at
)
SELECT
  'audit5-perf-complaint-' || n,
  'audit5-perf-tenant',
  'Performance complaint ' || n,
  'Audit 5 performance fixture',
  'service',
  'medium',
  CASE WHEN n % 3 = 0 THEN 'closed' ELSE 'submitted' END,
  'Fixture Reporter',
  '0812' || lpad(n::text, 8, '0'),
  now() - (n || ' minutes')::interval,
  now() - (n || ' minutes')::interval
FROM generate_series(1, 5000) AS n
ON CONFLICT DO NOTHING;

INSERT INTO complaints (
  id, tenant_id, title, description, category, priority, status,
  reporter_name, reporter_phone, created_at, updated_at
)
SELECT
  'audit5-noise-complaint-' || n,
  'audit5-noise-tenant',
  'Noise complaint ' || n,
  'Audit 5 noise fixture',
  'service',
  'medium',
  CASE WHEN n % 3 = 0 THEN 'closed' ELSE 'submitted' END,
  'Noise Reporter',
  '0813' || lpad(n::text, 8, '0'),
  now() - (n || ' minutes')::interval,
  now() - (n || ' minutes')::interval
FROM generate_series(1, 30000) AS n
ON CONFLICT DO NOTHING;

ANALYZE complaints;
SQL

index_name='complaints_tenant_created_at_idx'
index_count="$("${PSQL[@]}" -A -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = '$index_name';")"
if [ "$index_count" != '1' ]; then
  echo "[audit-5-complaint-plan] ERROR: expected index is missing: $index_name" >&2
  exit 1
fi

plan="$("${PSQL[@]}" -A -t -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id, title, category, priority, status, reporter_name, reporter_phone, created_at, updated_at FROM complaints WHERE tenant_id = 'audit5-perf-tenant' ORDER BY created_at DESC")"
PLAN_JSON="$plan" EXPECTED_INDEX="$index_name" node -e '
  const explain = JSON.parse(process.env.PLAN_JSON)[0];
  const indexes = new Set();
  const walk = (node) => {
    if (node["Index Name"]) indexes.add(node["Index Name"]);
    for (const child of node.Plans ?? []) walk(child);
  };
  walk(explain.Plan);
  const evidence = {
    event: "audit_5_query_plan",
    label: "complaint CSV export",
    expectedIndex: process.env.EXPECTED_INDEX,
    indexes: [...indexes],
    planningTimeMs: explain["Planning Time"] ?? null,
    executionTimeMs: explain["Execution Time"] ?? null,
    sharedHitBlocks: explain.Plan["Shared Hit Blocks"] ?? null,
    sharedReadBlocks: explain.Plan["Shared Read Blocks"] ?? null,
  };
  if (!indexes.has(process.env.EXPECTED_INDEX)) {
    console.error(JSON.stringify({ ...evidence, plan: explain.Plan }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(evidence));
'

printf '%s\n' '[audit-5-complaint-plan] PASS: complaint CSV export query-plan evidence verified.'
