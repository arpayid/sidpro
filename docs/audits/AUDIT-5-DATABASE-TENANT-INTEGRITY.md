# AUDIT-5 — Database and Tenant Integrity

**Status:** In progress — database guard implementation and PostgreSQL integration gate are active.

## Confirmed Findings

The schema keeps `tenant_id` on most domain rows, but several relationships use an independent reference ID without a composite foreign key that also verifies tenant ownership. Service-level checks cover common API paths; database-level enforcement is still required to protect imports, future mutation paths, and direct operational access.

| Severity | Relationship | Risk |
| --- | --- | --- |
| P1 | `families.address_id`, `head_resident_id` | A family can be linked to an address or resident from another tenant. |
| P1 | `neighborhood_units.hamlet_id` | An RT/RW unit can be linked to a dusun from another tenant. |
| P1 | `addresses.hamlet_id`, `neighborhood_unit_id` | An address can link to another tenant or an RT/RW that belongs to a different dusun. |
| P1 | `residents.family_id`, `address_id` | A resident can be associated with a family or address from another tenant. |
| P1 | `family_members.family_id`, `resident_id` | A household member can combine a family and resident from different tenants. |
| P1 | `civil_events.resident_id` | A population event can be recorded against a resident from another tenant. |
| P1 | `letter_templates.letter_type_id` | A tenant can persist a template linked to another tenant's letter type. |
| P1 | `aid_recipients.program_id`, `resident_id`, `family_id` | Aid recipients can combine records from separate tenants. |
| P1 | `finance_documents.file_id`, `gallery_items.file_id`, `letter_outputs.file_id` | Tenant-owned metadata can point to a file from another tenant. |
| P1 | `letter_outputs.letter_request_id` | A generated output can be linked to a request from another tenant. |
| P1 | `bumdes_financial_records.unit_id` | A BUMDes financial record can be linked to another tenant's business unit. |
| P2 | Deleting a referenced file | The old file-delete path removed object storage before database metadata, risking dangling `file_id` values or a database row that points to a missing object. |

## Implemented Guard

Migration `20260628000200_enforce_tenant_link_guards` protects the initial P1 set and adds `ON DELETE RESTRICT` foreign keys for files referenced by finance documents, gallery items, and letter outputs. `FilesService.remove()` deletes metadata first, converts a foreign-key violation into a conflict response, and audit-logs a storage cleanup failure after metadata removal.

Migration `20260628000300_enforce_population_tenant_link_guards` extends PostgreSQL `BEFORE INSERT OR UPDATE` triggers to the population hierarchy and BUMDes financial records. It also rejects an address when its selected RT/RW belongs to a different dusun, even if both rows happen to have the same tenant.

Both migrations are non-destructive: they protect future writes and do not mutate historical rows.

## PostgreSQL Integration Gate

Workflow `Tenant Link Integrity` runs on every relevant pull request and push. It creates a clean PostgreSQL 17 database, applies all Prisma migrations, seeds the dataset, requires the centralized preflight to return zero rows, then performs valid and intentionally invalid writes in rollback-only transactions.

The gate covers every P1 trigger currently introduced by the AUDIT-5 migrations. Invalid writes must fail with `SQLSTATE 23514` for:

- family address and family head-resident links;
- letter-template type links;
- aid program, resident, and family links;
- finance document, gallery, and letter-output file links;
- letter-output request links;
- neighborhood unit, address, resident, family-member, civil-event, and BUMDes links;
- the address RT/RW-to-dusun hierarchy invariant.

This verifies runtime database behavior rather than only static migration text. Test fixtures are always rolled back.

## Preflight Before Staging or Production

Run the centralized integrity preflight before deploying either migration to a database containing existing data:

```bash
psql "$DATABASE_URL" -f scripts/db/verify-tenant-link-integrity.sql
```

A zero-row result is required for a clean historical dataset. Any result must be reconciled before production go-live.

## Remaining AUDIT-5 Work

1. Review and protect remaining tenant-owned links in letters, complaints, notifications, and role assignments where system/global scope semantics need explicit policy.
2. Evaluate staged replacement of trigger guards with composite unique keys and composite foreign keys where Prisma migration support and data preflight make that practical.
3. Verify index plans for high-volume tenant-scoped filters and report/export queries.
4. Add a durable storage-orphan cleanup worker for failures recorded as `storage_cleanup_required`.
5. Reconcile any historical violations found by the preflight script before production go-live.
