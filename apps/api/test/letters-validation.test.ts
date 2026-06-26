import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createLetterRequestSchema,
  letterTypePayloadSchema,
  publicLetterTrackSchema,
  qrCodeVerificationSchema,
  rejectLetterSchema,
} from '@sidpro/validators';
import { LettersService } from '../src/modules/letters/letters.service.js';

const user = { sub: 'user-1', tenantId: 'tenant-a', roles: ['operator_desa'] };

function createService(prismaOverrides: Record<string, unknown>) {
  const prisma = {
    letterRequest: {
      findFirst: async () => null,
      updateMany: async () => ({ count: 0 }),
    },
    letterOutput: { findUnique: async () => null },
    tenant: { findUnique: async () => null },
    ...prismaOverrides,
  };

  return new LettersService(
    prisma as never,
    { log: async () => undefined } as never,
    { uploadFile: async () => undefined, getSignedUrl: async () => 'https://signed.test/file.pdf' } as never,
    { generate: async () => Buffer.from('pdf') } as never,
    { get: (_key: string, fallback: string) => fallback } as never,
  );
}

describe('letter validation schemas', () => {
  it('rejects invalid letter type, required request fields, purpose, rejection reason, QR, and tracking payloads', () => {
    assert.equal(letterTypePayloadSchema.safeParse({ code: 'bad code!', name: 'A' }).success, false);
    assert.equal(createLetterRequestSchema.safeParse({ purpose: 'test' }).success, false);
    assert.equal(rejectLetterSchema.safeParse({ notes: 'no' }).success, false);
    assert.equal(qrCodeVerificationSchema.safeParse({ qrCode: 'not-a-uuid' }).success, false);
    assert.equal(publicLetterTrackSchema.safeParse({ ticket: 'bad', nikLast4: '12ab' }).success, false);
  });
});

describe('LettersService guards public and tenant-sensitive flows', () => {
  it('rejects approval invalid transition before writing approval rows', async () => {
    let approvalCreated = false;
    const service = createService({
      letterRequest: {
        findFirst: async () => ({ id: 'request-1', tenantId: 'tenant-a', status: 'submitted' }),
      },
      letterApproval: {
        create: async () => {
          approvalCreated = true;
        },
      },
      $transaction: async () => undefined,
    });

    await assert.rejects(
      () => service.approve(user, 'request-1', { approved: true }, '127.0.0.1'),
      BadRequestException,
    );
    assert.equal(approvalCreated, false);
  });

  it('rejects malformed public QR codes without querying outputs', async () => {
    let queried = false;
    const service = createService({
      letterOutput: {
        findUnique: async () => {
          queried = true;
          return null;
        },
      },
    });

    await assert.rejects(() => service.verifyByQr('invalid-qr', '127.0.0.1'), BadRequestException);
    assert.equal(queried, false);
  });

  it('rejects invalid public tracking payload before tenant lookup', async () => {
    let tenantLookup = false;
    const service = createService({
      tenant: {
        findUnique: async () => {
          tenantLookup = true;
          return { id: 'tenant-a' };
        },
      },
    });

    await assert.rejects(
      () => service.trackPublic('tenant-a', { ticket: 'SRT-12345678', nikLast4: 'xx00' }),
      BadRequestException,
    );
    assert.equal(tenantLookup, false);
  });

  it('enforces tenant isolation when loading letter request details', async () => {
    let whereTenant: string | undefined;
    const service = createService({
      letterRequest: {
        findFirst: async ({ where }: { where: { tenantId?: string } }) => {
          whereTenant = where.tenantId;
          return null;
        },
      },
    });

    await assert.rejects(() => service.findRequest(user, 'request-from-other-tenant'), NotFoundException);
    assert.equal(whereTenant, 'tenant-a');
  });
});
