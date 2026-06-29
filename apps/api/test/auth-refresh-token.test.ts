import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/core/auth/auth.service.js';

const rawToken = 'a'.repeat(128);
const tokenHash = createHash('sha256').update(rawToken).digest('hex');
const now = new Date('2026-06-28T00:00:00.000Z');

function createUser() {
  return {
    id: 'user-1',
    email: 'admin@example.test',
    name: 'Admin Desa',
    tenantId: 'tenant-1',
    status: 'active',
    deletedAt: null,
    twoFaEnabled: false,
    userRoles: [
      {
        role: {
          code: 'admin_desa',
          rolePermissions: [{ permission: { code: 'settings.read' } }],
        },
      },
    ],
  };
}

function createStoredToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'refresh-1',
    userId: 'user-1',
    token: tokenHash,
    revokedAt: null,
    expiresAt: new Date('2026-07-05T00:00:00.000Z'),
    user: createUser(),
    ...overrides,
  };
}

function makeService(options: {
  stored?: Record<string, unknown> | null;
  transactionResult?: { count: number };
  current?: { revokedAt: Date | null; expiresAt: Date } | null;
} = {}) {
  const findFirstCalls: unknown[] = [];
  const updateManyCalls: unknown[] = [];
  const createdTokens: unknown[] = [];
  const auditEvents: unknown[] = [];
  const stored = options.stored === undefined ? createStoredToken() : options.stored;
  const transactionResult = options.transactionResult ?? { count: 1 };

  const transaction = {
    refreshToken: {
      updateMany: async (_args: unknown) => transactionResult,
      create: async (args: unknown) => {
        createdTokens.push(args);
        return args;
      },
    },
  };

  const prisma = {
    refreshToken: {
      findFirst: async (args: unknown) => {
        findFirstCalls.push(args);
        return stored;
      },
      findUnique: async () => options.current ?? {
        revokedAt: (stored as { revokedAt?: Date | null } | null)?.revokedAt ?? null,
        expiresAt: (stored as { expiresAt?: Date } | null)?.expiresAt ?? now,
      },
      updateMany: async (args: unknown) => {
        updateManyCalls.push(args);
        return { count: 1 };
      },
    },
    $transaction: async (callback: (client: typeof transaction) => Promise<boolean>) => callback(transaction),
  };
  const jwt = { sign: () => 'access-token' };
  const auditLogs = {
    log: async (event: unknown) => {
      auditEvents.push(event);
    },
  };

  return {
    service: new AuthService(prisma as never, jwt as never, auditLogs as never),
    findFirstCalls,
    updateManyCalls,
    createdTokens,
    auditEvents,
  };
}

describe('AuthService refresh token hardening', () => {
  it('looks up a raw legacy token by its hash and legacy value, then stores the replacement hash only', async () => {
    const { service, findFirstCalls, createdTokens } = makeService();

    const result = await service.refresh(rawToken, '127.0.0.1');

    const lookup = findFirstCalls[0] as { where: { token: { in: string[] } } };
    assert.deepEqual(lookup.where.token.in, [tokenHash, rawToken]);

    const created = createdTokens[0] as { data: { token: string } };
    assert.match(created.data.token, /^[a-f0-9]{64}$/);
    assert.notEqual(created.data.token, (result as { data: { refreshToken: string } }).data.refreshToken);
  });

  it('does not accept a copied 64-character database digest as a bearer token', async () => {
    const copiedDigest = tokenHash;
    const { service, findFirstCalls } = makeService({ stored: null });

    await assert.rejects(service.refresh(copiedDigest), UnauthorizedException);

    const lookup = findFirstCalls[0] as { where: { token: { in: string[] } } };
    assert.equal(lookup.where.token.in.length, 1);
    assert.notEqual(lookup.where.token.in[0], copiedDigest);
  });

  it('revokes active sessions and records a security event when a revoked token is replayed', async () => {
    const { service, updateManyCalls, auditEvents } = makeService({
      stored: createStoredToken({ revokedAt: now }),
    });

    await assert.rejects(service.refresh(rawToken, '127.0.0.1'), UnauthorizedException);

    const revoke = updateManyCalls[0] as {
      where: { userId: string; revokedAt: null };
      data: { revokedAt: Date };
    };
    assert.equal(revoke.where.userId, 'user-1');
    assert.equal(revoke.where.revokedAt, null);
    assert.ok(revoke.data.revokedAt instanceof Date);

    const event = auditEvents[0] as { action: string; metadata: { reason: string } };
    assert.equal(event.action, 'refresh_token_reuse_detected');
    assert.equal(event.metadata.reason, 'reused_revoked_token');
  });

  it('treats a failed concurrent token claim as replay and revokes the new family token', async () => {
    const { service, updateManyCalls, auditEvents } = makeService({
      transactionResult: { count: 0 },
      current: {
        revokedAt: new Date('2026-06-28T00:00:01.000Z'),
        expiresAt: new Date('2026-07-05T00:00:00.000Z'),
      },
    });

    await assert.rejects(service.refresh(rawToken), UnauthorizedException);

    const revoke = updateManyCalls[0] as { where: { userId: string; revokedAt: null } };
    assert.equal(revoke.where.userId, 'user-1');
    const event = auditEvents[0] as { metadata: { reason: string } };
    assert.equal(event.metadata.reason, 'concurrent_rotation');
  });

  it('does not revoke other sessions for a refresh token that merely reaches expiry', async () => {
    const expired = createStoredToken({ expiresAt: new Date('2026-06-20T00:00:00.000Z') });
    const { service, updateManyCalls, auditEvents } = makeService({ stored: expired });

    await assert.rejects(service.refresh(rawToken), UnauthorizedException);

    const revoke = updateManyCalls[0] as { where: { id: string; revokedAt: null } };
    assert.equal(revoke.where.id, 'refresh-1');
    assert.equal(auditEvents.length, 0);
  });
});
