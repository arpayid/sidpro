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
| DELETE | /users/:id | users.delete |
| GET | /roles | roles.read |
| POST | /roles | roles.create |
| PATCH | /roles/:id | roles.update |
| GET | /permissions | permissions.read |

## Population

| Method | Path | Permission |
|---|---|---|
| GET | /residents | population.read |
| POST | /residents | population.create |
| GET | /residents/:id | population.read |
| PATCH | /residents/:id | population.update |
| DELETE | /residents/:id | population.delete |
| POST | /residents/import | population.import |
| GET | /residents/export | population.export |

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
| GET | /complaints | complaints.read |
| POST | /complaints | complaints.create |
| PATCH | /complaints/:id/assign | complaints.assign |
| PATCH | /complaints/:id/respond | complaints.respond |
| PATCH | /complaints/:id/close | complaints.close |

## Reports

| Method | Path | Permission |
|---|---|---|
| GET | /reports/dashboard | reports.read |
| GET | /reports/population | reports.population |
| GET | /reports/letters | reports.letters |
| GET | /reports/finance | reports.finance |
| GET | /reports/audit | audit.read |

## API Rules

- Protected endpoints require authentication.
- Protected endpoints require permission checks.
- Tenant-owned queries apply tenant filter.
- Create, update, delete, approve, reject, export, and import actions record audit logs when sensitive.
- List endpoints use pagination.
- Export endpoints must be logged.
