# AUDIT-5 — Report and Export Query-Plan Evidence

## Purpose

This document records repository-level evidence for the tenant-scoped report and export queries that can become expensive as data grows. It does not claim a production latency or capacity result.

## Indexes Added

Migration `20260628001100_add_audit_5_report_export_indexes` adds:

| Index | Query shape protected |
| --- | --- |
| `residents_tenant_active_full_name_idx` | Resident XLSX export: active rows for one tenant ordered by `full_name`. |
| `civil_events_tenant_event_date_idx` | Population report/export: one tenant ordered by newest `event_date`. |
| `letter_requests_tenant_submitted_at_idx` | Letter report/export: one tenant ordered by newest `submitted_at`. |
| `audit_logs_tenant_created_at_idx` | Audit report: one tenant with a date window ordered by newest activity. |
| `complaints_tenant_created_at_idx` | Complaint CSV export and tenant-scoped complaint list ordered by newest `created_at`. |

## CI Evidence Method

Workflow **AUDIT-5 Query Plan Evidence** runs against PostgreSQL 17 after all Prisma migrations and seed data are applied. Its fixtures create:

- 5,000 rows for the tenant under test;
- 30,000 equivalent rows for a separate noise tenant;
- residents, civil events, letter requests, audit logs, and complaints that match current service query shapes.

For each critical query the scripts:

1. confirm the expected PostgreSQL index exists;
2. run `ANALYZE` on the fixture tables;
3. run `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`;
4. fail when the expected index does not appear in the executed plan.

The coverage includes resident XLSX export, population civil-event export, letter XLSX export, recent audit activity, and complaint CSV export.

## What This Proves

- Migration-created indexes exist in PostgreSQL 17.
- Under a tenant-selective high-volume fixture, the PostgreSQL planner chooses the intended index for the tested query shapes.
- A future schema/query change that removes the index from an executed CI plan fails the audit workflow.

## What This Does Not Prove

- Production response-time service-level objectives.
- Export memory use for a real tenant with a larger dataset or wider rows.
- Storage, Redis, network, or API serialization throughput under concurrent load.
- The plan against historical production data, whose distribution may differ from the CI fixture.

## Environment Validation Still Required

When a persistent staging or production database exists:

1. run the same `EXPLAIN (ANALYZE, BUFFERS)` queries against representative data;
2. record the plan, row counts, planning time, execution time, and buffer statistics in the release evidence;
3. check migration lock behavior before applying indexes to a large existing database;
4. measure full XLSX/CSV export memory and duration with agreed volume targets.

The release gate still requires backup/restore verification before migration. For a large existing database, schedule index creation in a low-load window and record the outcome.
