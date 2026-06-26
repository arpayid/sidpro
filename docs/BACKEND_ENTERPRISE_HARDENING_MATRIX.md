# Backend Enterprise Hardening Matrix

## Purpose

Dokumen ini menginventarisasi endpoint NestJS di `apps/api/src/core/**` dan `apps/api/src/modules/**` untuk kebutuhan hardening SID Premium Enterprise. Matriks berfokus pada kontrol enterprise yang diwajibkan roadmap: authorization guard, permission, DTO/schema validation, tenant scope, audit log untuk mutation penting, dan test coverage.

## Audit Scope and Method

- Scope kode: semua `*controller.ts` di `apps/api/src/core/**` dan `apps/api/src/modules/**`.
- Prioritas review detail: `auth`, `users`, `roles`, `settings`, `residents/population`, `families`, `letters`, `complaints`, `files`, dan `audit logs`.
- Sumber verifikasi: decorator controller (`@Public`, `@UseGuards`, `@RequirePermissions`, `@RequireAllPermissions`), service terkait untuk `requireTenant`/`tenantWhere`/`tenantId`, `auditLogs.log`, schema/DTO parsing, dan test di `apps/api/test/**`.
- Status memakai label permintaan: `OK`, `Needs DTO`, `Needs Permission`, `Needs Tenant Scope`, `Needs Audit Log`, `Needs Test`.

## Status Legend

| Status               | Meaning                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `OK`                 | Kontrol utama terlihat tersedia untuk endpoint tersebut.                                                                         |
| `Needs DTO`          | Body/query/param masih berupa inline type, `unknown`, `Record<string, unknown>`, atau parsing manual tanpa DTO/schema dedicated. |
| `Needs Permission`   | Endpoint admin tidak memakai permission eksplisit atau hanya mengandalkan guard/assertion service.                               |
| `Needs Tenant Scope` | Endpoint data tenant belum jelas memaksa/memfilter tenant scope.                                                                 |
| `Needs Audit Log`    | Mutation penting belum jelas mencatat audit log.                                                                                 |
| `Needs Test`         | Tidak ditemukan test endpoint/module spesifik yang memverifikasi guard, validation, tenant scope, audit log, atau happy path.    |

## Executive Summary

1. Mayoritas endpoint admin sudah memakai `JwtAuthGuard` + `PermissionsGuard` dan permission decorator, terutama modul prioritas seperti `users`, `roles`, `files`, `residents`, `families`, `letters`, `complaints`, dan `audit-logs`.
2. Pola tenant scope umumnya diterapkan di service via `requireTenant`, `tenantWhere`, atau `tenantId` filter. Exception utama adalah endpoint tenant administration yang sengaja bersifat lintas tenant, tetapi beberapa endpoint `tenants` belum diberi permission decorator eksplisit.
3. Gap terbesar adalah validation formal: banyak controller masih menerima inline object type, `unknown`, atau `Record<string, unknown>` alih-alih DTO/schema dedicated untuk body, query, dan param.
4. Audit logging untuk mutation penting terlihat luas di service prioritas, termasuk export sensitif pada population/families/reports; endpoint read-only tidak membutuhkan audit log kecuali download/export sensitif.
5. Test coverage masih lebih banyak util/security helper daripada endpoint/controller integration. Hampir semua endpoint perlu test e2e atau service-level test yang mengikat permission + validation + tenant scope.

## Priority Module Matrix

### Auth (`apps/api/src/core/auth/auth.controller.ts`)

