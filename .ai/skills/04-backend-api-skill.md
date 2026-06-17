# SIDPRO Backend API Skill

Use this skill for NestJS backend implementation: modules, controllers, services, DTOs, guards, queues, API contracts, and business logic.

---

## Target Stack

- NestJS 11.
- TypeScript.
- Prisma.
- PostgreSQL.
- Redis.
- BullMQ.
- JWT auth.
- RBAC permission.
- OpenAPI/Swagger.

---

## Backend Structure

Use modular structure:

```txt
module/
├── dto/
├── controllers/
├── services/
├── guards/
├── repositories/       # optional for complex query
├── events/             # optional
└── module.ts
```

Core modules:

- auth
- users
- roles
- permissions
- tenants
- audit-logs
- notifications
- files
- settings

Domain modules:

- village-profile
- population
- family-card
- civil-events
- letters
- public-services
- social-assistance
- development-planning
- finance
- assets
- complaints
- news
- agenda
- gallery
- documents
- maps
- reports

---

## Backend Rules

- Controllers must be thin.
- Services contain business logic.
- DTOs must validate input.
- Every admin endpoint must have auth guard.
- Every protected endpoint must check permission.
- Every tenant-owned query must filter by `tenant_id`.
- Important mutations must write audit logs.
- Do not expose raw internal errors to client.
- Use transactions for multi-table writes.
- Use pagination for list endpoints.
- Use typed response contracts.
- Avoid circular dependencies.

---

## API Response Standard

```json
{
  "success": true,
  "message": "Data berhasil dimuat",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

---

## Validation

Run available commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma validate
```

If commands are not available, document the blocker and propose the missing script.
