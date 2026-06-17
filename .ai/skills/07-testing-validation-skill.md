# SIDPRO Testing and Validation Skill

Use this skill before finishing any implementation, refactor, database change, UI change, backend change, or deployment change.

---

## Required Checks

Run available commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma validate
```

If Docker is part of the change:

```bash
docker compose config
docker compose up -d --build
docker compose ps
```

If commands do not exist, document it clearly and suggest adding them.

---

## Validation Report Format

Return:

1. Commands run.
2. Result of each command.
3. Errors found.
4. Fixes applied.
5. Remaining risks.
6. Manual testing steps.
7. Follow-up recommendations.

---

## Testing Scope

Frontend:

- Page renders.
- Form validation works.
- Table search/filter/pagination works.
- Loading/error/empty states exist.
- Responsive layout works.
- Sensitive data masking works.

Backend:

- DTO validation works.
- Auth guard works.
- Permission guard works.
- Tenant filter works.
- Audit log writes correctly.
- Error handling is safe.
- Pagination works.

Database:

- Prisma schema validates.
- Migrations are safe.
- Indexes exist for important queries.
- Unique constraints are correct.

Security:

- No secrets committed.
- Sensitive endpoints protected.
- Export actions logged.
- Cross-tenant access blocked.

---

## Rules

- Do not claim success without validation.
- Do not ignore failing checks.
- If dependency installation fails, report the blocker clearly.
- If tests are missing, state that tests are missing and propose minimal test coverage.
- If only manual validation is possible, document the exact manual steps.
