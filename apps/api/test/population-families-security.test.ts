import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { FamiliesService } from '../src/modules/families/families.service.js';
import { PopulationService } from '../src/modules/population/population.service.js';

type Query = { where: Record<string, unknown> };

const user = {
  sub: 'user-1',
  email: 'admin@example.test',
  roles: ['admin_desa'],
  permissions: [],
  tenantId: 'tenant-a',
};

function auditMock() {
  return { log: async () => undefined };
}

describe('population and family security', () => {
  it('rejects resident creation with a family from another tenant', async () => {
    const prisma = {
      resident: { findUnique: async () => null },
      family: {
        findFirst: async ({ where }: Query) => {
          assert.equal(where.tenantId, 'tenant-a');
          return null;
        },
      },
    };
    const service = new PopulationService(prisma as never, auditMock() as never, {} as never);

    await assert.rejects(
      service.create(user as never, {
        nik: '3201010101010001',
        fullName: 'Budi Santoso',
        gender: 'male',
        birthPlace: 'Bandung',
        birthDate: '1990-01-31',
        residentStatus: 'permanent',
        familyId: '11111111-1111-4111-8111-111111111111',
      }),
      NotFoundException,
    );
  });

  it('normalizes ISO date strings and clears nullable resident relations on update', async () => {
    const calls: Array<{ data: Record<string, unknown> }> = [];
    const prisma = {
      resident: {
        findFirst: async () => ({ id: 'resident-a', tenantId: 'tenant-a' }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          calls.push({ data });
          return { id: 'resident-a', ...data };
        },
      },
      family: { findFirst: async () => null },
    };
    const service = new PopulationService(prisma as never, auditMock() as never, {} as never);

    await service.update(user as never, 'resident-a', {
      birthDate: '1990-01-31T00:00:00.000Z',
      familyId: null,
      addressId: null,
      religion: null,
      education: null,
    });

    assert.equal((calls[0]?.data.birthDate as Date).toISOString(), '1990-01-31T00:00:00.000Z');
    assert.deepEqual(calls[0]?.data.family, { disconnect: true });
    assert.deepEqual(calls[0]?.data.address, { disconnect: true });
    assert.equal(calls[0]?.data.religion, null);
    assert.equal(calls[0]?.data.education, null);
  });

  it('delegates resident address creation and update to core addressing', async () => {
    const resolverCalls: Array<{ tenantId: string; input: Record<string, unknown> }> = [];
    const created: Array<{ data: Record<string, unknown> }> = [];
    const updated: Array<{ data: Record<string, unknown> }> = [];
    const prisma = {
      resident: {
        findUnique: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push({ data });
          return { id: 'resident-created', ...data };
        },
        findFirst: async () => ({ id: 'resident-existing', tenantId: 'tenant-a' }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updated.push({ data });
          return { id: 'resident-existing', ...data };
        },
      },
      family: { findFirst: async () => null },
    };
    const addressing = {
      resolveAddress: async (tenantId: string, input: Record<string, unknown>) => {
        resolverCalls.push({ tenantId, input });
        return resolverCalls.length === 1 ? 'address-created' : 'address-updated';
      },
    };
    const service = new PopulationService(prisma as never, auditMock() as never, addressing as never);

    await service.create(user as never, {
      nik: '3201010101010001',
      fullName: 'Budi Santoso',
      gender: 'male',
      birthPlace: 'Bandung',
      birthDate: '1990-01-31',
      residentStatus: 'permanent',
      address: { street: 'Jl. Merdeka' },
    });
    await service.update(user as never, 'resident-existing', {
      address: { street: 'Jl. Raya Desa' },
    });

    assert.deepEqual(resolverCalls, [
      { tenantId: 'tenant-a', input: { street: 'Jl. Merdeka' } },
      { tenantId: 'tenant-a', input: { street: 'Jl. Raya Desa' } },
    ]);
    assert.equal(created[0]?.data.addressId, 'address-created');
    assert.deepEqual(updated[0]?.data.address, { connect: { id: 'address-updated' } });
  });

  it('tenant-scopes family member resident lookup to block cross-tenant access', async () => {
    const prisma = {
      family: {
        findFirst: async ({ where }: Query) => ({ id: where.id, tenantId: where.tenantId }),
      },
      familyMember: { findUnique: async () => null },
      resident: {
        findFirst: async ({ where }: Query) => {
          assert.deepEqual(where, {
            id: '22222222-2222-4222-8222-222222222222',
            tenantId: 'tenant-a',
            deletedAt: null,
          });
          return null;
        },
      },
    };
    const service = new FamiliesService(prisma as never, auditMock() as never, {} as never);

    await assert.rejects(
      service.addMember(user as never, 'family-a', {
        residentId: '22222222-2222-4222-8222-222222222222',
        relationship: 'child',
      }),
      NotFoundException,
    );
  });
});
