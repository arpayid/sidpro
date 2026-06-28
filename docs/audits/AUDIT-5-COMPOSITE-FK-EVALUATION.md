# AUDIT-5 — Composite Foreign-Key Evaluation

## Decision

**Status:** Evaluated. Existing tenant-link triggers remain the authoritative protection for the current schema. No broad trigger-to-composite-FK conversion is included in AUDIT-5.

This is a deliberate risk decision, not a claim that composite foreign keys are unsuitable. They are useful for simple tenant-owned references, but several current invariants are not expressible by a single composite foreign key and require trigger or lifecycle logic regardless.

## Evaluated Pattern

For a simple tenant-owned parent reference, PostgreSQL can enforce tenant ownership declaratively with:

```sql
ALTER TABLE parent ADD CONSTRAINT parent_tenant_id_id_key UNIQUE (tenant_id, id);
ALTER TABLE child
  ADD CONSTRAINT child_same_tenant_parent_fkey
  FOREIGN KEY (tenant_id, parent_id)
  REFERENCES parent (tenant_id, id);
```

The parent must have a unique key on `(tenant_id, id)`, even when `id` is already globally unique. The child must carry both `tenant_id` and `parent_id` with compatible nullability.

## What Composite Foreign Keys Could Improve

| Relationship class | Examples in current AUDIT-5 scope | Potential value |
| --- | --- | --- |
| Simple tenant-owned optional file reference | finance documents, gallery items, letter outputs → files | Prevent cross-tenant file IDs declaratively and preserve normal foreign-key delete semantics. |
| Simple tenant-owned entity reference | letter template → letter type; civil event → resident | Prevent cross-tenant parent links without per-row lookup triggers. |
| Simple tenant-owned business reference | aid recipient → program/resident/family; BUMDes record → unit | Make tenant ownership visible directly in the database constraint graph. |

## Invariants That Still Require Trigger or Lifecycle Logic

| Invariant | Why a composite FK alone is insufficient |
| --- | --- |
| Address RT/RW belongs to selected hamlet | The child contains two independent references whose parent values must agree with each other. This is a cross-reference hierarchy rule, not merely a same-tenant rule. |
| Global versus tenant user-role scope | `roles.tenant_id` may be `NULL` for a global role, while global users and tenant users follow different scope rules. A nullable composite FK does not encode the full policy. |
| Parent tenant drift | Existing guards reject moving a tenant-owned parent when dependent links would become invalid. A staged composite-FK rollout must test update behavior and compatibility with all dependent relations. |
| Resident soft-delete cleanup | Soft delete is not a foreign-key delete. Family membership/head cleanup remains lifecycle logic. |
| Budget realization ledger | Append-only writes, reversal ceiling, cache updates, author/item scope, and opening-balance rules are transactional invariants beyond referential integrity. |
| Storage cleanup safety | Prefix ownership, reference re-check, retry claim, and object-storage compensation are application/worker invariants. |

## Why a Broad Conversion Is Deferred

1. **Migration scope is large.** Each referenced parent requires a composite unique key, each child requires a composite foreign key, and every historical dataset must pass preflight before validation.
2. **Prisma representation needs a controlled prototype.** The schema already uses `tenantId` in the direct `Tenant` relation. Any child relation that also consumes `[tenantId, parentId]` must be schema-validated and generated before it is adopted broadly.
3. **Existing guards have runtime PostgreSQL coverage.** The Tenant Link Integrity gate intentionally tests invalid writes and tenant-drift scenarios. Replacing correct controls without a staged migration adds risk without immediate production evidence.
4. **Some rules are inherently non-FK.** The table above shows the trigger/lifecycle controls that remain necessary even after simple references gain composite FKs.

## Staged Adoption Criteria

A future composite-FK pilot may proceed only when all conditions are met:

1. Choose one simple relationship with no hierarchy or global-role semantics.
2. Add data preflight that returns zero violations for that exact relationship.
3. Add parent `(tenant_id, id)` unique key and child composite FK in a dedicated migration.
4. Validate Prisma schema generation, API behavior, and direct SQL rejection in CI.
5. Keep the existing trigger during the first release; remove it only after production-like validation and a documented decision.
6. Record performance and lock behavior for the migration on a persistent staging dataset.

## Candidate First Pilot

`finance_documents(tenant_id, file_id) → files(tenant_id, id)` is the preferred first pilot because it is a simple optional tenant-owned file reference and already has `ON DELETE RESTRICT` behavior. It is **not implemented in this audit** because no historical/staging dataset is available to validate the new constraint against existing data.

## Current Conclusion

The AUDIT-5 requirement to evaluate composite foreign keys is complete at repository level. The safe outcome is to retain the tested trigger guards and treat any future FK migration as a separately scoped, preflight-gated change.
