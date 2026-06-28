import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ConflictException } from '@nestjs/common';
import { BumdesService } from '../src/modules/bumdes/bumdes.service.js';

const migration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260628000500_protect_bumdes_financial_history/migration.sql',
    import.meta.url,
  ),
  'utf8',
);

const user = {
  sub: 'user-a',
  email: 'admin@example.test',
  roles: ['admin_desa'],
  permissions: [],
  tenantId: 'tenant-a',
};

type Query = { where: Record<string, unknown> };

describe('BUMDes financial history protection', () => {
  it('replaces the cascading unit foreign key with a restrictive delete policy', () => {
    assert.match(
      migration,
      /DROP CONSTRAINT IF EXISTS "bumdes_financial_records_unit_id_fkey"/,
    );
    assert.match(
      migration,
      /FOREIGN KEY \("unit_id"\) REFERENCES "bumdes_units"\("id"\)\s+ON DELETE RESTRICT\s+ON UPDATE CASCADE/,
    );
    assert.doesNotMatch(migration, /ON DELETE CASCADE/);
  });

  it('blocks deletion before a unit with financial records can be removed', async () => {
    let deleteCalled = false;
    const prisma = {
      bumdesUnit: {
        findFirst: async ({ where }: Query) => {
          assert.deepEqual(where, { id: 'unit-a', tenantId: 'tenant-a' });
          return { id: 'unit-a', tenantId: 'tenant-a' };
        },
        delete: async () => {
          deleteCalled = true;
        },
      },
      bumdesFinancialRecord: {
        count: async ({ where }: Query) => {
          assert.deepEqual(where, { tenantId: 'tenant-a', unitId: 'unit-a' });
          return 1;
        },
      },
    };
    const service = new BumdesService(prisma as never, { log: async () => undefined } as never);

    await assert.rejects(service.remove(user as never, 'unit-a'), ConflictException);
    assert.equal(deleteCalled, false);
  });

  it('converts a concurrent database foreign-key conflict into a safe response', async () => {
    const prisma = {
      bumdesUnit: {
        findFirst: async () => ({ id: 'unit-a', tenantId: 'tenant-a' }),
        delete: async () => {
          throw Object.assign(new Error('foreign key violation'), { code: 'P2003' });
        },
      },
      bumdesFinancialRecord: { count: async () => 0 },
    };
    const service = new BumdesService(prisma as never, { log: async () => undefined } as never);

    await assert.rejects(service.remove(user as never, 'unit-a'), ConflictException);
  });

  it('deletes a unit without financial history and writes an audit event', async () => {
    const auditEvents: Array<Record<string, unknown>> = [];
    let deleteCalled = false;
    const prisma = {
      bumdesUnit: {
        findFirst: async () => ({ id: 'unit-a', tenantId: 'tenant-a' }),
        delete: async ({ where }: Query) => {
          assert.deepEqual(where, { id: 'unit-a' });
          deleteCalled = true;
        },
      },
      bumdesFinancialRecord: { count: async () => 0 },
    };
    const service = new BumdesService(prisma as never, {
      log: async (event: Record<string, unknown>) => auditEvents.push(event),
    } as never);

    await service.remove(user as never, 'unit-a', '127.0.0.1');

    assert.equal(deleteCalled, true);
    assert.deepEqual(auditEvents, [
      {
        tenantId: 'tenant-a',
        actorId: 'user-a',
        action: 'delete',
        module: 'bumdes',
        entityType: 'bumdes_unit',
        entityId: 'unit-a',
        ipAddress: '127.0.0.1',
      },
    ]);
  });
});
