# SIDPRO Bugfix Workflow

Use this workflow for bugs, broken logic, failed tests, failed build, UI errors, API errors, security defects, or production issues.

---

## Required Reading

1. `AGENTS.md`
2. `docs/SID_ENTERPRISE_BLUEPRINT.md`
3. `.ai/skills/01-audit-skill.md`
4. `.ai/skills/07-testing-validation-skill.md`
5. Relevant technical skill file

---

## Steps

```txt
REPRODUCE
→ ISOLATE
→ ROOT CAUSE
→ PLAN FIX
→ IMPLEMENT
→ VALIDATE
→ REGRESSION CHECK
→ DOCS/PR SUMMARY
```

---

## Bugfix Process

1. Understand the reported issue.
2. Identify affected module.
3. Reproduce the issue if possible.
4. Inspect logs/errors/tests.
5. Identify root cause.
6. Create minimal fix plan.
7. Implement the smallest safe fix.
8. Add or update test if possible.
9. Run relevant validation.
10. Check for regression.
11. Document result.

---

## Root Cause Format

Return:

- Symptom.
- Actual cause.
- Affected files.
- Why it happened.
- Why the fix is safe.

---

## Validation

Run relevant commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma validate
```

For Docker/deployment bugs:

```bash
docker compose config
docker compose up -d --build
docker compose ps
```

---

## Safety Rules

- Do not rewrite large areas for a small bug.
- Do not hide errors.
- Do not disable tests to pass CI.
- Do not weaken validation or security to fix UX/API issues.
- Do not remove tenant filters or permission checks.

---

## Final Output

Report:

1. Bug summary.
2. Root cause.
3. Fix applied.
4. Validation result.
5. Regression risk.
6. Follow-up if needed.
