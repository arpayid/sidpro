# AUDIT-5 — Database and Tenant Integrity

**Status:** In progress — domain and identity tenant-link guards, BUMDes financial-history retention, and resident-family lifecycle cleanup are covered by PostgreSQL integration gates.

## Confirmed Findings

The schema keeps `tenant_id` on most domain rows, but several relationships use an independent reference ID without a composite foreign key that also verifies tenant ownership. Service-level checks cover common API paths; database-level enforcement is required to protect imports, future mutation paths, and direct operational access.

| Severity | Relationship | Risk |
| --- | --- | --- |
| P1 | `families.address_id`, `head_resident_id` | A family can be linked to an address or resident from another tenant. |
| P1 | `neighborhood_units.hamlet_id` | An RT/RW unit can be linked to a dusun from another tenant. |
| P1 | `addresses.hamlet_id`, `neighborhood_unit_id` | An address can link to another tenant or an RT/RW that belongs to a different dusun. |
| P1 | `residents.family_id`, `address_id` | A resident can be associated with a family or address from another tenant. |
| P1 | `family_members.family_id`, `resident_id` | A household member can combine a family and resident from different tenants. |
| P1 | `civil_events.resident_id` | A population event can be recorded against a resident from another tenant. |
| P1 | `letter_templates.letter_type_id` | A tenant can persist a template linked to another tenant's letter type. |
| P1 | `letter_requests.requester_id`, `resident_id`, `letter_type_id` | A request can combine identity, resident, or type records from different tenant scopes. |
| P1 | `letter_approvals.letter_request_id`, `approver_id`; `letter_number_sequences.letter_type_id` | Approval and numbering rows can be attached across tenant boundaries; approver had no foreign key. |
| P1 | `aid_recipients.program_id`, `resident_id`, `family_id` | Aid recipients can combine records from separate tenants. |
| P1 | `finance_documents.file_id`, `gallery_items.file_id`, `letter_outputs.file_id` | Tenant-owned metadata can point to a file from another tenant. |
| P1 | `letter_outputs.letter_request_id` | A generated output can be linked to a request from another tenant. |
| P1 | `bumdes_financial_records.unit_id` | A BUMDes financial record can be linked to another tenant's business unit. |
| P1 | Deleting `bumdes_units` with financial history | A cascading foreign key can silently erase accounting records. |
| P1 | `user_roles.user_id` ↔ `role_id` | A global user could receive a tenant role, or a user could receive a role owned by another tenant, escalating access. |
| P1 | `notifications.user_id` | A notification row could target a user from another tenant. |
| P1 | `complaints.reporter_id`, `assignee_id`, `complaint_responses.responder_id` | Complaint identity references could cross tenant boundaries despite normal API checks. |
| P2 | Soft-deleted resident linked as a family member or head | A resident marked deleted can remain visible as an active household member or head of family. |
| P2 | Deleting a referenced file | The old file-delete path removed object storage before database metadata, risking dangling `file_id` values or a database row that points to a missing object. |

## Tenant Scope Policy

`superadmin_system` is a global role with `roles.tenant_id = NULL`. A global user may only hold global roles. A user with a non-null `users.tenant_id` may only hold roles with the exact same tenant ID. This makes global and tenant scope intentionally distinct, not interchangeable.

## Implemented Guard

Migration `20260628000200_enforce_tenant_link_guards` protects the initial P1 set and adds `ON DELETE RESTRICT` foreign keys for files referenced by finance documents, gallery items, and letter outputs. `FilesService.remove()` deletes metadata first, converts a foreign-key violation into a conflict response, and audit-logs a storage cleanup failure after metadata removal.

Migration `20260628000300_enforce_population_tenant_link_guards` extends PostgreSQL `BEFORE INSERT OR UPDATE` triggers to the population hierarchy and BUMDes financial records. It also rejects an address when its selected RT/RW belongs to a different dusun, even if both rows happen to have the same tenant.

