# AUDIT-3 — Service-Level Authorization Exceptions

**Marker:** `[[AI-CLI|AUDIT-3|IN_PROGRESS|REPO_CI_READY]]`

This register records API operations where authorization is intentionally enforced in the application service rather than entirely through `@RequirePermissions(...)` metadata on the controller method.

The exception does **not** weaken authentication: the `TenantsController` remains protected by `JwtAuthGuard` and `PermissionsGuard`. The service layer performs additional decisions because the permitted actor set depends on system role, configuration authority, tenant hierarchy, and provisioning semantics.

## Rules

1. A service-level authorization exception must state its routes, required authority, reason, enforcement method, regression test, and removal/review condition.
2. The controller must still use JWT authentication unless the route is explicitly public and separately documented.
3. A service-level check must happen before state mutation or sensitive read output.
4. A new exception requires this register, an AUDIT-3 update, and a focused regression test in the same PR.

## Active Exceptions

| Routes | Required authority | Enforcement | Reason | Regression evidence | Review condition |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/tenants`, `GET /api/v1/tenants/:id` | `superadmin_system` role **or** `settings.manage` permission | `TenantsService.assertAccess` is called before list/detail access. | The permission model allows a system role or settings authority; this is not a simple one-permission route contract. | `apps/api/test/tenants-authorization.test.ts` rejects an ordinary operator and accepts allowed authority. | Replace with declarative metadata only if the route contract can represent the same OR policy without obscuring the service decision. |
| `POST /api/v1/tenants`, `PATCH /api/v1/tenants/:id`, `DELETE /api/v1/tenants/:id` | `superadmin_system` role **or** `settings.manage` permission | `TenantsService.assertAccess` executes before validation/mutation. | Tenant lifecycle mutation requires a system-level OR policy and audit logging. | `apps/api/test/tenants-authorization.test.ts` covers the authority boundary; existing service paths perform mutation only after `assertAccess`. | Revisit if a shared declarative authorization policy supports this exact OR condition with equivalent tests. |
| `GET /api/v1/tenants/provision/parents`, `POST /api/v1/tenants/provision/village` | `superadmin_system`, `settings.manage`, **or** `tenants.provision_village` | `TenantsService.assertProvisionAccess` executes before hierarchy lookup/provisioning. | Provisioning needs separate delegated authority in addition to broader system/settings authority. Tenant-parent hierarchy is checked after authority validation. | `apps/api/test/tenants-authorization.test.ts` rejects an ordinary operator and accepts the dedicated provisioning permission. | Keep service-level enforcement while provisioning authority has three allowed paths; review when RBAC policy is simplified. |

## Non-Exceptions

The following tenant operations are declarative as well as domain-checked and are not listed above:

- `GET /tenants/regency/overview` requires `tenants.regency_overview` and validates that the caller tenant is a regency.
- `GET /tenants/district/overview` requires `tenants.district_overview` and validates that the caller tenant is a district.
- `GET /tenants/villages/:id/summary` requires regency overview authority and validates the requested village belongs to the caller hierarchy.

## Limits

- This register proves source-level intent and regression coverage only.
- It does not prove production role claims, proxy authentication, database grants, or staging behavior.
- It does not replace AUDIT-4 threat modeling or AUDIT-5 tenant-integrity validation.

## Related Documents

- [AUDIT-3 API and Domain Logic](AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
- [AUDIT-5 Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
