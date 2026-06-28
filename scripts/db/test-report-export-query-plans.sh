#!/usr/bin/env bash
# AUDIT-5: production-like query-plan evidence for tenant-scoped reports and exports.
#
# Requires DATABASE_URL and a database with all Prisma migrations applied.
# The fixture creates one high-volume tenant and a larger noise tenant so the
# PostgreSQL planner must use tenant/order indexes instead of scanning all rows.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
# Prisma appends ?schema=public to the URL; libpq/psql does not use that parameter.
DB_URL="${DATABASE_URL%%\?*}"
PSQL=(psql "$DB_URL" -X -v ON_ERROR_STOP=1)

printf '%s\n' '[audit-5-query-plans] Loading tenant-scoped report/export fixture...'
"${PSQL[@]}" <<'SQL'
INSERT INTO tenants (id, name, code, level, status, created_at, updated_at)
VALUES
  ('audit5-perf-tenant', 'Audit 5 Performance Tenant', 'audit5-perf', 'desa', 'active', now(), now()),
  ('audit5-noise-tenant', 'Audit 5 Noise Tenant', 'audit5-noise', 'desa', 'active', now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO residents (
  id, tenant_id, nik, full_name, gender, birth_place, birth_date,
  resident_status, created_at, updated_at
)
SELECT
  'audit5-perf-resident-' || n,
  'audit5-perf-tenant',
  lpad(n::text, 16, '0'),
  'Performance Resident ' || lpad(n::text, 6, '0'),
  CASE WHEN n % 2 = 0 THEN 'male' ELSE 'female' END,
  'Audit Village',
  DATE '1980-01-01' + (n % 12000),
  'permanent',
  now(),
  now()
FROM generate_series(1, 5000) AS n
ON CONFLICT DO NOTHING;

INSERT INTO residents (
  id, tenant_id, nik, full_name, gender, birth_place, birth_date,
  resident_status, created_at, updated_at
)
SELECT
  'audit5-noise-resident-' || n,
  'audit5-noise-tenant',
  lpad((500000 + n)::text, 16, '0'),
  'Noise Resident ' || lpad(n::text, 6, '0'),
  CASE WHEN n % 2 = 0 THEN 'male' ELSE 'female' END,
  'Noise Village',
  DATE '1980-01-01' + (n % 12000),
  'permanent',
  now(),
  now()
FROM generate_series(1, 30000) AS n
ON CONFLICT DO NOTHING;

INSERT INTO letter_types (id, tenant_id, code, name, is_active, created_at, updated_at)
VALUES
  ('audit5-perf-letter-type', 'audit5-perf-tenant', 'AUDIT5PERF', 'Audit 5 Performance Letter', true, now(), now()),
  ('audit5-noise-letter-type', 'audit5-noise-tenant', 'AUDIT5NOISE', 'Audit 5 Noise Letter', true, now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO civil_events (
  id, tenant_id, resident_id, event_type, event_date, notes, created_at
)
SELECT
  'audit5-perf-event-' || n,
  'audit5-perf-tenant',
  'audit5-perf-resident-' || n,
  CASE WHEN n % 2 = 0 THEN 'moved' ELSE 'deceased' END,
  (now() - (n || ' minutes')::interval)::date,
  'Audit 5 performance fixture',
  now() - (n || ' minutes')::interval
FROM generate_series(1, 5000) AS n
ON CONFLICT DO NOTHING;

INSERT INTO civil_events (
  id, tenant_id, resident_id, event_type, event_date, notes, created_at
)
SELECT
  'audit5-noise-event-' || n,
  'audit5-noise-tenant',
  'audit5-noise-resident-' || n,
  CASE WHEN n % 2 = 0 THEN 'moved' ELSE 'deceased' END,
  (now() - (n || ' minutes')::interval)::date,
  'Audit 5 noise fixture',
  now() - (n || ' minutes')::interval
FROM generate_series(1, 30000) AS n
ON CONFLICT DO NOTHING;

INSERT INTO letter_requests (
  id, tenant_id, resident_id, letter_type_id, status, purpose,
  submitted_at, created_at, updated_at
)
SELECT
  'audit5-perf-letter-' || n,
  'audit5-perf-tenant',
  'audit5-perf-resident-' || n,
  'audit5-perf-letter-type',
  CASE WHEN n % 3 = 0 THEN 'approved' ELSE 'submitted' END,
  'Audit 5 performance request',
  now() - (n || ' minutes')::interval,
  now() - (n || ' minutes')::interval,
  now() - (n || ' minutes')::interval
FROM generate_series(1, 5000) AS n
ON CONFLICT DO NOTHING;

INSERT INTO letter_requests (
  id, tenant_id, resident_id, letter_type_id, status, purpose,
  submitted_at, created_at, updated_at
)
SELECT
  'audit5-noise-letter-' || n,
  'audit5-noise-tenant',
  'audit5-noise-resident-' || n,
  'audit5-noise-letter-type',
  CASE WHEN n % 3 = 0 THEN 'approved' ELSE 'submitted' END,
  'Audit 5 noise request',
  now() - (n || ' minutes')::interval,
  now() - (n || ' minutes')::interval,
  now() - (n || ' minutes')::interval
FROM generate_series(1, 30000) AS n
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (
  id, tenant_id, action, module, entity_type, entity_id, metadata, created_at
)
SELECT
  'audit5-perf-log-' || n,
  'audit5-perf-tenant',
  CASE WHEN n % 2 = 0 THEN 'export' ELSE 'read' END,
  CASE WHEN n % 3 = 0 THEN 'reports' ELSE 'population' END,
  'audit_fixture',
  'audit5-perf-resident-' || n,
  '{"fixture":"audit-5"}'::jsonb,
  now() - (n || ' minutes')::interval
FROM generate_series(1, 5000) AS n
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (
  id, tenant_id, action, module, entity_type, entity_id, metadata, created_at
)
SELECT
  'audit5-noise-log-' || n,
  'audit5-noise-tenant',
  CASE WHEN n % 2 = 0 THEN 'export' ELSE 'read' END,
  CASE WHEN n % 3 = 0 THEN 'reports' ELSE 'population' END,
  'audit_fixture',
  'audit5-noise-resident-' || n,
  '{"fixture":"audit-5"}'::jsonb,
  now() - (n || ' minutes')::interval
FROM generate_series(1, 30000) AS n
ON CONFLICT DO NOTHING;

ANALYZE residents;
ANALYZE civil_events;
ANALYZE letter_requests;
ANALYZE audit_logs;
SQL

assert_index_exists() {
  local index_name="$1"
  local count
  count="$("${PSQL[@]}" -A -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname = '$index_name';")"
  if [ "$count" != '1' ]; then
    echo "[audit-5-query-plans] ERROR: expected index is missing: $index_name" >&2
    exit 1
  fi
}

assert_plan_uses_index() {
  local label="$1"
  local expected_index="$2"
  local sql="$3"
  local plan

  plan="$("${PSQL[@]}" -A -t -c "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) $sql")"

  PLAN_JSON="$plan" PLAN_LABEL="$label" EXPECTED_INDEX="$expected_index" node -e '
    const explain = JSON.parse(process.env.PLAN_JSON)[0];
    const plan = explain.Plan;
    const indexes = new Set();
    const nodeTypes = new Set();
    const walk = (node) => {
      nodeTypes.add(node["Node Type"]);
      if (node["Index Name"]) indexes.add(node["Index Name"]);
      for (const child of node.Plans ?? []) walk(child);
    };
    walk(plan);
    const evidence = {
      event: "audit_5_query_plan",
      label: process.env.PLAN_LABEL,
      expectedIndex: process.env.EXPECTED_INDEX,
      indexes: [...indexes],
      nodeTypes: [...nodeTypes],
      planningTimeMs: explain["Planning Time"] ?? null,
      executionTimeMs: explain["Execution Time"] ?? null,
      sharedHitBlocks: plan["Shared Hit Blocks"] ?? null,
      sharedReadBlocks: plan["Shared Read Blocks"] ?? null,
    };
    if (!indexes.has(process.env.EXPECTED_INDEX)) {
      console.error(`[audit-5-query-plans] ERROR: ${process.env.PLAN_LABEL} did not use ${process.env.EXPECTED_INDEX}`);
      console.error(JSON.stringify({ ...evidence, plan }, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify(evidence));
  '
}

for index_name in \
  residents_tenant_active_full_name_idx \
  civil_events_tenant_event_date_idx \
  letter_requests_tenant_submitted_at_idx \
  audit_logs_tenant_created_at_idx \
  complaints_tenant_created_at_idx; do
  assert_index_exists "$index_name"
done

assert_plan_uses_index \
  'resident XLSX export' \
  'residents_tenant_active_full_name_idx' \
  "SELECT id, nik, full_name, gender, birth_place, birth_date, resident_status FROM residents WHERE tenant_id = 'audit5-perf-tenant' AND deleted_at IS NULL ORDER BY full_name ASC"

assert_plan_uses_index \
  'population report civil-event export' \
  'civil_events_tenant_event_date_idx' \
  "SELECT ce.id, ce.event_date, ce.event_type, r.full_name FROM civil_events ce LEFT JOIN residents r ON r.id = ce.resident_id WHERE ce.tenant_id = 'audit5-perf-tenant' ORDER BY ce.event_date DESC"

assert_plan_uses_index \
  'letter report XLSX export' \
  'letter_requests_tenant_submitted_at_idx' \
  "SELECT lr.id, lr.submitted_at, lr.status, lt.name, r.full_name FROM letter_requests lr JOIN letter_types lt ON lt.id = lr.letter_type_id LEFT JOIN residents r ON r.id = lr.resident_id WHERE lr.tenant_id = 'audit5-perf-tenant' ORDER BY lr.submitted_at DESC"

assert_plan_uses_index \
  'audit report recent activity' \
  'audit_logs_tenant_created_at_idx' \
  "SELECT id, module, action, created_at FROM audit_logs WHERE tenant_id = 'audit5-perf-tenant' AND created_at >= now() - interval '30 days' ORDER BY created_at DESC LIMIT 20"

printf '%s\n' '[audit-5-query-plans] PASS: tenant report/export query-plan evidence verified.'