| Endpoint                               | Public/Admin | Permission | Validation                       | Tenant scope    | Audit log                               | Test coverage                                                            | Status             |
| -------------------------------------- | -----------: | ---------- | -------------------------------- | --------------- | --------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| `POST /auth/login`                     |       Public | N/A        | `LoginDto`                       | N/A             | Security event in auth service expected | `auth-dto-validation.test.ts`, `security-policy.test.ts`, `totp.test.ts` | `OK`, `Needs Test` |
| `POST /auth/2fa/verify-login`          |       Public | N/A        | `VerifyTwoFactorLoginDto`        | N/A             | Security event expected                 | `auth-dto-validation.test.ts`, `totp.test.ts`                            | `OK`, `Needs Test` |
| `POST /auth/2fa/enroll-login/setup`    |       Public | N/A        | `SetupTwoFactorEnrollmentDto`    | N/A             | Security event expected                 | `auth-dto-validation.test.ts`, `totp.test.ts`                            | `OK`, `Needs Test` |
| `POST /auth/2fa/enroll-login/complete` |       Public | N/A        | `CompleteTwoFactorEnrollmentDto` | N/A             | Security event expected                 | `auth-dto-validation.test.ts`, `totp.test.ts`                            | `OK`, `Needs Test` |
| `POST /auth/2fa/setup`                 |        Admin | JWT only   | Param from token                 | User self-scope | Security event expected                 | `totp.test.ts`                                                           | `OK`, `Needs Test` |
| `POST /auth/2fa/enable`                |        Admin | JWT only   | `EnableTwoFactorDto`             | User self-scope | Security event expected                 | `auth-dto-validation.test.ts`, `totp.test.ts`                            | `OK`, `Needs Test` |
| `POST /auth/2fa/disable`               |        Admin | JWT only   | `DisableTwoFactorDto`            | User self-scope | Security event expected                 | `auth-dto-validation.test.ts`, `totp.test.ts`                            | `OK`, `Needs Test` |
| `POST /auth/refresh`                   |       Public | N/A        | `RefreshTokenDto`                | Token-bound     | Security event expected                 | `auth-dto-validation.test.ts`                                            | `OK`, `Needs Test` |
| `POST /auth/logout`                    |        Admin | JWT only   | `LogoutDto`                      | User self-scope | Security event expected                 | No endpoint e2e found                                                    | `OK`, `Needs Test` |
| `GET /auth/me`                         |        Admin | JWT only   | Token subject                    | User self-scope | N/A read                                | No endpoint e2e found                                                    | `OK`, `Needs Test` |

### Users (`apps/api/src/core/users/users.controller.ts`)

| Endpoint                  | Public/Admin | Permission                        | Validation                         | Tenant scope                  | Audit log | Test coverage          | Status                    |
| ------------------------- | -----------: | --------------------------------- | ---------------------------------- | ----------------------------- | --------- | ---------------------- | ------------------------- |
| `GET /users`              |        Admin | `users.read`                      | Query parse only                   | `tenantWhere(user)`           | N/A read  | RBAC helper tests only | `Needs DTO`, `Needs Test` |
| `GET /users/:id`          |        Admin | `users.read`                      | Raw `id` param                     | `tenantWhere(user)`           | N/A read  | RBAC helper tests only | `Needs DTO`, `Needs Test` |
| `POST /users`             |        Admin | `users.create`                    | `createUserSchema.safeParse`       | tenant assignment constrained | Yes       | RBAC helper tests only | `OK`, `Needs Test`        |
| `PATCH /users/:id`        |        Admin | `users.update`                    | `updateUserSchema.safeParse`       | `tenantWhere(user)`           | Yes       | RBAC helper tests only | `OK`, `Needs Test`        |
| `PATCH /users/:id/status` |        Admin | `users.disable` OR `users.update` | `updateUserStatusSchema.safeParse` | `tenantWhere(user)`           | Yes       | RBAC helper tests only | `OK`, `Needs Test`        |
| `PUT /users/:id/roles`    |        Admin | `users.update`                    | `assignUserRolesSchema.safeParse`  | `tenantWhere(user)`           | Yes       | RBAC helper tests only | `OK`, `Needs Test`        |
| `DELETE /users/:id`       |        Admin | `users.delete`                    | Raw `id` param                     | `tenantWhere(user)`           | Yes       | RBAC helper tests only | `Needs DTO`, `Needs Test` |

