# AUDIT-FINANCE — Budget Realization Ledger

**Status:** Implemented in migrations `20260628000800` through `20260628001000`.

## Problem

`budget_items.realized` previously acted as the only source of realization data and could be overwritten through the ordinary create and update APIs. That design did not retain a transaction trail, did not identify the author or reference document for each change, and made corrections indistinguishable from replacements.

## Control Design

`budget_realization_entries` is now the source of truth for financial realization activity. It records the tenant, budget item, entry type, positive amount, optional reference and description, occurrence time, author, and creation timestamp.

- `realization` adds to the current balance.
- `reversal` subtracts from the current balance and is rejected when it would make the balance negative.
- `migration_opening_balance` preserves historical cache values and compatible initial imports as explicit opening-balance entries.

The database maintains `budget_items.realized` as a read cache for existing reports and public transparency responses. API clients can no longer submit `realized` while creating or editing an item; they use `POST /finance/budget-items/:id/realizations` instead.

## Database Guarantees

- Ledger rows are append-only: PostgreSQL rejects `UPDATE` and `DELETE`.
- Direct updates to `budget_items.realized` are rejected.
- A positive `realized` value supplied during an initial item insert is immediately normalized into a `migration_opening_balance` ledger entry, preserving seed/import compatibility without leaving an unjournaled cache value.
- Negative initial values are rejected.
- Ledger entries must reference a budget item and author from the same tenant.
- Budget items with ledger history cannot be deleted.
- A budget item, budget year, or ledger author cannot be moved to a different tenant scope after entries exist.

## Deployment Requirements

1. Create and verify a database backup before deploying the migrations.
2. The first ledger migration rejects any existing negative `budget_items.realized` value. Reconcile such rows before deployment.
3. Historical positive cache values are copied into opening-balance ledger rows once, keeping the reported realized total unchanged.
4. Run the normal migration and seed pipeline. Seed data that includes initial realized values is normalized automatically.

## CI Coverage

`Tenant Link Integrity` applies every migration to PostgreSQL 17 and runs `scripts/db/test-budget-realization-ledger.sh`. The runtime test verifies realization and reversal behavior, direct-cache rejection, append-only protection, cross-tenant checks, parent-side scope guards, initial-value normalization, and retention of ledger history.
