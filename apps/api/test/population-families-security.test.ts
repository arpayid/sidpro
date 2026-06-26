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
    const service = new PopulationService(prisma as never, auditMock() as never);

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