### Roles (`apps/api/src/core/roles/roles.controller.ts`)

| Endpoint                     | Public/Admin | Permission                 | Validation                              | Tenant scope        | Audit log | Test coverage                    | Status                    |
| ---------------------------- | -----------: | -------------------------- | --------------------------------------- | ------------------- | --------- | -------------------------------- | ------------------------- |
| `GET /roles`                 |        Admin | `roles.read`               | Query parse only                        | `tenantWhere(user)` | N/A read  | RBAC helper tests only           | `Needs DTO`, `Needs Test` |
| `GET /roles/:id`             |        Admin | `roles.read`               | Raw `id` param                          | `tenantWhere(user)` | N/A read  | RBAC helper tests only           | `Needs DTO`, `Needs Test` |
| `POST /roles`                |        Admin | `roles.create`             | `createRoleSchema.safeParse`            | `tenantWhere(user)` | Yes       | RBAC helper tests only           | `OK`, `Needs Test`        |
| `PATCH /roles/:id`           |        Admin | `roles.update`             | `updateRoleSchema.safeParse`            | `tenantWhere(user)` | Yes       | RBAC helper tests only           | `OK`, `Needs Test`        |
| `PUT /roles/:id/permissions` |        Admin | `roles.assign_permissions` | `assignRolePermissionsSchema.safeParse` | `tenantWhere(user)` | Yes       | `permissions-guard.test.ts` only | `OK`, `Needs Test`        |

### Settings (`apps/api/src/core/settings/settings.controller.ts`)

| Endpoint                | Public/Admin | Permission        | Validation         | Tenant scope         | Audit log | Test coverage          | Status                    |
| ----------------------- | -----------: | ----------------- | ------------------ | -------------------- | --------- | ---------------------- | ------------------------- |
| `GET /settings`         |        Admin | `settings.manage` | N/A                | Service tenant scope | N/A read  | No endpoint test found | `OK`, `Needs Test`        |
| `GET /settings/:key`    |        Admin | `settings.manage` | Raw `key` param    | Service tenant scope | N/A read  | No endpoint test found | `Needs DTO`, `Needs Test` |
| `PUT /settings/:key`    |        Admin | `settings.manage` | Inline `{ value }` | Service tenant scope | Yes       | No endpoint test found | `Needs DTO`, `Needs Test` |
| `DELETE /settings/:key` |        Admin | `settings.manage` | Raw `key` param    | Service tenant scope | Yes       | No endpoint test found | `Needs DTO`, `Needs Test` |

### Residents / Population (`apps/api/src/modules/population/population.controller.ts`)

| Endpoint                     | Public/Admin | Permission          | Validation                        | Tenant scope          | Audit log              | Test coverage                 | Status                    |
| ---------------------------- | -----------: | ------------------- | --------------------------------- | --------------------- | ---------------------- | ----------------------------- | ------------------------- |
| `GET /residents`             |        Admin | `population.read`   | Query parse only                  | `requireTenant(user)` | N/A read               | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `GET /residents/export`      |        Admin | `population.export` | N/A                               | `requireTenant(user)` | Yes export log         | CSV/spreadsheet util only     | `OK`, `Needs Test`        |
| `POST /residents/import`     |        Admin | `population.import` | File MIME + import row validation | `requireTenant(user)` | Yes non-preview import | Spreadsheet util only         | `OK`, `Needs Test`        |
| `GET /residents/:id`         |        Admin | `population.read`   | Raw `id` param                    | `requireTenant(user)` | N/A read               | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `POST /residents`            |        Admin | `population.create` | Inline body + service validation  | `requireTenant(user)` | Yes                    | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `PATCH /residents/:id`       |        Admin | `population.update` | `Record<string, unknown>`         | `requireTenant(user)` | Yes                    | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `POST /residents/:id/mutate` |        Admin | `population.update` | Inline body                       | `requireTenant(user)` | Yes                    | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `DELETE /residents/:id`      |        Admin | `population.delete` | Raw `id` param                    | `requireTenant(user)` | Yes                    | No module endpoint test found | `Needs DTO`, `Needs Test` |

