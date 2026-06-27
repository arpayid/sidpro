import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../src/database/prisma.service.js';

type Middleware = (params: Record<string, unknown>, next: (params: Record<string, unknown>) => Promise<unknown>) => Promise<unknown>;

const rawToken = 'a'.repeat(128);
const tokenHash = createHash('sha256').update(rawToken).digest('hex');
const now = new Date('2026-06-28T00:00:00.000Z');

function refreshTokenRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'refresh-token-1',
    userId: 'user-1',
    revokedAt: null,
    user: {
      tenantId: 'tenant-1',
      status: 'active',
      deletedAt: null,
    },
    ...overrides,
  };
}

async function makeHarness() {
  let middleware: Middleware | undefined;
  const updateManyCalls: unknown[] = [];
  const auditEvents: unknown[] = [];
  const service = Object.create(PrismaService.prototype) as PrismaService & {
    $use: (handler: Middleware) => void;
    $connect: () => Promise<void>;
    refreshToken: {
      updateMany: (args: unknown) => Promise<{ count: number }>;
      findUnique: (args: unknown) => Promise<unknown>;
    };
    user: { findUnique: (args: unknown) => Promise<{ tenantId: string | null } | null> };
    auditLog: { create: (args: unknown) => Promise<unknown> };
  };

  service.$use = (handler) => {
    middleware = handler;
  };
  service.$connect = async () => undefined;
  service.refreshToken = {
    updateMany: async (args) => {
      updateManyCalls.push(args);
      return { count: 1 };
    },
    findUnique: async () => refreshTokenRecord(),
  };
  service.user = { findUnique: async () => ({ tenantId: 'tenant-1' }) };
  service.auditLog = {
    create: async (args) => {
      auditEvents.push(args);
      return args;
    },
  };

  await service.onModuleInit();
  assert.ok(middleware);

  return {
    middleware: middleware as Middleware,
    service,
    updateManyCalls,
    auditEvents,
  };
}

describe('refresh token Prisma middleware', () => {
  it('hashes newly issued refresh tokens before they reach Prisma', async () => {
    const { middleware } = await makeHarness();
    let received: Record<string, unknown> | undefined;

    await middleware(
      {
        model: 'RefreshToken',
        action: 'create',
        args: { data: { userId: 'user-1', token: rawToken, expiresAt: now } },
      },
      async (params) => {
        received = params;
        return null;
      },
    );

    const data = (received?.args as { data: { token: string } }).data;
    assert.equal(data.token, tokenHash);
    assert.notEqual(data.token, rawToken);
  });

  it('looks up both hashed and legacy token storage during the transition period', async () => {
    const { middleware } = await makeHarness();
    let received: Record<string, unknown> | undefined;

    await middleware(
      {
        model: 'RefreshToken',
        action: 'findUnique',
        args: { where: { token: rawToken } },
      },
      async (params) => {
        received = params;
        return refreshTokenRecord();
      },
    );

    assert.equal(received?.action, 'findFirst');
    const where = (received?.args as { where: { OR: Array<{ token: string }> } }).where;
    assert.deepEqual(where.OR, [{ token: tokenHash }, { token: rawToken }]);
  });

  it('invalidates active sessions and records an audit event when a revoked token is replayed', async () => {
    const { middleware, updateManyCalls, auditEvents } = await makeHarness();

    await middleware(
      {
        model: 'RefreshToken',
        action: 'findUnique',
        args: { where: { token: rawToken } },
      },
      async () => refreshTokenRecord({ revokedAt: now }),
    );

    assert.deepEqual(updateManyCalls[0], {
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: assert.match },
    });
    const event = auditEvents[0] as { data: { action: string; metadata: { reason: string } } };
    assert.equal(event.data.action, 'refresh_token_reuse_detected');
    assert.equal(event.data.metadata.reason, 'reused_revoked_token');
  });

  it('rejects a concurrent refresh rotation and invalidates all active sessions', async () => {
    const { middleware, service, updateManyCalls, auditEvents } = await makeHarness();
    service.refreshToken.findUnique = async () => refreshTokenRecord();

    await assert.rejects(
      middleware(
        {
          model: 'RefreshToken',
          action: 'update',
          args: { where: { id: 'refresh-token-1' }, data: { revokedAt: now } },
        },
        async () => ({ count: 0 }),
      ),
      UnauthorizedException,
    );

    assert.equal(updateManyCalls.length, 1);
    const event = auditEvents[0] as { data: { metadata: { reason: string } } };
    assert.equal(event.data.metadata.reason, 'concurrent_rotation');
  });

  it('matches hashed and legacy values when revoking a token during logout', async () => {
    const { middleware } = await makeHarness();
    let received: Record<string, unknown> | undefined;

    await middleware(
      {
        model: 'RefreshToken',
        action: 'updateMany',
        args: { where: { userId: 'user-1', token: rawToken }, data: { revokedAt: now } },
      },
      async (params) => {
        received = params;
        return { count: 1 };
      },
    );

    const where = (received?.args as { where: { token: { in: string[] } } }).where;
    assert.deepEqual(where.token.in, [tokenHash, rawToken]);
  });
});
