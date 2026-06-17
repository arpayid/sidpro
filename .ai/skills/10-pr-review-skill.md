# SIDPRO PR Review Skill

Use this skill before opening, updating, approving, or merging a PR.

---

## Review Checklist

Check:

- Does this match `docs/SID_ENTERPRISE_BLUEPRINT.md`?
- Is the scope clear?
- Is the code modular?
- Are TypeScript types correct?
- Are DTO/schema validations present?
- Are permissions applied?
- Is tenant scope applied?
- Are sensitive mutations audited?
- Are database migrations safe?
- Are tests/checks passing?
- Is documentation updated?
- Are secrets excluded?
- Is rollback risk documented?

---

## PR Description Format

Use:

```md
## Summary

## Changes

## Validation

## Security Notes

## Risk

## Rollback Plan

## Follow-up
```

---

## Review Process

1. Read PR summary.
2. Inspect changed files.
3. Check scope against blueprint.
4. Check security-sensitive code.
5. Check database migrations.
6. Check validation results.
7. Check docs.
8. Produce approve/request-changes recommendation.

---

## High Risk Flags

Request changes if:

- Admin endpoint has no auth guard.
- Mutation has no permission check.
- Tenant-owned data has no tenant filter.
- Sensitive export has no audit log.
- Migration can cause data loss without warning.
- Secrets are committed.
- CI fails.
- Build fails.
- TypeScript errors are ignored.

---

## Final Review Output

Return:

1. Summary.
2. Blocking issues.
3. Non-blocking issues.
4. Security notes.
5. Validation status.
6. Merge recommendation.