### Families (`apps/api/src/modules/families/families.controller.ts`)

| Endpoint                                 | Public/Admin | Permission        | Validation                | Tenant scope          | Audit log      | Test coverage                 | Status                    |
| ---------------------------------------- | -----------: | ----------------- | ------------------------- | --------------------- | -------------- | ----------------------------- | ------------------------- |
| `GET /families`                          |        Admin | `families.read`   | Query parse only          | `requireTenant(user)` | N/A read       | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `GET /families/export`                   |        Admin | `families.export` | N/A                       | `requireTenant(user)` | Yes export log | CSV/spreadsheet util only     | `OK`, `Needs Test`        |
| `GET /families/:id`                      |        Admin | `families.read`   | Raw `id` param            | `requireTenant(user)` | N/A read       | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `POST /families`                         |        Admin | `families.create` | Inline body               | `requireTenant(user)` | Yes            | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `PATCH /families/:id`                    |        Admin | `families.update` | `Record<string, unknown>` | `requireTenant(user)` | Yes            | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `DELETE /families/:id`                   |        Admin | `families.delete` | Raw `id` param            | `requireTenant(user)` | Yes            | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `POST /families/:id/members`             |        Admin | `families.update` | Inline body               | `requireTenant(user)` | Yes            | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `DELETE /families/:id/members/:memberId` |        Admin | `families.update` | Raw params                | `requireTenant(user)` | Yes            | No module endpoint test found | `Needs DTO`, `Needs Test` |

### Letters (`apps/api/src/modules/letters/letters.controller.ts`)

| Endpoint                                 | Public/Admin | Permission                         | Validation                          | Tenant scope                 | Audit log                | Test coverage                       | Status                    |
| ---------------------------------------- | -----------: | ---------------------------------- | ----------------------------------- | ---------------------------- | ------------------------ | ----------------------------------- | ------------------------- |
| `GET /letters/settings`                  |        Admin | `letters.manage`                   | N/A                                 | `requireTenant(user)`        | N/A read                 | PDF/helper tests only               | `OK`, `Needs Test`        |
| `PUT /letters/settings`                  |        Admin | `letters.manage`                   | Inline body                         | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `PATCH /letter-templates/:id`            |        Admin | `letters.manage`                   | Inline body + raw param             | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `GET /letter-types`                      |        Admin | `letters.read` OR `letters.create` | Query parse only                    | `requireTenant(user)`        | N/A read                 | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `POST /letter-types`                     |        Admin | `letters.manage`                   | Inline body                         | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `GET /letter-templates`                  |        Admin | `letters.read`                     | Raw query                           | `requireTenant(user)`        | N/A read                 | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `POST /letter-templates`                 |        Admin | `letters.manage`                   | Inline body                         | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `GET /letter-requests`                   |        Admin | `letters.read`                     | Query parse only                    | `requireTenant(user)`        | N/A read                 | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `GET /letter-requests/:id`               |        Admin | `letters.read`                     | Raw `id` param                      | `requireTenant(user)`        | N/A read                 | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `POST /letter-requests`                  |        Admin | `letters.create`                   | Inline body                         | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `PATCH /letter-requests/:id/verify`      |        Admin | `letters.verify`                   | Inline body                         | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `PATCH /letter-requests/:id/approve`     |        Admin | `letters.approve`                  | Inline body                         | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `PATCH /letter-requests/:id/reject`      |        Admin | `letters.reject`                   | Inline body                         | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `POST /letter-requests/:id/generate-pdf` |        Admin | `letters.generate`                 | Raw `id` param                      | `requireTenant(user)`        | Yes                      | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `GET /letter-requests/:id/download`      |        Admin | `letters.download`                 | Raw `id` param                      | `requireTenant(user)`        | Yes download log         | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `GET /letters/verify/:qrCode`            |       Public | N/A                                | Raw `qrCode` param                  | QR-bound lookup              | Verification log present | PDF/helper tests only               | `Needs DTO`, `Needs Test` |
| `POST /letters/public/track`             |       Public | N/A                                | `publicLetterTrackSchema.safeParse` | `tenantCode` resolves tenant | N/A read                 | No public track endpoint test found | `OK`, `Needs Test`        |

