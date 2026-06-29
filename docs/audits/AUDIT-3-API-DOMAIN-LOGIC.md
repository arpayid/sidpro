# AUDIT-3 — API dan Domain Logic

**Marker:** `[[AI-CLI|AUDIT-3|IN_PROGRESS|REPO_CI_READY]]`

**Status:** `In Progress` — inventory source API sudah dibuat, kontrol akses dan validasi utama telah direview, dan regression gate controller access ditambahkan. Audit belum `Closed`: pagination/query policy perlu diremediasi, contract per-endpoint belum seluruhnya dimodelkan, dan validasi integration pada environment persisten belum ada.

## Scope

AUDIT-3 menilai kontrak dan perilaku source-level API berikut:

1. controller/endpoint inventory, public-versus-authenticated access, JWT, RBAC, dan tenant scope;
2. input/query/parameter validation serta error semantics;
3. domain invariants pada workflow berisiko tinggi: authentication, tenant provisioning, resident/family lifecycle, finance ledger, letter workflow, reports/export, storage, dan public tracking;
4. audit logging, idempotency/replay controls, dan regression-test evidence;
5. kebijakan yang dapat diregresikan melalui CI.

Audit ini tidak mengklaim latency, production routing/proxy trust, deployed identity-provider behavior, cross-service queue execution, atau staging/production validation.

## Evidence Boundary — 29 June 2026

