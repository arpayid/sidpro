import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStorageCleanupJob,
  processStorageCleanupJob,
} from '../src/jobs/storage-cleanup';

const job = {
  type: 'delete-orphaned-object',
  tenantId: 'tenant-a',
  fileId: 'file-a',
  path: 'tenant-a/uploads/file-a.pdf',
  actorId: 'user-a',
  ipAddress: '127.0.0.1',
} as const;

function createHarness(deleteFile?: () => Promise<void>) {
  const audits: Array<Record<string, unknown>> = [];
  return {
    audits,
    deps: {
      storage: { deleteFile: async () => deleteFile?.() },
      prisma: {
        auditLog: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            audits.push(data);
          },
        },
      },
    },
  };
}

describe('storage cleanup worker', () => {
  it('rejects malformed and cross-tenant storage paths', () => {
    assert.throws(() => parseStorageCleanupJob({}), /Invalid storage cleanup job type/);
    assert.throws(
      () => parseStorageCleanupJob({ ...job, path: 'tenant-b/uploads/file-a.pdf' }),
      /tenant prefix/,
    );
  });

  it('deletes the orphan and writes a completion audit event', async () => {
    const { deps, audits } = createHarness();

    const result = await processStorageCleanupJob(deps as never, job, {
      attempt: 1,
      maxAttempts: 8,
    });

    assert.deepEqual(result, { path: job.path });
    assert.equal(audits.length, 1);
    assert.equal(audits[0]?.action, 'storage_cleanup_completed');
    assert.deepEqual(audits[0]?.metadata, {
      path: job.path,
      attempt: 1,
      maxAttempts: 8,
    });
  });

  it('records retry intent and rethrows before the final attempt', async () => {
    const { deps, audits } = createHarness(async () => {
      throw new Error('MinIO unavailable');
    });

    await assert.rejects(
      processStorageCleanupJob(deps as never, job, { attempt: 2, maxAttempts: 8 }),
      /MinIO unavailable/,
    );

    assert.equal(audits[0]?.action, 'storage_cleanup_retry');
    assert.deepEqual(audits[0]?.metadata, {
      path: job.path,
      attempt: 2,
      maxAttempts: 8,
      error: 'MinIO unavailable',
    });
  });

  it('records permanent failure on the final attempt', async () => {
    const { deps, audits } = createHarness(async () => {
      throw new Error('MinIO unavailable');
    });

    await assert.rejects(
      processStorageCleanupJob(deps as never, job, { attempt: 8, maxAttempts: 8 }),
      /MinIO unavailable/,
    );

    assert.equal(audits[0]?.action, 'storage_cleanup_failed');
  });
});