Migration `20260628000400_enforce_identity_tenant_link_guards` extends exact-scope checks to user-role grants, notifications, complaint reporter/assignee links, and complaint-response responders. It also prevents moving a user, role, or complaint to a different tenant while dependent identity links would become invalid. A nullable complaint responder now has a foreign key to `users` with `ON DELETE SET NULL`.

Migration `20260628000500_protect_bumdes_financial_history` replaces the `bumdes_financial_records.unit_id` cascade with `ON DELETE RESTRICT`. Units with posted financial records must be changed to `inactive`; they cannot be hard-deleted. The API performs an explanatory pre-check and maps a concurrent foreign-key conflict to a safe conflict response.

Migration `20260628000600_enforce_letter_tenant_link_guards` protects letter request requester, resident, and type links; approval request and approver links; and letter-number-sequence type links. It also blocks parent tenant moves that would invalidate these relationships and adds `letter_approvals.approver_id → users.id ON DELETE SET NULL`.

Migration `20260628000700_clean_soft_deleted_resident_links` intentionally reconciles historical records: it removes family-membership rows for already deleted residents, clears affected household heads, and clears their direct family link. Thereafter, trigger guards perform the same cleanup whenever `residents.deleted_at` transitions from `NULL` to a timestamp. Restoring a resident does not recreate a prior family assignment; re-assignment remains an explicit administrative action.

Migrations `00200` through `00600` are non-destructive protections for future writes. Migration `00700` is an intentional, bounded data reconciliation and should be deployed only with a verified database backup.

## PostgreSQL Integration Gate

Workflow `Tenant Link Integrity` runs on every relevant pull request and push. It creates a clean PostgreSQL 17 database, applies all Prisma migrations, seeds the dataset, requires the relevant preflights to return zero rows, then performs valid and intentionally invalid writes in rollback-only transactions.

The gate covers every P1 trigger currently introduced by the AUDIT-5 migrations. Invalid writes must fail with `SQLSTATE 23514` for:

- family address and family head-resident links;
- letter-template, request, approval, and numbering links;
- aid program, resident, and family links;
- finance document, gallery, and letter-output file links;
- letter-output request links;
- neighborhood unit, address, resident, family-member, civil-event, and BUMDes links;
- the address RT/RW-to-dusun hierarchy invariant;
- global-versus-tenant user-role scope, notification recipients, complaint reporter/assignee links, and complaint-response responders.

A BUMDes unit deletion with financial records must fail with `SQLSTATE 23503`. The resident-family lifecycle test verifies a deleted resident loses direct family membership, household membership, and household-head status without affecting other active members or implicitly restoring stale links. This verifies runtime database behavior rather than only static migration text. Test fixtures are always rolled back.

## Preflight Before Staging or Production

Run both integrity preflights before deploying tenant-link guard migrations to a database containing existing data:

```bash
psql "$DATABASE_URL" -f scripts/db/verify-tenant-link-integrity.sql
psql "$DATABASE_URL" -f scripts/db/verify-identity-tenant-link-integrity.sql
```

Each command must return zero rows. Any result must be reconciled before production go-live. `scripts/staging-post-deploy-validate.sh` runs both checks automatically.

Before applying migration `20260628000700_clean_soft_deleted_resident_links`, create and verify a database backup. The migration intentionally reconciles obsolete household links for rows already marked deleted.

## Remaining AUDIT-5 Work

1. Evaluate staged replacement of trigger guards with composite unique keys and composite foreign keys where Prisma migration support and data preflight make that practical.
2. Verify index plans with production-like `EXPLAIN (ANALYZE, BUFFERS)` evidence for high-volume tenant-scoped reports and exports.
3. Verify deployment, observability, and retry handling for the durable storage-orphan cleanup worker.
4. Reconcile any historical violations found by the tenant-link preflights before production go-live.
5. Define an append-only financial ledger before treating `budget_items.realized` as an authoritative accounting value.