### Complaints (`apps/api/src/modules/complaints/complaints.controller.ts`)

| Endpoint                         | Public/Admin | Permission                                | Validation                            | Tenant scope                 | Audit log           | Test coverage                 | Status                    |
| -------------------------------- | -----------: | ----------------------------------------- | ------------------------------------- | ---------------------------- | ------------------- | ----------------------------- | ------------------------- |
| `POST /complaints/public/upload` |       Public | N/A                                       | File MIME filter + `tenantCode` query | `tenantCode` resolves tenant | Upload log expected | `file-mime.test.ts` only      | `Needs DTO`, `Needs Test` |
| `POST /complaints/public/track`  |       Public | N/A                                       | `publicComplaintTrackSchema`          | `tenantCode` resolves tenant | N/A read            | `complaint-track.test.ts`     | `OK`, `Needs Test`        |
| `GET /complaints/sla-stats`      |        Admin | `complaints.read`                         | N/A                                   | `requireTenant(user)`        | N/A read            | No module endpoint test found | `OK`, `Needs Test`        |
| `GET /complaints/export`         |        Admin | `complaints.read`                         | Query parse only                      | `requireTenant(user)`        | Yes export log      | CSV util only                 | `Needs DTO`, `Needs Test` |
| `GET /complaints`                |        Admin | `complaints.read`                         | Query parse only                      | `requireTenant(user)`        | N/A read            | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `GET /complaints/:id`            |        Admin | `complaints.read`                         | Raw `id` param                        | `requireTenant(user)`        | N/A read            | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `POST /complaints`               |        Admin | `complaints.create`                       | Inline body                           | `requireTenant(user)`        | Yes                 | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `PATCH /complaints/:id/status`   |        Admin | `complaints.update` OR `complaints.close` | Inline body                           | `requireTenant(user)`        | Yes                 | Notification integration only | `Needs DTO`, `Needs Test` |
| `PATCH /complaints/:id/assign`   |        Admin | `complaints.assign`                       | Inline body                           | `requireTenant(user)`        | Yes                 | No module endpoint test found | `Needs DTO`, `Needs Test` |
| `POST /complaints/:id/responses` |        Admin | `complaints.respond`                      | Inline body                           | `requireTenant(user)`        | Yes                 | Notification integration only | `Needs DTO`, `Needs Test` |
| `PATCH /complaints/:id/respond`  |        Admin | `complaints.respond`                      | Inline body                           | `requireTenant(user)`        | Yes                 | Notification integration only | `Needs DTO`, `Needs Test` |
| `PATCH /complaints/:id/close`    |        Admin | `complaints.close`                        | Inline body                           | `requireTenant(user)`        | Yes                 | No module endpoint test found | `Needs DTO`, `Needs Test` |

### Files (`apps/api/src/core/files/files.controller.ts`)

