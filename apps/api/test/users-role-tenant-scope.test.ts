import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from '../src/core/users/users.service.js';

const ids = {
  actor: '123e4567-e89b-12d3-a456-426614174000',
  target: '123e4567-e89b-12d3-a456-426614174001',
  tenantA: '123e4567-e89b-12d3-a456-426614174010',
  tenantB: '123e4567-e89b-12d3-a456-426614174011',
  roleA: '123e4567-e89b-12d3-a456-426614174020',
};

const superadmin = {
  sub: ids.actor,
  email: 'superadmin@example.test',
  tenantId: null,
  roles: ['superadmin_system'],
  permissions: ['users.update'],
};

function createService(roleTenantId: string | null) {
  let transactionCalled = false;
  const prisma = {
    user: {
      findFirst: async () => ({
        id: ids.target,
        tenantId: ids.tenantB,
        deletedAt: null,
      }),
    },
    role: {
      findMany: async () => [
        { id: ids.roleA, code: 'operator_desa', tenantId: roleTenantId },
      ],
    },
    userRole: {
      findFirst: async () => null,
    },
    $transaction: async () => {
      transactionCalled = true;
      return null;
    },
  };
  const auditLogs = { log: async () => undefined };

  return {
    service: new UsersService(prisma as never, auditLogs as never),
    transactionCalled: () => transactionCalled,
  };
}

describe('UsersService role tenant scope', () => {
  it('rejects a superadmin assigning a tenant-A role to a tenant-B user before mutation', async () => {
    const { service, transactionCalled } = createService(ids.tenantA);

    await assert.rejects(
      () => service.assignRoles(superadmin, ids.target, { roleIds: [ids.roleA] }),
      ForbiddenException,
    );

    assert.equal(transactionCalled(), false);
  });

  it('rejects a global role for a tenant-scoped target user before mutation', async () => {
    const { service, transactionCalled } = createService(null);

    await assert.rejects(
      () => service.assignRoles(superadmin, ids.target, { roleIds: [ids.roleA] }),
      ForbiddenException,
    );

    assert.equal(transactionCalled(), false);
  });
});
