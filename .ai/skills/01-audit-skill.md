# SIDPRO Audit Skill

Use this skill when auditing SIDPRO codebase, architecture, modules, security, dependency health, or production readiness.

---

## Audit Scope

Check:

- Repository structure.
- Monorepo consistency.
- Dependency health.
- TypeScript errors.
- Lint errors.
- Build errors.
- Security risks.
- Missing validation.
- Missing RBAC.
- Missing tenant filtering.
- Missing audit log.
- Bad folder structure.
- Duplicated code.
- Dead code.
- Broken API contracts.
- Broken UI state.
- Prisma schema issues.
- Unsafe migrations.
- Docker/CI issues.
- Missing documentation.

---

## Audit Process

1. Read `AGENTS.md`.
2. Read `docs/SID_ENTERPRISE_BLUEPRINT.md`.
3. Read `.ai/skills/00-master-orchestrator.md`.
4. Inspect repo tree.
5. Inspect package manager and workspace files.
6. Inspect frontend, backend, database, Docker, CI, and docs.
7. Run safe read-only checks when available.
8. Produce findings by severity.

---

## Audit Output Format

Return:

1. Executive summary.
2. Critical issues.
3. High priority issues.
4. Medium priority issues.
5. Low priority issues.
6. Suggested fix order.
7. Files affected.
8. Validation commands.
9. Risks if not fixed.

---

## Severity Guide

Critical:

- Security bypass.
- Cross-tenant data leak.
- Broken auth.
- Production build impossible.
- Data loss risk.

High:

- Missing validation on sensitive API.
- Missing RBAC on admin endpoint.
- Broken migration.
- Major UI/API mismatch.

Medium:

- Inconsistent module structure.
- Poor error handling.
- Missing tests.
- Performance issue.

Low:

- Naming issue.
- Documentation gap.
- Minor refactor opportunity.

---

## Important Rules

- Do not modify code during audit unless explicitly requested.
- If fixing is requested, produce plan first.
- Prioritize production-breaking issues.
- Do not claim validation was run if it was not run.
- When checks cannot run, explain the blocker.
