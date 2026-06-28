import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AddressResolutionService } from '../src/core/addressing/address-resolution.service.js';

describe('AddressResolutionService', () => {
  it('creates an address from a tenant-owned RT/RW unit and infers its hamlet', async () => {
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      neighborhoodUnit: {
        findFirst: async () => ({ id: 'unit-a', tenantId: 'tenant-a', hamletId: 'hamlet-a', rt: '01', rw: '02' }),
      },
      hamlet: { findFirst: async () => null },
      address: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return { id: 'address-a' };
        },
      },
    };
    const service = new AddressResolutionService(prisma as never);

    const id = await service.resolveAddress('tenant-a', {
      neighborhoodUnitId: '11111111-1111-4111-8111-111111111111',
      street: 'Jl. Merdeka',
    });

    assert.equal(id, 'address-a');
    assert.deepEqual(created[0], {
      tenantId: 'tenant-a',
      hamletId: 'hamlet-a',
      neighborhoodUnitId: 'unit-a',
      rt: '01',
      rw: '02',
      street: 'Jl. Merdeka',
    });
  });

  it('rejects an RT/RW unit from another tenant and mismatched hamlet input', async () => {
    const missingUnitPrisma = {
      neighborhoodUnit: { findFirst: async () => null },
      hamlet: { findFirst: async () => null },
      address: { create: async () => ({ id: 'unused' }) },
    };
    await assert.rejects(
      new AddressResolutionService(missingUnitPrisma as never).resolveAddress('tenant-a', {
        neighborhoodUnitId: '11111111-1111-4111-8111-111111111111',
      }),
      NotFoundException,
    );

    const mismatchPrisma = {
      neighborhoodUnit: {
        findFirst: async () => ({ id: 'unit-a', tenantId: 'tenant-a', hamletId: 'hamlet-a', rt: '01', rw: '02' }),
      },
      hamlet: { findFirst: async () => null },
      address: { create: async () => ({ id: 'unused' }) },
    };
    await assert.rejects(
      new AddressResolutionService(mismatchPrisma as never).resolveAddress('tenant-a', {
        hamletId: '22222222-2222-4222-8222-222222222222',
        neighborhoodUnitId: '11111111-1111-4111-8111-111111111111',
      }),
      ConflictException,
    );
  });

  it('requires a tenant-owned hamlet and permits a street-only address', async () => {
    const missingHamletPrisma = {
      neighborhoodUnit: { findFirst: async () => null },
      hamlet: { findFirst: async () => null },
      address: { create: async () => ({ id: 'unused' }) },
    };
    await assert.rejects(
      new AddressResolutionService(missingHamletPrisma as never).resolveAddress('tenant-a', {
        hamletId: '11111111-1111-4111-8111-111111111111',
      }),
      NotFoundException,
    );

    const created: Array<Record<string, unknown>> = [];
    const streetOnlyPrisma = {
      neighborhoodUnit: { findFirst: async () => null },
      hamlet: { findFirst: async () => null },
      address: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          created.push(data);
          return { id: 'address-street-only' };
        },
      },
    };
    const id = await new AddressResolutionService(streetOnlyPrisma as never).resolveAddress('tenant-a', {
      street: 'Jl. Raya Desa',
    });

    assert.equal(id, 'address-street-only');
    assert.deepEqual(created[0], { tenantId: 'tenant-a', street: 'Jl. Raya Desa' });
  });
});
