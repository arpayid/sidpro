# AUDIT-2 — Critical-Path Test Expectations

**Marker:** `[[AI-CLI|AUDIT-2|IN_PROGRESS|REPO_CI_READY]]`

## Purpose

This document identifies the source-level workflows that must retain regression evidence as the project evolves. It is intentionally a **pass/fail critical-path suite**, not a weighted code-coverage threshold.

Node's experimental coverage report includes executed test source in the denominator; coverage movement caused by test inventory changes is not automatically a product-regression signal. A change that reduces meaningful business-path evidence must instead be explained in the PR and replaced with equivalent or stronger test coverage.

## Required CI Command

```bash
pnpm audit:critical-path
```

The AUDIT-2 workflow retains its output for 30 days as `audit-2-critical-path-log`.

## Included Workflows

| Domain | Evidence | Expected protection |
| --- | --- | --- |
| Authentication/session | `apps/api/test/auth-refresh-token.test.ts` | Refresh rotation/replay and session invalidation behavior. |
| Tenant administration | `apps/api/test/tenants-authorization.test.ts` | Superadmin/settings/delegated provisioning service authorization. |
| Finance ledger | `apps/api/test/budget-realization-ledger.test.ts` | Realization/ledger integrity and protected workflow transitions. |
| Reports/export | `apps/api/test/reports-tenant-isolation.test.ts` | Tenant-scoped reporting and export isolation. |
| Letters/public tracking | `apps/api/test/letters-validation.test.ts` | Malformed public tracking/QR inputs and protected letter workflow boundaries. |
| API input boundary | `apps/api/test/pagination-query-validation.middleware.test.ts` | Bounded page/limit values and preserved defaults. |
| API route access | `apps/api/test/api-route-access-policy.test.ts` | Controller inventory and explicit public/JWT posture. |
| Public mutation abuse | `apps/api/test/public-route-security-policy.test.ts` | Route-specific throttle declaration for public writes. |
| Storage cleanup worker | `apps/worker/test/storage-cleanup.test.ts` | Worker cleanup/retry behavior remains executable. |

## Change Rule

A PR changing an included workflow, its domain service, permission contract, tenant filter, public endpoint, storage behavior, or queue job must either:

1. keep the named test passing and add targeted cases for the changed behavior; or
2. replace the test with stronger equivalent evidence in the same PR, update this manifest, and explain the migration in the AUDIT-2 evidence.

## Coverage Baseline Record

| Package | First baseline line/branch/function | Second baseline line/branch/function | Interpretation |
| --- | --- | --- | --- |
| `@sidpro/api` | 61.48 / 83.75 / 70.80 | 59.74 / 84.31 / 71.13 | Test-source denominator changed after new policy tests; branch/function evidence increased. No global numeric gate is introduced. |
| `@sidpro/web` | 85.98 / 78.75 / 35.29 | 86.03 / 78.75 / 35.29 | Stable baseline. |
| `@sidpro/worker` | 88.69 / 73.79 / 83.04 | 88.69 / 73.79 / 83.04 | Stable baseline. |
| `@sidpro/validators` | 94.58 / 90.00 / 51.16 | 94.67 / 90.00 / 50.00 | Stable within test-inventory variation. |

## Deferred Threshold Decision

A package-specific threshold may be proposed only after:

- at least one additional comparable baseline;
- a reviewed list of excluded/generated/test-only files;
- an agreed treatment for test-source inclusion in Node coverage; and
- a PR review that shows the threshold will not encourage superficial tests.

Until then, the critical-path suite and full coverage artifact are the required controls.
