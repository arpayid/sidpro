# SIDPRO API Contract

Base API style: REST JSON.

## Standard Success Response

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0
  }
}
```

## Standard Error Response

```json
{
  "success": false,
  "message": "Request failed",
  "error": {
    "code": "ERROR_CODE",
    "details": []
  }
}
```

## Pagination Query

- page
- limit
- search
- sort_by
- sort_order

## Auth Endpoints

| Method | Path | Permission |
|---|---|---|
| POST | /auth/login | public |
| POST | /auth/refresh | authenticated |
| POST | /auth/logout | authenticated |
| GET | /auth/me | authenticated |

## Users and RBAC

| Method | Path | Permission |
|---|---|---|
| GET | /users | users.read |
| POST | /users | users.create |
| GET | /users/:id | users.read |
| PATCH | /users/:id | users.update |
| PATCH | /users/:id/status | users.disable (nonaktif) / users.update (aktifkan) |
| PUT | /users/:id/roles | users.update |
| DELETE | /users/:id | users.delete |
| GET | /roles | roles.read |
| POST | /roles | roles.create |
| GET | /roles/:id | roles.read |
| PATCH | /roles/:id | roles.update |
| PUT | /roles/:id/permissions | roles.assign_permissions |
| GET | /permissions | permissions.read |

## Population

| Method | Path | Permission |
|---|---|---|
| GET | /residents | population.read |
| POST | /residents | population.create |
| GET | /residents/:id | population.read |
| PATCH | /residents/:id | population.update |
| DELETE | /residents/:id | population.delete |
| POST | /residents/:id/mutate | population.update |
| POST | /residents/import | population.import |
| GET | /residents/export | population.export |

POST/PATCH `/residents` accepts optional `address` object: `{ hamletId, neighborhoodUnitId, street? }` — creates linked `addresses` row.

## Territories (Dusun / RT-RW)

| Method | Path | Permission |
|---|---|---|
| GET | /hamlets | population.read |
| POST | /hamlets | population.update |
| PATCH | /hamlets/:id | population.update |
| GET | /hamlets/:hamletId/neighborhood-units | population.read |
| POST | /neighborhood-units | population.update |
| PATCH | /neighborhood-units/:id | population.update |

## Families

| Method | Path | Permission |
|---|---|---|
| GET | /families | families.read |
| POST | /families | families.create |
| GET | /families/:id | families.read |
| PATCH | /families/:id | families.update |
| POST | /families/:id/members | families.update |
| DELETE | /families/:id/members/:memberId | families.update |

## Letters

| Method | Path | Permission |
|---|---|---|
| GET | /letter-types | letters.read |
| POST | /letter-types | letters.manage |
| GET | /letter-requests | letters.read |
| POST | /letter-requests | letters.create |
| PATCH | /letter-requests/:id/verify | letters.verify |
| PATCH | /letter-requests/:id/approve | letters.approve |
| PATCH | /letter-requests/:id/reject | letters.reject |
| POST | /letter-requests/:id/generate-pdf | letters.generate |
| GET | /letter-requests/:id/download | letters.download |
| GET | /letters/verify/:qrCode | public |

## Complaints

| Method | Path | Permission |
|---|---|---|
| POST | /complaints/public?tenantCode= | public |
| POST | /complaints/public/track?tenantCode= | public |
| GET | /complaints | complaints.read |
| POST | /complaints | complaints.create |
| GET | /complaints/:id | complaints.read |
| PATCH | /complaints/:id/status | complaints.update / complaints.close |
| PATCH | /complaints/:id/assign | complaints.assign |
| POST | /complaints/:id/responses | complaints.respond |
| PATCH | /complaints/:id/respond | complaints.respond (legacy) |
| PATCH | /complaints/:id/close | complaints.close |

Query filters (`GET /complaints`): `page`, `limit`, `status`, `priority`, `search`, `dateFrom`, `dateTo`.

Public track body (`POST /complaints/public/track`):

```json
{
  "ticket": "PGD-19F10A9D",
  "reporterPhone": "08123456789"
}
```

Returns sanitized complaint status (no email, assignee, or internal IDs). Returns generic 404 when ticket or phone does not match (anti-enumeration).

Status workflow: `submitted` → `verified` → `assigned` → `in_progress` → `resolved` → `closed` (or `rejected`).

## Reports

| Method | Path | Permission |
|---|---|---|
| GET | /reports/dashboard | reports.read |
| GET | /reports/population | reports.population |
| GET | /reports/letters | reports.letters |
| GET | /reports/finance | reports.finance |
| GET | /reports/audit | audit.read |

## Audit Logs

| Method | Path | Permission |
|---|---|---|
| GET | /audit-logs | audit.read |
| GET | /audit-logs/:id | audit.read |

Query filters (`GET /audit-logs`):

- `page`, `limit` — pagination (default 1, 20; max limit 100)
- `module` — filter by module (e.g. `auth`, `letters`, `population`)
- `action` — filter by action (e.g. `create`, `update`, `generate`, `login`)
- `actorId` — filter by user ID
- `entityType`, `entityId` — filter by affected entity
- `dateFrom`, `dateTo` — ISO date (`YYYY-MM-DD`) inclusive range on `createdAt`
- `search` — case-insensitive search across module, action, entity, actor name/email, IP

Response metadata is sanitized: passwords, tokens, API keys are redacted; NIK/KK values are masked.

Sorting: `createdAt` descending (fixed).

Tenant scope: non–super-admin users only see logs for their `tenantId`.

## API Rules

- Protected endpoints require authentication.
- Protected endpoints require permission checks.
- Tenant-owned queries apply tenant filter.
- Create, update, delete, approve, reject, export, and import actions record audit logs when sensitive.
- List endpoints use pagination.
- Export endpoints must be logged.
