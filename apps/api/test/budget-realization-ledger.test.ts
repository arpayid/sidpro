import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createBudgetItemSchema,
  createBudgetRealizationEntrySchema,
  updateBudgetItemSchema,
} from '@sidpro/validators';
import { FinanceService } from '../src/modules/finance/finance.service.js';

const migration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260628000800_add_budget_realization_ledger/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
const parentScopeMigration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260628000900_enforce_budget_realization_parent_scope/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
const runtimeTest = readFileSync(
  new URL('../../../scripts/db/test-budget-realization-ledger.sh', import.meta.url),
  'utf8',
);
const workflow = readFileSync(
  new URL('../../../.github/workflows/tenant-link-integrity.yml', import.meta.url),
  'utf8',
);

const user = {
  sub: 'user-a',
  email: 'admin@example.test',
  roles: ['admin_desa'],
  permissions: ['finance.manage'],
  tenantId: 'tenant-a',
};

describe('budget realization ledger', () => {
  it('rejects direct realized values and accepts only append-only transaction payloads', () => {
    assert.equal(
      createBudgetItemSchema.safeParse({
        category: 'Belanja',
        name: 'Peralatan',
        planned: 100,
        realized: 50,
      }).success,
      false,
    );
    assert.equal(updateBudgetItemSchema.safeParse({ realized: 50 }).success, false);
    assert.equal(
      createBudgetRealizationEntrySchema.safeParse({ type: 'realization', amount: 50 }).success,
      true,
    );
    assert.equal(
      createBudgetRealizationEntrySchema.safeParse({ type: 'reversal', amount: 0 }).success,
      false,
    );
  });

  it('creates a ledger entry inside a transaction instead of directly updating realized', async () => {
    let rawInsertCount = 0;
    const auditEvents: Array<Record<string, unknown>> = [];
    const prisma = {
      $transaction: async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
        callback({
          budgetItem: {
            findFirst: async () => ({
              id: 'item-a',
              budgetYear: { tenantId: 'tenant-a' },
            }),
            findUnique: async () => ({
              id: 'item-a',
              realized: 125,
            }),
          },
          $executeRaw: async () => {
            rawInsertCount += 1;
          },
        }),
    };
    const service = new FinanceService(prisma as never, {
      log: async (event: Record<string, unknown>) => auditEvents.push(event),
    } as never);

    const result = await service.createBudgetRealizationEntry(
      user as never,
      'item-a',
      { type: 'realization', amount: 125, reference: 'BKM-001' },
      '127.0.0.1',
    );

    assert.equal(rawInsertCount, 1);
    assert.equal(result.success, true);
    assert.equal(result.data.entry.type, 'realization');
    assert.equal(result.data.entry.amount, 125);
    assert.equal(result.data.budgetItem.realized, 125);
    assert.equal(auditEvents[0]?.entityType, 'budget_realization_entry');
    assert.equal(
      (auditEvents[0]?.metadata as { budgetItemId?: string } | undefined)?.budgetItemId,
      'item-a',
    );
  });

  it('backfills historical realized values and guards the cache plus ledger mutations', () => {
    assert.match(migration, /Saldo realisasi saat migrasi ledger/);
    assert.match(migration, /migration_opening_balance/);
    assert.match(migration, /budget_items_realized_update_guard/);
    assert.match(migration, /budget_realization_entries_no_update/);
    assert.match(migration, /budget_realization_entries_no_delete/);
    assert.match(migration, /reversal cannot exceed the current realized balance/);
    assert.match(migration, /budget_item_id must belong to the same tenant/);
  });

  it('prevents parent-side tenant drift after a ledger entry exists', () => {
    assert.match(parentScopeMigration, /budget_items_realization_budget_year_scope_guard/);
    assert.match(parentScopeMigration, /budget_years_realization_tenant_scope_guard/);
    assert.match(parentScopeMigration, /users_realization_author_tenant_scope_guard/);
  });

  it('runs a PostgreSQL runtime gate for cache, tenant, and append-only invariants', () => {
    assert.match(runtimeTest, /direct realized cache edit was accepted/);
    assert.match(runtimeTest, /ledger update was accepted/);
    assert.match(runtimeTest, /ledger delete was accepted/);
    assert.match(runtimeTest, /over-reversal was accepted/);
    assert.match(runtimeTest, /cross-tenant budget item link was accepted/);
    assert.match(runtimeTest, /cross-tenant ledger author link was accepted/);
    assert.match(runtimeTest, /ledger budget item was moved to a year from another tenant/);
    assert.match(runtimeTest, /ledger budget year tenant was changed/);
    assert.match(runtimeTest, /ledger author tenant was changed/);
    assert.match(workflow, /scripts\/db\/test-budget-realization-ledger\.sh/);
    assert.match(workflow, /bash scripts\/db\/test-budget-realization-ledger\.sh/);
  });
});