| Endpoint                  | Public/Admin | Permission                                                                   | Validation                           | Tenant scope         | Audit log               | Test coverage                             | Status                    |
| ------------------------- | -----------: | ---------------------------------------------------------------------------- | ------------------------------------ | -------------------- | ----------------------- | ----------------------------------------- | ------------------------- |
| `GET /files`              |        Admin | `settings.manage` OR `complaints.read`                                       | Query parse only                     | Service tenant scope | N/A read                | MIME/signed-url tests only                | `Needs DTO`, `Needs Test` |
| `POST /files/upload`      |        Admin | `settings.manage` OR `cms.manage` OR complaint/letter/population permissions | File size + MIME filter, inline body | Service tenant scope | Yes upload log expected | `file-mime.test.ts`, `signed-url.test.ts` | `OK`, `Needs Test`        |
| `GET /files/:id/download` |        Admin | Multiple allowed permissions                                                 | Raw `id` param                       | Service tenant scope | Download log expected   | `signed-url.test.ts`                      | `Needs DTO`, `Needs Test` |
| `GET /files/:id`          |        Admin | `settings.manage`                                                            | Raw `id` param                       | Service tenant scope | N/A read                | No endpoint test found                    | `Needs DTO`, `Needs Test` |
| `POST /files`             |        Admin | `settings.manage`                                                            | Inline body                          | Service tenant scope | Yes                     | No endpoint test found                    | `Needs DTO`, `Needs Test` |
| `PATCH /files/:id`        |        Admin | `settings.manage`                                                            | Inline body + raw param              | Service tenant scope | Yes                     | No endpoint test found                    | `Needs DTO`, `Needs Test` |
| `DELETE /files/:id`       |        Admin | `settings.manage`                                                            | Raw `id` param                       | Service tenant scope | Yes                     | No endpoint test found                    | `Needs DTO`, `Needs Test` |

### Audit Logs (`apps/api/src/core/audit-logs/audit-logs.controller.ts`)

| Endpoint              | Public/Admin | Permission   | Validation       | Tenant scope            | Audit log | Test coverage                 | Status                    |
| --------------------- | -----------: | ------------ | ---------------- | ----------------------- | --------- | ----------------------------- | ------------------------- |
| `GET /audit-logs`     |        Admin | `audit.read` | Query parse only | `tenantWhere(user)`     | N/A read  | `audit-metadata.test.ts` only | `Needs DTO`, `Needs Test` |
| `GET /audit-logs/:id` |        Admin | `audit.read` | Raw `id` param   | Service verifies tenant | N/A read  | `audit-metadata.test.ts` only | `Needs DTO`, `Needs Test` |

## Other Controller Inventory

