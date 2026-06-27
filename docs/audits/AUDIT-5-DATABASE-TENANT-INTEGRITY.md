# AUDIT-5 — Database and Tenant Integrity

**Status:** In progress — first P1 guard set implemented in PR scope.

## Confirmed Findings

The schema keeps `tenant_id` on most domain rows, but several relationships use an independent reference ID without a composite foreign key that also verifies tenant ownership. Service-level validation was missing for these confirmed paths:

| Severity | Relationship | Risk |
| --- | --- | --- |
| P1 | `families.address_id` | A family can be linked to an address from another tenant when a caller supplies a foreign ID. |
| P1 | `letter_templates.letter_type_id` | A tenant can persist a template linked to another tenant's letter type. |
| P1 | `aid_recipients.program_id`, `resident_id`, `family_id` | Aid recipients can combine records from separate tenants. |
| P1 | `finance_documents.file_id` | Financial document metadata can point to a file owned by another tenant. |
| P1 | `gallery_items.file_id` | Gallery metadata can point to a file owned by another tenant. |

## Implemented Guard

Migration `20260628000200_enforce_tenant_link_guards` adds PostgreSQL `BEFORE INSERT OR UPDATE` triggers. They reject missing or cross-tenant reference IDs with integrity errors before invalid data can be committed.

The migration is non-destructive. It protects new writes and does not alter historical records. Run the preflight query before staging or production rollout:

```bash
psql "$DATABASE_URL" -f scripts/db/verify-tenant-link-integrity.sql
```

A zero-row result is required for a clean historical dataset.

## Remaining AUDIT-5 Work

1. Extend database-level guard coverage to remaining tenant-owned relationships after service-path review.
2. Evaluate staged replacement of trigger guards with composite unique keys and composite foreign keys where Prisma migration support is practical.
3. Add integration tests against PostgreSQL that attempt cross-tenant writes and expect an integrity error.
4. Verify index plan for all high-volume tenant-scoped filters and report/export queries.
5. Reconcile any historical violations found by the preflight script before production go-live.
