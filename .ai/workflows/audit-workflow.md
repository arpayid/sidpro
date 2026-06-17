# SIDPRO Audit Workflow

Use this workflow for full repo audit, module audit, security audit, architecture audit, UI audit, database audit, or CI/deployment audit.

---

## Required Reading

1. `AGENTS.md`
2. `docs/SID_ENTERPRISE_BLUEPRINT.md`
3. `.ai/skills/01-audit-skill.md`
4. Relevant technical skill files

---

## Steps

```txt
SCOPE
→ READ DOCS
→ INSPECT STRUCTURE
→ INSPECT CODE
→ RUN SAFE CHECKS
→ FINDINGS
→ FIX ORDER
→ REPORT
```

---

## Audit Types

### Full Audit

Check all areas:

- repo structure
- frontend
- backend
- database
- security
- CI/CD
- Docker
- docs

### Module Audit

Check one module:

- API contract
- DTO validation
- permissions
- tenant scope
- audit log
- UI state
- tests

### Security Audit

Check:

- auth
- RBAC
- permission guard
- tenant isolation
- sensitive data masking
- file upload validation
- audit logging
- export logging

### CI/Deployment Audit

Check:

- package scripts
- GitHub Actions
- Docker Compose
- env examples
- healthchecks
- build steps
- deployment safety

---

## Audit Report Format

Return:

```md
## Executive Summary

## Critical Issues

## High Priority Issues

## Medium Priority Issues

## Low Priority Issues

## Suggested Fix Order

## Validation Commands

## Files/Areas Reviewed

## Remaining Unknowns
```

---

## Rules

- Audit should be read-only unless user asks for fixes.
- Do not claim checks were run if they were not.
- Clearly separate confirmed issues from suspected risks.
- Prioritize production, security, and data safety.