| Module/controller   |                                                                  Endpoints inventoried | Overall status                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permissions`       |                                                                     `GET /permissions` | `Needs DTO`, `Needs Test`; permission `permissions.read` present.                                                                                                               |
| `notifications`     | `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read` | `Needs Permission` for explicit permission decorators if considered admin-wide; current scope is authenticated self-notification. Tenant/user scope has dedicated tests.        |
| `tenants`           |                                                          10 endpoints under `/tenants` | `Needs Permission` for provision/general CRUD endpoints missing `@RequirePermissions`; also `Needs DTO` and `Needs Test`. Regency/district overview endpoints have permissions. |
| `assets`            |                                                            5 endpoints under `/assets` | Permission, tenant scope, audit logs for mutations appear present; mostly `Needs DTO`, `Needs Test`.                                                                            |
| `assistant`         |                              `GET /assistant/public/faq`, `POST /assistant/public/ask` | Public endpoints; `POST` is throttled but needs DTO/schema for body/query and endpoint tests.                                                                                   |
| `bumdes`            |                                                            6 endpoints under `/bumdes` | Permission, tenant scope, audit logs for mutations appear present; mostly `Needs DTO`, `Needs Test`.                                                                            |
| `civil-events`      |                                                      5 endpoints under `/civil-events` | Permission, tenant scope, audit logs for mutations appear present; mostly `Needs DTO`, `Needs Test`.                                                                            |
| `cms`               |                                                              15 endpoints under `/cms` | Public endpoints use `tenantCode`; admin endpoints have permissions, tenant scope, audit logs for mutations; mostly `Needs DTO`, `Needs Test`.                                  |
| `development`       |                                                       5 endpoints under `/development` | Public listing and admin CRUD inventoried; admin controls appear present; mostly `Needs DTO`, `Needs Test`.                                                                     |
| `finance`           |                                                           7 endpoints under `/finance` | Public transparency plus admin finance endpoints; admin controls/audit logs appear present; mostly `Needs DTO`, `Needs Test`.                                                   |
| `public`            |                                                                      `GET /public/map` | Public tenantCode-scoped endpoint; `Needs DTO`, `Needs Test`.                                                                                                                   |
| `reports`           |                                                           8 endpoints under `/reports` | Permissions present including all-permission exports; tenant scope and export audit logs appear present; mostly `Needs DTO`, `Needs Test`.                                      |
| `social-assistance` |                                                 6 endpoints under `/social-assistance` | Permission, tenant scope, audit logs for mutations appear present; mostly `Needs DTO`, `Needs Test`.                                                                            |
| `territories`       |                                 6 endpoints under `/hamlets` and `/neighborhood-units` | Permission, tenant scope, audit logs for mutations appear present; mostly `Needs DTO`, `Needs Test`.                                                                            |
| `village-profile`   |        `GET /village-profile`, `GET /village-profile/manage`, `PATCH /village-profile` | Public profile is tenantCode-scoped; admin endpoints have permission and audit log for update; `Needs DTO`, `Needs Test`.                                                       |

## Recommended Fix Order

1. Add DTO/schema coverage for priority modules in this order: `complaints`, `letters`, `residents`, `families`, `files`, then `settings`.
2. Add explicit permission decorators to `/tenants` provision/general CRUD endpoints or split them into superadmin/regency-scoped permissions.
3. Add endpoint-level e2e tests for priority modules covering unauthenticated, missing permission, invalid body/query/param, cross-tenant access, mutation audit log, and happy path.
4. Standardize query and param parsing with DTO pipes or shared schemas for `page`, `limit`, `id`, `tenantCode`, date ranges, and status filters.
5. Document intended semantics for OR vs ALL permission decorators, especially endpoints that currently accept multiple permissions.

## Validation Checklist for Future Hardening PRs

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma validate
```

For each endpoint hardening PR, add at least one automated test proving the status moved from `Needs *` to `OK`.

## Task 8.1 Core Validation Update

Scope update: `apps/api/src/core/users`, `roles`, `settings`, `tenants`, `files`, and `notifications` now use shared Zod validation schemas plus the API `parseWithZod` helper for consistent `VALIDATION_ERROR` responses.

| Module | Validation added | Negative coverage | Status |
| ------ | ---------------- | ----------------- | ------ |
| Users | Strict mutation schemas, UUID role ids, email format, strong password, status enum, list pagination/search/status/role filters, UUID params | Empty payload, invalid email/password/UUID, forbidden field | `OK` |
| Roles | Strict mutation schemas, UUID permission ids, list pagination, UUID params | Invalid UUID and forbidden-field protection via shared core validation tests | `OK` |
| Settings | Setting key schema and strict `{ value: object }` upsert body; delete/read key validation share consistent Zod error format | Empty/invalid payload behavior covered by `parseWithZod` consistency test | `OK` |
| Tenants | Strict create/update/provision schemas, UUID parent/id params, status enum, email format, pagination/search | Invalid enum, malformed parent UUID, invalid admin email, forbidden `level` field | `OK` |
| Files | Strict upload/create/update metadata schemas, owner UUID, allowed MIME enum, max size, checksum, pagination/filter validation, UUID params | Invalid owner UUID, MIME, zero size, forbidden metadata field | `OK` |
| Notifications | Pagination validation, boolean `unreadOnly` enum transform, UUID notification id params | Invalid pagination and invalid `unreadOnly` query value | `OK` |

Validation response standard:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payload tidak valid",
    "fields": {
      "fieldName": ["reason"]
    }
  }
}
```
