# AUDIT-3 — API dan Domain Logic

**Marker:** `[[AI-CLI|AUDIT-3|VALIDATION_PENDING|VPS_REQUIRED]]`

**Status:** `Validation Pending` — source-level API/domain audit telah direkonsiliasi: controller inventory, access posture, bounded pagination, authorization exceptions, compatibility/idempotency policy, dan targeted high-risk regression evidence telah didokumentasikan. Closure masih memerlukan persistent staging validation untuk authorization, tenant isolation, concurrency/retry, public-route abuse controls, dan reverse-proxy behavior.

## Scope

AUDIT-3 menilai kontrak dan perilaku source-level API berikut:

1. controller/endpoint inventory, public-versus-authenticated access, JWT, RBAC, dan tenant scope;
2. input/query/parameter validation serta error semantics;
3. domain invariants pada workflow berisiko tinggi: authentication, tenant provisioning, resident/family lifecycle, finance ledger, letter workflow, reports/export, storage, dan public tracking;
4. audit logging, idempotency/replay controls, dan regression-test evidence;
5. kebijakan yang dapat diregresikan melalui CI.

Audit ini tidak mengklaim latency, production routing/proxy trust, deployed identity-provider behavior, cross-service queue execution, atau staging/production validation.

## Evidence Boundary — 29 June 2026

