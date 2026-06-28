# AUDIT-5 — Report and Export Tenant Isolation

**Status:** Implemented regression coverage; pending CI validation.

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

## Findings

### P1/P2: No confirmed cross-tenant report or export read

The current services use the authenticated tenant as their query boundary. The regression test protects this behavior from accidental future removal.

### P2 Follow-up: Validate report query ranges explicitly

`year` and `days` are currently parsed in the reports controller using `parseInt`. A separate hardening PR should reject invalid values, constrain audit-report windows, and define the allowed finance-year range. This is input-validation hardening; it is not a confirmed tenant-isolation bypass.

## Remaining AUDIT-5 Work

1. Capture production-like `EXPLAIN (ANALYZE, BUFFERS)` evidence for high-volume tenant-scoped report and export queries before production rollout.
2. Run the existing database tenant-link preflights against any historical staging or production dataset before enabling migrations on live data.
3. Re-evaluate new report/export endpoints against this checklist before release.

## Validation

CI must pass the required checks:

```text
CI / validate
CI / production-smoke
Security Audit / Security Gate
Tenant Link Integrity / tenant-link-integration
```

The regression test is included in the API `pnpm test` command through the existing `test/*.test.ts` pattern.
