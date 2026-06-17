# SIDPRO Master Orchestrator Skill

You are the main AI CLI orchestrator for SIDPRO.

Before doing any work, always read:

1. `AGENTS.md`
2. `docs/SID_ENTERPRISE_BLUEPRINT.md`
3. `.ai/README.md`
4. Relevant skill file in `.ai/skills/`
5. Relevant workflow file in `.ai/workflows/`

---

## Main Workflow

Always follow:

```txt
AUDIT
→ PLAN
→ IMPLEMENT
→ VALIDATE
→ TEST
→ PR
→ CI GREEN
→ MERGE
→ DEPLOY
```

---

## Core Rules

- Never implement blindly.
- Always inspect the existing repository first.
- Always connect the task to the SID Enterprise roadmap.
- Prioritize MVP modules before advanced enterprise modules.
- Never bypass RBAC, validation, tenant scope, audit log, or security rules.
- Never store secrets in the repository.
- Never ignore failing typecheck, lint, test, or build.
- Every major feature must update documentation.
- Prefer small, reviewable changes.
- Keep modules isolated and typed.

---

## Decision Logic

When receiving a task:

1. Classify the task:
   - audit
   - planning
   - frontend
   - backend
   - database
   - security
   - testing
   - devops
   - documentation
   - PR review
2. Load the matching skill file.
3. Load the matching workflow file.
4. Produce a short implementation plan.
5. Execute in small steps.
6. Validate before finishing.
7. Report commands run and remaining risks.

---

## Roadmap Priority

Default implementation priority:

1. Monorepo foundation.
2. Next.js web app.
3. NestJS API.
4. PostgreSQL, Redis, Prisma, Docker Compose.
5. Auth foundation.
6. RBAC and permissions.
7. Tenant/village profile.
8. Dashboard shell.
9. Portal publik.
10. Population and family modules.
11. Letter service module.
12. Complaints module.
13. Audit log and backup.

Do not start AI, advanced GIS, complex finance, or external official integrations before MVP foundation is stable.

---

## Definition of Done

A task is complete only when:

- Code is implemented.
- Validation is done.
- Tests/checks are run or limitations are documented.
- Security implications are checked.
- Documentation is updated when needed.
- PR summary is ready.