**Repository revision before this audit:** `540b15bc161f96007c578a3a5edfa88fc2b4f632` (PR #101 merge commit). The source-level controls described below are introduced or reconciled in the current AUDIT-3 PR and require final CI before merge.

### Baseline controls observed

| Control | Evidence | Assessment |
| --- | --- | --- |
| API prefix and request validation | `main.ts` configures `/api/v1`, global `ValidationPipe`, `whitelist`, `forbidNonWhitelisted`, and transformed payloads. | Framework validation baseline is active. |
| Global abuse control | `AppModule` registers a default throttler of 100 requests per 60 seconds. | Baseline only; public route-specific policy needs persistent-environment security review. |
| Explicit auth guard | `JwtAuthGuard` honors `@Public()` and otherwise requires the Passport JWT strategy. | Controllers must opt in because the JWT guard is not global. |
| Permission guard | `PermissionsGuard` supports any-of and all-of permission decorators. | Route/service conventions remain security-critical when permission metadata is absent. |
| Domain validation | High-risk services use `parseWithZod` schemas for users, tenants, CMS, finance, letters, population/family, assets, territories, social assistance, civil events, BUMDes, files, and settings. | Strong source evidence; dynamic workflow validation remains pending. |
| Global pagination boundary | `PaginationQueryValidationMiddleware` validates supplied `page`/`limit` through the shared bounded schema without changing absent controller defaults. | Remediated source-level query gap. |
| Tenant enforcement | Reviewed services resolve `user.tenantId`, scope reads/mutations, and return not-found/forbidden outcomes for disallowed target records. | Confirmed in CMS, finance, tenant, report/export, and letter workflows; AUDIT-5 owns database/runtime tenant-integrity closure. |

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

The public source surface is intentionally limited to health, authentication/refresh/2FA enrollment flows, public map/FAQ/assistant prompts, public CMS/village/development/finance transparency reads, letter QR/track workflows, and complaint public flows. Reviewed public routes use `@Public()` explicitly.

## High-Risk Workflow Evidence

| Workflow | Source controls | Regression evidence / boundary |
| --- | --- | --- |
| Authentication and refresh | Explicit public/login boundaries, JWT-protected account actions, throttled login/refresh, hashed refresh rotation/replay handling. | Existing auth refresh-token tests; AUDIT-4 retains abuse, proxy-IP, and runtime configuration validation. |
| Tenant management/provisioning | JWT controller, service authorization, tenant hierarchy checks, Zod provisioning schema, transaction, audit log. | `tenants-authorization.test.ts`; exception contract in `AUDIT-3-AUTHORIZATION-EXCEPTIONS.md`. |
| CMS mutations | JWT/permissions, tenant ownership lookup, Zod schemas, audit events. | CMS service source review; controller guard posture gate. |
| Finance ledger | JWT/permissions, tenant-owned lookup, Zod validation, transaction, append-only ledger/domain guard, audit events. | Finance ledger and AUDIT-5 tests/evidence; staging concurrency remains pending. |
| Reports/export | JWT/permissions, `RequireAllPermissions` for exports, query schema for finance/audit reports, tenant-scoped services. | Existing report/export tenant-isolation and query-plan evidence; AUDIT-5 owns persistent data validation. |
| Letters/public tracking | JWT/permissions for administration, public QR/track throttles, Zod validation before public lookup, PDF storage compensation. | `letters-validation.test.ts` for malformed QR/tracking and tenant-sensitive request lookup. |

## Findings and Treatment

### A3-P1 Resolved in CI — Controller access posture had no regression gate

JWT is not a global Nest guard. A controller added without `@Public()` or `JwtAuthGuard` could introduce unauthenticated access if it escaped review.

**Treatment:** `apps/api/test/api-route-access-policy.test.ts` scans all 26 controllers and requires each to declare a JWT or public-access marker. The count is intentional: controller additions/removals require inventory review.

**Limit:** this is a controller-level policy gate, not a substitute for route-by-route permission semantics or dynamic authorization tests.

### A3-P2 Resolved in Source — Inconsistent raw pagination parsing

Source review identified 13 controllers using direct `parseInt(page, 10)` / `parseInt(limit, 10)`. `paginationParameterSchema` and `PaginationQueryValidationMiddleware` now validate only supplied pagination parameters globally.

**Behavior:** absent values are unchanged, preserving each endpoint's existing defaults. Supplied values must be integers with `page >= 1` and `1 <= limit <= 100`; accepted values are canonicalized and invalid values return the standard `VALIDATION_ERROR` envelope before controller/service execution.

**Regression evidence:** `pagination-query-validation.middleware.test.ts` rejects zero, negative, non-numeric, and `limit=101` inputs while confirming absent defaults pass through unchanged.

### A3-P3 Resolved in Source — Service-level authorization contracts were undocumented

Some tenant routes intentionally use `TenantsService.assertAccess` or `assertProvisionAccess` to express OR-based authority across system role, settings authority, delegated provisioning permission, and tenant hierarchy.

**Treatment:** `AUDIT-3-AUTHORIZATION-EXCEPTIONS.md` records route set, authority, rationale, enforcement, test, and review condition. `tenants-authorization.test.ts` rejects an ordinary operator and accepts authorized settings/superadmin/delegated-provision actors.

### A3-P4 Resolved in Policy — API compatibility and idempotency expectations were implicit

The repository had targeted domain idempotency/replay controls but no API-wide rule for contract changes or retry behavior.

**Treatment:** `AUDIT-3-API-COMPATIBILITY-IDEMPOTENCY.md` defines `/api/v1` compatibility rules, mandatory change records, and operation-specific retry/idempotency decisions. It explicitly prohibits a generic idempotency middleware until each domain defines tenant/actor binding, request hash, replay behavior, retention, concurrency, and audit semantics.

## Regression Evidence Added

| Evidence | Purpose |
| --- | --- |
| `apps/api/test/api-route-access-policy.test.ts` | Keeps controller inventory explicit and rejects a controller without a JWT or `@Public()` marker. |
| `apps/api/test/pagination-query-validation.middleware.test.ts` | Verifies bounded global pagination validation and unchanged absent-default behavior. |
| `apps/api/test/tenants-authorization.test.ts` | Verifies documented service-level tenant management/provision authority. |
| `PaginationQueryValidationMiddleware` | Rejects invalid supplied pagination parameters before controller/service execution. |
| `AUDIT-3 API and Domain Logic` workflow | Runs the focused route-access policy for relevant API/evidence changes. |

## Validation Pending Outside Repository

1. Run authorization-negative and cross-tenant tests against persistent staging with real JWT issuance, reverse proxy, and deployment configuration.
2. Exercise concurrent/retry behavior for finance realizations, tenant provisioning, letter generation, public tracking, and refresh flows.
3. Verify client IP/rate-limit identity, public endpoint payload limits, file/upload behavior, and error redaction through the deployed ingress.
4. Reconcile runtime findings with AUDIT-4 threat model, AUDIT-5 tenant integrity, AUDIT-7 delivery, and AUDIT-9 workload evidence.

## Closure Criteria

AUDIT-3 may move to `Closed` only when:

1. the source controls above are reconciled with final CI evidence;
2. persistent staging has recorded authorization, tenant isolation, retry/concurrency, public route abuse, and proxy behavior evidence;
3. no known in-scope API/domain remediation remains, or each residual risk has approved disposition and review cadence;
4. related AUDIT-4/AUDIT-5/AUDIT-7 evidence does not reveal a conflicting API/domain finding.

## Non-Claims

- This audit does not prove every route is reachable only as intended through a deployed reverse proxy.
- It does not prove production client-IP handling, rate-limit identity, queue execution, storage behavior, or external integration behavior.
- It does not replace AUDIT-4 security, AUDIT-5 database tenant integrity, AUDIT-7 delivery, or UAT.

## Related Documents

- [Service-Level Authorization Exceptions](AUDIT-3-AUTHORIZATION-EXCEPTIONS.md)
- [API Compatibility and Idempotency Policy](AUDIT-3-API-COMPATIBILITY-IDEMPOTENCY.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
- [AUDIT-2 Dependency and Code Quality](AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [AUDIT-5 Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [CI Merge Gate](../CI_MERGE_GATE.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
