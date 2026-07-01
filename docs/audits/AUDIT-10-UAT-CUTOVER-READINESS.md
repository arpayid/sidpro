# AUDIT-10 — UAT and Cutover Readiness

**Marker:** `[[AI-CLI|AUDIT-10|EVIDENCE_PARTIAL|HUMAN_UAT_REQUIRED]]`

**Status:** `Evidence Partial` — module readiness, handover prerequisites, production release guidance, and audit runbooks are versioned. Role-based UAT, operator training, cutover rehearsal, owner acceptance, and production sign-off remain required.

## Scope

AUDIT-10 evaluates whether SIDPRO is ready to move from technical validation to controlled operational use:

- UAT roles, scenarios, acceptance criteria, and defect triage;
- operator/admin training and handover evidence;
- cutover prerequisites, ownership, communications, and rollback authority;
- acceptance of residual risks from AUDIT-1 through AUDIT-9.

It does not convert a module from `Ready with Notes` to unconditional go-live status without recorded environment evidence and human approval.

## UAT Participants and Fixture Rules

Use staging-like infrastructure with non-production tenants and accounts.

| Participant | Primary purpose | Boundary |
| --- | --- | --- |
| Project owner / approver | Accepts scope, residual risk, cutover, and rollback decision. | Must not approve unknown test results. |
| Village administrator | Validates admin navigation, permission boundaries, CMS, dashboard, reports, and audit-log visibility. | Uses fixture tenant and least-privilege role. |
| Service operator | Validates letter/complaint workflows, status transitions, public tracking, file handling, and notifications. | Uses disposable fixture records and files. |
| Public/warga representative | Validates public portal, service discoverability, complaint/letter tracking, and mobile usability. | No real citizen data, NIK, KK, or production contact data. |
| Technical operator | Validates release, backup/restore, monitoring, incident, and rollback handoff. | Evidence must be sanitized. |

## Acceptance Scenario Matrix

| Area | Minimum acceptance scenarios | Required evidence |
| --- | --- | --- |
| Authentication and access | Login, 2FA where enabled, refresh/reload, logout, denied direct admin route, role-specific navigation. | Result, role used, expected/actual, sanitized screenshot or trace. |
| Public portal | Mobile and desktop navigation, public content, service discovery, error/empty state, accessible primary controls. | Device/viewport, browser, result, defect IDs. |
| Population/family | Role-limited list/read/update workflow, masking/export boundary, cross-tenant denial with fixtures. | Expected authorization result and audit-log confirmation. |
| Letters | Create/request, verification/tracking, status transition, PDF/output/storage behavior, failure recovery. | Fixture reference, audit trail, public verification result. |
| Complaints | Public submission/tracking, attachment constraint, operator response/status update, notification behavior where configured. | Fixture ticket, audit trail, queue/notification result. |
| CMS and transparency | Create/edit/publish draft fixture, agenda/galeri path, public rendering, permission denial. | Before/after, role, public result. |
| Reports/exports | Filter, bounded pagination, authorized export, denial for unauthorized role, file cleanup policy. | Export result, role, fixture scope, audit event. |
| Operations | Backup manifest, restore-drill status, health/smoke, service restart, incident/rollback contact. | Trace IDs from AUDIT-7 and AUDIT-8. |

## Defect and Sign-off Rules

- Classify any finding that permits cross-tenant access, bypasses role controls, loses data, exposes credentials/PII, or breaks core login as release-blocking until resolved and retested.
- Do not sign off with unverified staging claims. Mark blocked scenarios explicitly with the missing environment, fixture, or owner decision.
- Every accepted residual risk must name an owner, rationale, target review date, and rollback/cutover consequence.
- Screenshots, recordings, exported files, and logs must be sanitized before being committed or attached to a PR.

## Cutover Checklist

1. Confirm approved release commit, maintenance window, change owner, rollback owner, and communication path.
2. Confirm AUDIT-4 session/security gate, AUDIT-6 browser/accessibility evidence, AUDIT-7 delivery evidence, and AUDIT-8 restore drill state.
3. Confirm production configuration, domain/TLS, first admin account, backup location, storage policy, and SMTP/notification policy are documented outside the repository.
4. Run final non-destructive smoke on the release candidate.
5. Execute cutover only after owner approval; record release trace, start/end time, user-visible impact, and result.
6. After cutover, monitor health, auth errors, queue failures, storage failures, and user-reported defects for the agreed observation window.
7. Record final sign-off or rollback decision with unresolved risks.

## Minimum Sign-off Record

```md
Trace ID:
Release commit:
Environment:
UAT participant roles:
Scenario pass/fail summary:
Release-blocking defects: none / list
Accepted residual risks and owners:
AUDIT-7/8/4/6 trace references:
Cutover decision:
Project owner approval:
Date/time:
Secrets/PII: None recorded
```

## Closure Criteria

AUDIT-10 may move to `Closed` only after agreed UAT scenarios pass or have explicitly accepted risk, operator handover/cutover rehearsal is evidenced, required audit dependencies are reconciled, and an authorized project owner records the go-live decision.

## Related Documents

- [Client Handover Readiness](../CLIENT_HANDOVER_READINESS.md)
- [Production Release Runbook](../PRODUCTION_RELEASE.md)
- [AUDIT-6 Frontend](AUDIT-6-FRONTEND.md)
- [AUDIT-7 DevOps and Delivery](AUDIT-7-DEVOPS-DELIVERY.md)
- [AUDIT-8 Backup and Recovery](AUDIT-8-BACKUP-RECOVERY.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