**Source revision reviewed:** `540b15bc161f96007c578a3a5edfa88fc2b4f632` (PR #101 merge commit), plus the AUDIT-3 source changes in this PR.

### Baseline controls observed

| Control | Evidence | Assessment |
| --- | --- | --- |
| API prefix and request validation | `main.ts` configures `/api/v1`, global `ValidationPipe`, `whitelist`, `forbidNonWhitelisted`, and transformed payloads. | Baseline framework validation is active. |
| Global abuse control | `AppModule` registers a default throttler of 100 requests per 60 seconds. | Baseline only; public route-specific policy still needs separate security review. |
| Explicit auth guard | `JwtAuthGuard` honors `@Public()` and otherwise requires the Passport JWT strategy. | Controllers must opt in because the JWT guard is not registered globally. |
| Permission guard | `PermissionsGuard` supports any-of and all-of permission decorators. | Guard returns true without permission metadata; route/service conventions are therefore security-critical. |
| Domain validation | High-risk services use `parseWithZod` schemas for users, tenants, CMS, finance, letters, population/family, assets, territories, social assistance, civil events, BUMDes, files, and settings. | Strong but not yet exhaustively mapped per endpoint. |
| Tenant enforcement | High-risk services resolve `user.tenantId`, query tenant-scoped records, and return not-found/forbidden outcomes on cross-tenant access. | Confirmed in reviewed CMS, finance, tenant, report/export, and letter workflows; AUDIT-5 remains source of database/runtime tenant-integrity closure. |

## Controller Inventory

The repository contains **26** `*.controller.ts` files under `apps/api/src`. The dedicated CI regression test fixes this count intentionally: adding/removing a controller requires inventory and policy review in the same PR.

| Area | Controllers reviewed | Access posture / high-risk note |
| --- | --- | --- |
| Platform and identity | `health`, `auth`, `users`, `roles`, `permissions`, `tenants`, `settings`, `notifications`, `audit-logs`, `files` | Health and selected auth flows are public; admin/identity operations require JWT and/or service-level authorization. |
| Core population lifecycle | `population`, `families`, `territories`, `civil-events` | Authenticated permissioned workflows; tenant scoped by domain services. |
| Village operations | `village-profile`, `cms`, `social-assistance`, `assets`, `development`, `bumdes` | Public read endpoints are explicitly marked; mutations use guards/permissions and domain validation. |
| Finance, reporting, and letters | `finance`, `reports`, `letters` | Finance/report exports require permissions; letters include public QR and tracking flows with dedicated validation. |
| Public interaction | `public`, `assistant`, `complaints` | Public routes are explicitly marked; complaint/letter tracking and assistant routes need continued rate-limit and payload-size review under AUDIT-4. |

### Public route inventory

The public source surface is intentionally limited to health, authentication/refresh/2FA enrollment flows, public map/FAQ/assistant prompts, public CMS/village/development/finance transparency reads, letter QR/track workflows, and complaint public flows. Public route behavior is not inferred merely from a controller name: reviewed routes use `@Public()` explicitly.

## Workflow Review

### Authentication and authorization

- `AuthController` uses explicit `@Public()` only for login, refresh, and two-factor login/enrollment steps; self-service 2FA, logout, and `me` use `JwtAuthGuard`.
- Role, user, permission, report/export, finance, CMS, population, family, and letter administration routes use `JwtAuthGuard`, `PermissionsGuard`, and relevant permission decorators.
- Tenant administration includes service-level checks (`assertAccess` / `assertProvisionAccess`) because some decisions depend on superadmin role, settings permission, and tenant hierarchy. These are valid domain checks but are less discoverable than declarative route permissions; the exceptions are recorded below.
- Reports/export uses `RequireAllPermissions` for export plus domain-specific report authority.

### Validation and error semantics

- `main.ts` rejects unknown DTO fields where class DTO metadata exists.
- Domain services use Zod parsing for business payloads and normalize validation errors with `parseWithZod`.
- UUID and report query parameters are validated in reviewed core/report controllers.
- Public letter tracking and QR verification have regression tests that reject malformed inputs before database access.
- Several controllers still call `parseInt(page, 10)` directly before pagination reaches a service. That bypasses shared bounded pagination schemas and is the primary open AUDIT-3 source finding.

### Tenant scope and audit trail

- CMS and finance mutations derive tenant scope from the JWT payload and re-check target records before update/delete.
- Tenant provisioning resolves hierarchy in the service and logs the provisioning actor and parent tenant.
- Letter requests validate tenant-bound lookups and public tracking input before tenant lookup.
- Finance ledger workflow uses validation, tenant-owned lookup, database transaction logic, and audit events; deeper database invariants remain covered by AUDIT-5.

## Findings

### A3-P1 Resolved in CI — Controller access posture had no regression gate

JWT is not a global Nest guard. A controller or route added without `@Public()` or `JwtAuthGuard` could therefore accidentally introduce unauthenticated access if it escaped review.

**Treatment:** this PR adds `apps/api/test/api-route-access-policy.test.ts`. The test scans all 26 API controllers and requires every controller to contain an explicit JWT or public-access marker. It deliberately fixes the audited count: a new controller cannot be silently added without updating the AUDIT-3 inventory.

**Limit:** the gate verifies controller-level posture and inventory; it does not replace route-by-route human review, permission semantics, or integration authorization tests.

### A3-P2 Open — Unbounded raw pagination parsing is still used by multiple controllers

The shared validator package already exposes a bounded `paginationSchema` (`page >= 1`, `1 <= limit <= 100`). Yet 13 controllers still directly call `parseInt(page, 10)` / `parseInt(limit, 10)` for pagination, including CMS, assets, audit logs, civil events, finance, development, families, complaints, territories, population, letters, social assistance, and BUMDes.

**Risk:** malformed, zero, negative, or excessive query values can produce inconsistent controller behavior, database errors, or oversized list/export work instead of the standardized validation response.

**Treatment:** tracked as a dedicated remediation item. Replace raw parsing with shared bounded schemas, preserve documented defaults, and add negative tests for `page=0`, negative page/limit, `limit>100`, and non-numeric values.

### A3-P3 Evidence Partial — Authorization is partly service-enforced rather than declarative

Tenant provision/list/create/update/delete routes rely on `TenantsService.assertAccess` or `assertProvisionAccess` for superadmin/settings/provision authority. This is a valid defense in depth, and source review found the relevant checks before mutation. However, the permission contract is not consistently visible at the route decorator layer.

**Treatment:** retain service enforcement; document it as a service-level authorization exception. A future policy gate must either require declarative permission metadata or require an explicit exception annotation with a dedicated regression test.

### A3-P4 Evidence Partial — API compatibility and idempotency policy is not yet formalized

Critical invariants have targeted tests (refresh replay, finance ledger, letter transitions, report/export tenant scope), but the repository lacks an API-wide compatibility/versioning policy and a consistent idempotency contract for externally retryable POST operations.

**Treatment:** scope explicit idempotency keys and retry semantics by operation class during AUDIT-4/security and AUDIT-7/delivery planning; do not retroactively add generic idempotency without domain decisions.

## Regression Evidence Added

| Evidence | Purpose |
| --- | --- |
| `apps/api/test/api-route-access-policy.test.ts` | Keeps controller inventory explicit and rejects a controller without a JWT or `@Public()` access marker. |
| Root `audit:api-route-access` command | Runs the focused AUDIT-3 access-inventory policy. |
| `AUDIT-3 API and Domain Logic` workflow | Runs the focused policy for API source, test, audit-doc, roadmap, and handoff changes. |

## Required Next Steps

1. Remediate A3-P2 using shared pagination schemas and regression tests; do not change default page/limit behavior silently.
2. Create a route-to-permission exception register for service-level authorization cases such as tenant provisioning/management.
3. Define API compatibility/error-envelope policy and operation-specific idempotency expectations.
4. Run high-risk integration scenarios on persistent staging when available: authorization negative cases, tenant isolation, concurrent finance/letter operations, public tracking abuse limits, and reverse-proxy client-IP/rate-limit behavior.
5. Reconcile AUDIT-3 results with AUDIT-4 threat model and AUDIT-5 database tenant-integrity evidence.

## Closure Criteria

AUDIT-3 may move to `Validation Pending` only when:

1. controller/endpoint inventory, public-route inventory, and access posture are versioned and guarded in CI;
2. all known raw pagination/query validation gaps are remediated or have owned, time-boxed risk decisions;
3. authorization exceptions have a route/service contract and regression tests;
4. high-risk domain workflows have validation and authorization negative tests;
5. API compatibility/error semantics and idempotency decisions are documented.

AUDIT-3 may move to `Closed` only when the above source evidence is reconciled with persistent staging validation of key workflows and no known in-scope remediation remains.

## Non-Claims

- This audit does not prove every route is reachable only as intended through a deployed reverse proxy.
- It does not prove production client-IP handling, rate-limit identity, queue execution, storage behavior, or external integration behavior.
- It does not replace AUDIT-4 security, AUDIT-5 database tenant integrity, AUDIT-7 delivery, or UAT.

## Related Documents

- [AUDIT Master Register](AUDIT_MASTER_REGISTER.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
- [AUDIT-2 Dependency and Code Quality](AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [AUDIT-5 Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [CI Merge Gate](../CI_MERGE_GATE.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
