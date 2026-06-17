# SIDPRO Planning Skill

Use this skill before implementing features, refactors, architecture changes, database changes, security changes, or deployment changes.

---

## Required Plan Format

For every feature or significant change, produce:

1. Goal.
2. Related roadmap phase.
3. Modules affected.
4. Current repo state.
5. Database changes.
6. API changes.
7. UI changes.
8. Security/RBAC impact.
9. Tenant-scope impact.
10. Audit log requirement.
11. Testing plan.
12. Rollback risk.
13. Implementation steps.
14. Definition of done.

---

## Planning Rules

- Do not start implementation before the plan is clear.
- Prefer small incremental work.
- Prioritize MVP modules.
- Avoid over-engineering.
- Do not introduce infrastructure complexity before foundation is stable.
- Do not create external integrations without adapter boundaries.
- Every plan must mention validation commands.

---

## MVP Priority

Plan work in this order unless user explicitly changes priority:

1. Project foundation.
2. Auth.
3. RBAC.
4. Tenant/village profile.
5. Portal publik.
6. Dashboard admin shell.
7. Population.
8. Family/KK.
9. Letters.
10. Complaints.
11. Audit logs.
12. Backup.

---

## Implementation Step Style

Use clear steps:

```txt
Step 1 — Inspect current structure
Step 2 — Create/modify database schema
Step 3 — Implement backend API
Step 4 — Implement frontend UI
Step 5 — Add RBAC/audit log
Step 6 — Add tests/validation
Step 7 — Update docs
```

---

## Planning Output Rules

- Be specific about files/folders likely to change.
- Mention risks early.
- Identify dependencies needed.
- Identify commands to run.
- Do not make unrealistic claims.
