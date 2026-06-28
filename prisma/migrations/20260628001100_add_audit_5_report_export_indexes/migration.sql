-- AUDIT-5 / AUDIT-9: index tenant-scoped report and export read paths.
--
-- These are intentionally PostgreSQL-specific indexes. The service queries filter
-- by tenant and either sort by a recent timestamp or export active residents in
-- name order. Prisma schema relations are unchanged because no generated client
-- type changes are required.
--
-- For a large existing production database, schedule this migration in a low-load
-- window. The current repository release gate verifies a backup before migration.

CREATE INDEX "residents_tenant_active_full_name_idx"
  ON "residents" ("tenant_id", "full_name")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "civil_events_tenant_event_date_idx"
  ON "civil_events" ("tenant_id", "event_date" DESC);

CREATE INDEX "letter_requests_tenant_submitted_at_idx"
  ON "letter_requests" ("tenant_id", "submitted_at" DESC);

CREATE INDEX "audit_logs_tenant_created_at_idx"
  ON "audit_logs" ("tenant_id", "created_at" DESC);

CREATE INDEX "complaints_tenant_created_at_idx"
  ON "complaints" ("tenant_id", "created_at" DESC);
