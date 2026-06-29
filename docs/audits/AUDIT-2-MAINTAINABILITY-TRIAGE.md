# AUDIT-2 — Maintainability Triage Record

**Marker:** `[[AI-CLI|AUDIT-2|VALIDATION_PENDING|REPO_CI_READY]]`

## Purpose

This record resolves issue #107's first-pass triage of the maintainability baseline. The inventory is a decision aid, not a mandate to split every large source file. Any behavior-preserving refactor must retain the domain's existing regression evidence and is tracked in #111.

## Baseline Context

The first baseline from PR #106 identified 292 source files and 28,307 code lines. It found no explicit `any`, TypeScript/ESLint suppressions, debugger statements, TODO/FIXME markers, or exact duplicate file groups. It reported 22 console calls and a small group of large/lexical-control-flow candidates.

This PR upgrades the reporter to schema version 2 so the artifact exposes **per-file signal counts**, making future console and suppression review reproducible rather than relying on a global count.

## Hotspot Classification

| Candidate | Classification | Decision and guardrail |
| --- | --- | --- |
| `apps/api/src/modules/letters/letters.service.ts` | Accepted orchestration; extraction candidate | Letter lifecycle joins numbering, transitions, PDF/output, audit, tenant scope, and storage compensation. Do not split mechanically. #111 may extract PDF/template/output seams only while letter transition and compensation tests stay green. |
| `apps/api/src/core/auth/auth.service.ts` | Accepted security orchestration; extraction candidate | Auth combines credential validation, refresh rotation/replay, 2FA, audit, and session policy. Session transport has been separated at the controller/cookie boundary in PR #115. Further extraction must preserve refresh/replay tests. |
| `apps/api/src/modules/complaints/complaints.service.ts` | Accepted orchestration; extraction candidate | Public tracking, attachment handling, workflow transitions, and tenant scope have shared integrity boundaries. #111 may extract upload/public-status helpers only with tenant/file regression coverage. |
| `apps/api/src/core/tenants/tenants.service.ts` | Accepted orchestration | Tenant provisioning, hierarchy, role scope, and audit behavior are coupled. Candidate query/spec helpers may be extracted under #111; no behavior change is approved here. |
| `apps/api/src/modules/population/population.service.ts` | Accepted orchestration | Population/family/territory workflows and tenant guards need domain review before decomposition. Candidate filter/export helpers remain in #111. |
| Admin route pages | View orchestration; extraction candidate | Large pages combine filters, forms, queries, tables, and permission UI. #111 may extract presentational/form/filter components only when AUDIT-6 route/accessibility policy remains green. |

## Console Signal Classification

| Source area | Classification | Treatment |
| --- | --- | --- |
| API bootstrap (`apps/api/src/main.ts`) | Structured runtime bootstrap logging | Accepted. The message includes only the bind port; no secret/token data. |
| Worker queue lifecycle (`apps/worker/src/index.ts`) | Structured operational logging | Accepted. Queue health/failure events are required for runtime observability; JSON events and bounded error messages are retained. |
| Admin error boundary (`apps/web/src/app/(admin)/error.tsx`) | Sanitized browser diagnostic | Accepted for now. It logs only the Next digest, not raw error detail. Browser telemetry integration should replace direct console reporting when observability is introduced. |
| Console email adapter (`apps/worker/src/email/console.adapter.ts`) | Development-only expected output | **Remediated in this PR:** console transport is not selected in production. Without SMTP, the worker switches to a no-delivery adapter and emits only a sanitized `email_delivery_disabled` event; recipient, subject, and body are never logged. Explicit `EMAIL_TRANSPORT=disabled` is supported for controlled smoke/maintenance environments. |
| Scripts outside the source baseline | Expected CLI output | Out of the maintainability source-root scope; retain only as operational script output and review separately when script policies are introduced. |

## Signals With No Current Source Findings

- explicit `any`
- TypeScript suppressions
- ESLint suppressions
- `debugger` statements
- TODO/FIXME/HACK/XXX markers
- exact duplicate file groups

A future non-zero result must follow [Maintainability Baseline and Triage Policy](AUDIT-2-MAINTAINABILITY-POLICY.md) before merge or receive an owned exception/follow-up.

## Follow-up

- #111 owns optional domain-safe refactor proposals. It is not a mechanical file-size reduction backlog.
- The next weekly/PR artifact must be compared with the first baseline before any threshold is proposed.
- No global complexity/duplication threshold is introduced by this triage.

## Evidence

- `pnpm audit:maintainability-baseline`
- `audit-2-maintainability-baseline` workflow artifact (30-day retention)
- `apps/worker/test/email-factory.test.ts`
- [Maintainability Baseline and Triage Policy](AUDIT-2-MAINTAINABILITY-POLICY.md)
