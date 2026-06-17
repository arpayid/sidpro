# SIDPRO Feature Workflow

Use this workflow for every new feature.

---

## Required Reading

Before work:

1. `AGENTS.md`
2. `docs/SID_ENTERPRISE_BLUEPRINT.md`
3. `.ai/README.md`
4. `.ai/skills/00-master-orchestrator.md`
5. Relevant skill file

---

## Steps

```txt
AUDIT
→ PLAN
→ IMPLEMENT
→ VALIDATE
→ TEST
→ DOCS
→ PR SUMMARY
```

Detailed steps:

1. Read required docs.
2. Identify related roadmap phase.
3. Audit existing related code.
4. Create implementation plan.
5. Implement database changes if needed.
6. Implement backend API if needed.
7. Implement frontend UI if needed.
8. Add validation.
9. Add permission/RBAC.
10. Add audit log where needed.
11. Run checks.
12. Update docs.
13. Prepare PR summary.

---

## Required Plan

Every feature plan must include:

- Goal.
- Roadmap phase.
- Modules affected.
- Database changes.
- API changes.
- UI changes.
- RBAC/security impact.
- Audit log impact.
- Validation commands.
- Risks.

---

## Required Output

At the end, report:

- What changed.
- Why it changed.
- Files changed.
- Commands run.
- Validation result.
- Risks.
- Next step.

---

## Feature Done Criteria

A feature is done only if:

- UI/API/database pieces are complete as needed.
- Validation exists.
- Permission exists.
- Tenant scope exists if relevant.
- Audit log exists for sensitive mutation.
- Checks pass or blockers are documented.
- Docs are updated when needed.
