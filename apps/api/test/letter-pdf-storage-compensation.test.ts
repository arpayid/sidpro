import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, throwError } from 'rxjs';
import { LetterPdfStorageCompensationInterceptor } from '../src/modules/letters/letter-pdf-storage-compensation.interceptor.js';

const user = {
  sub: 'user-a',
  email: 'admin@example.test',
  roles: ['admin_desa'],
  permissions: ['letters.generate'],
  tenantId: 'tenant-a',
};

function contextFor(requestId = 'request-a') {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        params: { id: requestId },
        user,
        ip: '127.0.0.1',
      }),
    }),
  } as ExecutionContext;
}

function handlerWithError(error: Error) {
  return { handle: () => throwError(() => error) };
}

describe('letter PDF storage compensation', () => {
  it('does not touch storage after the PDF metadata has committed', async () => {
    let listCalled = false;
    const interceptor = new LetterPdfStorageCompensationInterceptor(
      {
        letterOutput: {
          findFirst: async () => ({ id: 'output-a' }),
        },
      } as never,
      {
        listFilesByPrefix: async () => {
          listCalled = true;
          return [];
        },
      } as never,
      {} as never,
      {} as never,
    );
    const failure = new Error('audit log unavailable');

    await assert.rejects(
      lastValueFrom(interceptor.intercept(contextFor(), handlerWithError(failure))),
      /audit log unavailable/,
    );
    assert.equal(listCalled, false);
  });

  it('deletes an orphan prefix when no letter output was persisted', async () => {
    const auditEvents: Array<Record<string, unknown>> = [];
    let deletedPrefix: string | null = null;
    const interceptor = new LetterPdfStorageCompensationInterceptor(
      {
        letterOutput: { findFirst: async () => null },
      } as never,
      {
        listFilesByPrefix: async (prefix: string) => [`${prefix}SKD-2026-0001.pdf`],
        deletePrefix: async (prefix: string) => {
          deletedPrefix = prefix;
        },
      } as never,
      {} as never,
      {
        log: async (event: Record<string, unknown>) => auditEvents.push(event),
      } as never,
    );

    await assert.rejects(
      lastValueFrom(
        interceptor.intercept(contextFor('request-a'), handlerWithError(new Error('transaction failed'))),
      ),
      /transaction failed/,
    );

    assert.equal(deletedPrefix, 'tenant-a/letters/request-a/');
    assert.equal(auditEvents[0]?.action, 'storage_cleanup_completed');
    assert.deepEqual(auditEvents[0]?.metadata, {
      reason: 'letter_pdf_metadata_transaction_failed',
      cleanupTarget: 'prefix',
      prefix: 'tenant-a/letters/request-a/',
      objectCount: 1,
      source: 'generate_pdf_compensation',
    });
  });

  it('queues a durable prefix cleanup when object storage cannot be probed', async () => {
    const queued: Array<Record<string, unknown>> = [];
    const auditEvents: Array<Record<string, unknown>> = [];
    const interceptor = new LetterPdfStorageCompensationInterceptor(
      {
        letterOutput: { findFirst: async () => null },
      } as never,
      {
        listFilesByPrefix: async () => {
          throw new Error('MinIO unavailable');
        },
      } as never,
      {
        enqueueStorageCleanup: async (payload: Record<string, unknown>) => {
          queued.push(payload);
          return true;
        },
      } as never,
      {
        log: async (event: Record<string, unknown>) => auditEvents.push(event),
      } as never,
    );

    await assert.rejects(
      lastValueFrom(
        interceptor.intercept(contextFor('request-b'), handlerWithError(new Error('transaction failed'))),
      ),
      /transaction failed/,
    );

    assert.equal(queued.length, 1);
    assert.deepEqual(queued[0], {
      tenantId: 'tenant-a',
      fileId: `letter-pdf-orphan-${'f8aa2ca590d49eb9c2f2d70d808ac321866d7ba8941c7745c26c1386907707be'}`,
      path: 'tenant-a/letters/request-b/',
      target: 'prefix',
      actorId: 'user-a',
      ipAddress: '127.0.0.1',
    });
    assert.equal(auditEvents[0]?.action, 'storage_cleanup_required');
  });
});
