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

function createHarness(options?: {
  deleteFile?: () => Promise<void>;
  deletePrefix?: () => Promise<void>;
}) {
  const audits: Array<Record<string, unknown>> = [];
  return {
    audits,
    deps: {
      storage: {
        deleteFile: async () => options?.deleteFile?.(),
        deletePrefix: async () => options?.deletePrefix?.(),
      },
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
  it('defaults legacy jobs to object cleanup and rejects malformed targets', () => {
    assert.equal(parseStorageCleanupJob(job).target, 'object');
    assert.throws(() => parseStorageCleanupJob({}), /Invalid storage cleanup job type/);
    assert.throws(
      () => parseStorageCleanupJob({ ...job, path: 'tenant-b/uploads/file-a.pdf' }),
      /tenant prefix/,
    );
    assert.throws(
      () => parseStorageCleanupJob({ ...job, target: 'invalid' }),
      /target must be object or prefix/,
    );
    assert.throws(
      () => parseStorageCleanupJob({ ...job, target: 'prefix', path: 'tenant-a/letters/request-a' }),
      /prefix target must end with a slash/,
    );
  });

  it('deletes an object and writes a completion audit event', async () => {
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
      target: 'object',
      attempt: 1,
      maxAttempts: 8,
    });
  });

  it('deletes every object below a tenant-scoped prefix', async () => {
    let prefixDeleted = false;
    const { deps, audits } = createHarness({
      deletePrefix: async () => {
        prefixDeleted = true;
      },
    });
    const prefixJob = {
      ...job,
      fileId: 'letter-pdf-orphan-a',
      path: 'tenant-a/letters/request-a/',
      target: 'prefix' as const,
    };

    await processStorageCleanupJob(deps as never, prefixJob, { attempt: 1, maxAttempts: 8 });

    assert.equal(prefixDeleted, true);
    assert.deepEqual(audits[0]?.metadata, {
      path: prefixJob.path,
      target: 'prefix',
      attempt: 1,
      maxAttempts: 8,
    });
  });

  it('records retry intent and rethrows before the final attempt', async () => {
    const { deps, audits } = createHarness({
      deleteFile: async () => {
        throw new Error('MinIO unavailable');
      },
    });

    await assert.rejects(
      processStorageCleanupJob(deps as never, job, { attempt: 2, maxAttempts: 8 }),
      /MinIO unavailable/,
    );

    assert.equal(audits[0]?.action, 'storage_cleanup_retry');
    assert.deepEqual(audits[0]?.metadata, {
      path: job.path,
      target: 'object',
      attempt: 2,
      maxAttempts: 8,
      error: 'MinIO unavailable',
    });
  });

  it('records permanent failure on the final attempt', async () => {
    const { deps, audits } = createHarness({
      deleteFile: async () => {
        throw new Error('MinIO unavailable');
      },
    });

    await assert.rejects(
      processStorageCleanupJob(deps as never, job, { attempt: 8, maxAttempts: 8 }),
      /MinIO unavailable/,
    );

    assert.equal(audits[0]?.action, 'storage_cleanup_failed');
  });
});
