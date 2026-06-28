# AUDIT-5 — Report and Export Tenant Isolation

**Status:** Tenant-isolation, report query-range regression coverage, and PostgreSQL 17 tenant-selective query-plan evidence are implemented in CI. Historical-data preflight and representative persistent-environment performance validation remain required.

## Scope

This audit covers all current authenticated report, dashboard, and tabular export paths:

| Area | Read or export path | Output |
| --- | --- | --- |
| Reports dashboard | `GET /reports/dashboard` | Dashboard metrics and recent activity |
| Population report | `GET /reports/population` | Aggregated data and civil events |
| Letters report | `GET /reports/letters` | Aggregated data and recent requests |
| Finance report | `GET /reports/finance` | Budget-year data and summary |
| Audit report | `GET /reports/audit` | Tenant audit-log activity |
| Report exports | `/reports/*/export` | XLSX population, letters, and finance reports |
| Population export | `GET /residents/export` | XLSX resident data |
| Family export | `GET /families/export` | XLSX family data |
| Complaint export | `GET /complaints/export` | CSV complaint data |

## Confirmed Controls

1. Protected report and export controllers use JWT authentication and permission authorization. Report exports require both `reports.export` and the applicable report permission; resident, family, and complaint exports require their domain permissions.
2. The inspected services obtain the tenant only through `JwtPayload.tenantId`. No report or export endpoint accepts a client-supplied tenant ID.
3. Every inspected read applies the authenticated tenant to its Prisma `where` condition. Finance uses the composite `tenantId_year` unique key.
4. Population, family, report, and complaint exports write an audit event with the same authenticated tenant ID.
5. `apps/api/test/reports-tenant-isolation.test.ts` exercises the actual services with a Prisma-call recorder. It asserts tenant scope for dashboard/report queries, XLSX exports, resident/family XLSX exports, complaint CSV export, composite finance lookup, missing-tenant rejection, and export audit events.
6. Finance report and finance-export `year` accept only integer years from 1900 through 2200. Audit-report `days` accepts only integer windows from 1 through 365 and defaults to 30. Invalid values are rejected before a report service can issue a database query.
7. Workflow `AUDIT-5 Query Plan Evidence` loads a tenant-selective PostgreSQL 17 fixture and asserts executed query plans use the indexes added for resident, civil-event, letter, and audit report/export paths.

## Findings

### P1/P2: No confirmed cross-tenant report or export read

The current services use the authenticated tenant as their query boundary. The regression test protects this behavior from accidental future removal.

### P2 Resolved: Explicit report query ranges

The former `parseInt` handling for report `year` and audit `days` is replaced by shared Zod schemas. This rejects partial numbers such as `2026abc`, fractional values, empty values, and values outside the documented bounds.

### P2 Resolved at Repository Level: Tenant-scoped report/export index evidence

Migration `20260628001100_add_audit_5_report_export_indexes` and its dedicated workflow verify that executed PostgreSQL 17 plans use the expected indexes against a 5,000-row tenant fixture plus 30,000-row noise tenant. This is evidence of planner selection under the fixture; it is not a production SLA claim.

## Remaining Environment Validation

1. Run the existing database tenant-link preflights against any historical staging or production dataset before enabling migrations on live data.
2. Capture and retain representative-dataset `EXPLAIN (ANALYZE, BUFFERS)` output, including row count, execution time, and buffer statistics.
3. Measure full XLSX/CSV export duration and memory usage against agreed volume targets.
4. Re-evaluate new report/export endpoints against this checklist before release.

## Validation

CI must pass the required checks:

```text
CI / validate
CI / production-smoke
Security Audit / Security Gate
Tenant Link Integrity / tenant-link-integration
AUDIT-5 Query Plan Evidence / query-plan-evidence
```

The regression tests are included in the API `pnpm test` command through the existing `test/*.test.ts` pattern.

## Register Reference

Current cross-audit status is maintained in [Audit Master Register](AUDIT_MASTER_REGISTER.md) and summarized in the [Audit Roadmap](../ROADMAP.md). See also [Report and Export Query-Plan Evidence](AUDIT-5-REPORT-EXPORT-PERFORMANCE-EVIDENCE.md).
