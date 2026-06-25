import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../src/core/notifications/notifications.service.js';
import { JwtPayload } from '../src/common/decorators/current-user.decorator.js';

const userA: JwtPayload = {
  sub: 'user-a',
  email: 'a@example.test',
  tenantId: 'tenant-a',
  roles: ['operator_desa'],
  permissions: [],
};

const userB: JwtPayload = {
  sub: 'user-b',
  email: 'b@example.test',
  tenantId: 'tenant-a',
  roles: ['admin_desa'],
  permissions: ['notifications.read', 'notifications.manage'],
};

const userOtherTenant: JwtPayload = {
  sub: 'user-a',
  email: 'a-other@example.test',
  tenantId: 'tenant-b',
  roles: ['admin_desa'],
  permissions: ['notifications.read', 'notifications.manage'],
};

function createPrismaMock() {
  return {
    notification: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => [
        { id: 'visible', tenantId: where.tenantId, userId: where.userId, readAt: null },
      ],
      count: async ({ where }: { where: Record<string, unknown> }) => {
        assert.equal(where.tenantId, 'tenant-a');
        assert.equal(where.userId, 'user-a');
        return 1;
      },
      updateMany: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.id === 'own-notification' && where.tenantId === 'tenant-a' && where.userId === 'user-a') {
          return { count: 1 };
        }
        if (!where.id && where.tenantId === 'tenant-a' && where.userId === 'user-a') {
          return { count: 2 };
        }
        return { count: 0 };
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.id === 'own-notification' && where.tenantId === 'tenant-a' && where.userId === 'user-a') {
          return { id: 'own-notification', tenantId: 'tenant-a', userId: 'user-a', readAt: new Date() };
        }
        return null;
      },
    },
  };
}

describe('notifications access scope', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService(createPrismaMock() as never);
  });

  it('lists only notifications for the current tenant and current user', async () => {
    const response = await service.findAll(userA, 1, 20, true);

    assert.equal(response.success, true);
    assert.equal(response.meta?.total, 1);
    assert.deepEqual(response.data, [
      { id: 'visible', tenantId: 'tenant-a', userId: 'user-a', readAt: null },
    ]);
  });

  it('does not let a privileged tenant user mark another user notification as read', async () => {
    await assert.rejects(
      () => service.markRead(userB, 'own-notification'),
      NotFoundException,
    );
  });

  it('does not let a user mark a notification from another tenant as read', async () => {
    await assert.rejects(
      () => service.markRead(userOtherTenant, 'own-notification'),
      NotFoundException,
    );
  });

  it('marks only unread notifications for the current tenant and current user as read', async () => {
    const response = await service.markAllRead(userA);

    assert.equal(response.success, true);
    assert.deepEqual(response.data, { count: 2 });
  });

  it('requires tenant scope before querying notifications', async () => {
    await assert.rejects(
      () => service.findAll({ ...userA, tenantId: null }),
      ForbiddenException,
    );
  });
});
