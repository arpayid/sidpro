import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FamiliesService } from '../src/modules/families/families.service.js';

const user = {
  sub: 'user-a',
  email: 'admin@example.test',
  roles: ['admin_desa'],
  permissions: [],
  tenantId: 'tenant-a',
};

describe('families address resolution boundary', () => {
  it('uses the core address resolver when creating a family from address input', async () => {
    const resolverCalls: Array<{ tenantId: string; input: Record<string, unknown> }> = [];
    const prisma = {
      family: {
        findUnique: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 'family-a', ...data }),
      },
      resident: { findFirst: async () => null },
    };
    const audit = { log: async () => undefined };
    const addressResolution = {
      resolveAddress: async (tenantId: string, input: Record<string, unknown>) => {
        resolverCalls.push({ tenantId, input });
        return 'address-a';
      },
    };
    const service = new FamiliesService(prisma as never, audit as never, addressResolution as never);

    const result = await service.create(user as never, {
      kkNumber: '3201010101010001',
      address: { street: 'Jl. Raya Desa' },
    });

    assert.deepEqual(resolverCalls, [
      { tenantId: 'tenant-a', input: { street: 'Jl. Raya Desa' } },
    ]);
    assert.equal((result.data as { addressId: string }).addressId, 'address-a');
  });
});
