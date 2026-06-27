# AUDIT-5 — Database and Tenant Integrity

**Status:** In progress — first P1/P2 guard set implemented in PR scope.

## Confirmed Findings

The schema keeps `tenant_id` on most domain rows, but several relationships use an independent reference ID without a composite foreign key that also verifies tenant ownership. Service-level validation was missing for these confirmed paths:

| Severity | Relationship | Risk |
| --- | --- | --- |
| P1 | `families.address_id` | A family can be linked to an address from another tenant when a caller supplies a foreign ID. |
| P1 | `letter_templates.letter_type_id` | A tenant can persist a template linked to another tenant's letter type. |
| P1 | `aid_recipients.program_id`, `resident_id`, `family_id` | Aid recipients can combine records from separate tenants. |
| P1 | `finance_documents.file_id` | Financial document metadata can point to a file owned by another tenant. |
| P1 | `gallery_items.file_id` | Gallery metadata can point to a file owned by another tenant. |
| P1 | `letter_outputs.letter_request_id`, `file_id` | A generated letter output can be linked to a request or file from another tenant. |
| P2 | Deleting a referenced file | The old file-delete path removed object storage before database metadata, risking dangling `file_id` values or a database row that points to a missing object. |

## Implemented Guard

Migration `20260628000200_enforce_tenant_link_guards` adds PostgreSQL `BEFORE INSERT OR UPDATE` triggers. They reject missing or cross-tenant reference IDs with integrity errors before invalid data can be committed.

It also adds `ON DELETE RESTRICT` foreign keys for `finance_documents.file_id`, `gallery_items.file_id`, and `letter_outputs.file_id`. `FilesService.remove()` deletes metadata first, converts a foreign-key violation into a conflict response, and only then deletes the object from storage. When object-storage cleanup fails after successful metadata deletion, it is explicitly audit-logged as `storage_cleanup_required` rather than recreating a dangling record.

Run the preflight query before staging or production rollout:

```bash
psql "$DATABASE_URL" -f scripts/db/verify-tenant-link-integrity.sql
```

A zero-row result is required for a clean historical dataset. The migration does not modify historical rows; any preflight finding must be reconciled before production go-live.

## Remaining AUDIT-5 Work

1. Extend database-level guard coverage to remaining tenant-owned relationships after service-path review.
2. Evaluate staged replacement of trigger guards with composite unique keys and composite foreign keys where Prisma migration support is practical.
3. Add integration tests against PostgreSQL that attempt cross-tenant writes and expect an integrity error.
4. Verify index plan for all high-volume tenant-scoped filters and report/export queries.
5. Add a durable storage-orphan cleanup worker for failures recorded as `storage_cleanup_required`.
6. Reconcile any historical violations found by the preflight script before production go-live.
