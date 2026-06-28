import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FilesService } from '../src/core/files/files.service.js';

const user = {
  sub: 'user-1',
  email: 'admin@example.test',
  roles: ['admin_desa'],
  permissions: ['settings.manage'],
  tenantId: 'tenant-a',
};

const file = {
  id: 'file-1',
  tenantId: 'tenant-a',
  ownerType: 'upload',
  ownerId: null,
  path: 'tenant-a/upload/file-1.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  checksum: null,
  createdAt: new Date('2026-06-28T00:00:00.000Z'),
};

function createHarness(options: {
  deleteFile?: () => Promise<typeof file>;
  deleteStorage?: () => Promise<void>;
  enqueueCleanup?: () => Promise<boolean>;
} = {}) {
  const calls: string[] = [];
  const audits: Array<Record<string, unknown>> = [];
  const cleanupJobs: Array<Record<string, unknown>> = [];
  const prisma = {
    file: {
      findFirst: async () => file,
      delete: async () => {
        calls.push('metadata-delete');
        return options.deleteFile ? options.deleteFile() : file;
      },
    },
  };
  const storage = {
    deleteFile: async () => {
      calls.push('storage-delete');
      if (options.deleteStorage) await options.deleteStorage();
    },
  };
  const auditLogs = {
    log: async (event: Record<string, unknown>) => {
      calls.push(`audit:${String(event.action)}`);
      audits.push(event);
    },
  };
  const storageCleanupQueue = {
    enqueueStorageCleanup: async (payload: Record<string, unknown>) => {
      calls.push('cleanup-enqueue');
      cleanupJobs.push(payload);
      return options.enqueueCleanup ? options.enqueueCleanup() : true;
    },
  };

  return {
    service: new FilesService(
      prisma as never,
      auditLogs as never,
      storage as never,
      storageCleanupQueue as never,
    ),
    calls,
    audits,
    cleanupJobs,
  };
}

describe('file deletion integrity', () => {
  it('rejects deletion of a referenced file before storage is touched', async () => {
    const foreignKeyError = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      { code: 'P2003', clientVersion: '6.19.3' },
    );
    const { service, calls } = createHarness({
      deleteFile: async () => {
        throw foreignKeyError;
      },
    });

    await assert.rejects(
      service.remove(user as never, file.id),
      (error: unknown) => error instanceof ConflictException,
    );
    assert.deepEqual(calls, ['metadata-delete']);
  });

  it('deletes metadata before storage for an unreferenced file', async () => {
    const { service, calls, audits } = createHarness();

    const result = await service.remove(user as never, file.id);

    assert.equal(result.success, true);
    assert.equal(result.data, null);
    assert.deepEqual(calls, ['metadata-delete', 'storage-delete', 'audit:delete']);
    assert.equal(audits[0]?.action, 'delete');
  });

  it('queues durable cleanup after metadata deletion succeeds but object deletion fails', async () => {
    const { service, calls, audits, cleanupJobs } = createHarness({
      deleteStorage: async () => {
        throw new Error('storage unavailable');
      },
    });

    const result = await service.remove(user as never, file.id, '127.0.0.1');

    assert.equal(result.success, true);
    assert.deepEqual(result.data, {
      storageCleanupRequired: true,
      storageCleanupQueued: true,
    });
    assert.deepEqual(calls, [
      'metadata-delete',
      'storage-delete',
      'cleanup-enqueue',
      'audit:storage_cleanup_required',
    ]);
    assert.deepEqual(cleanupJobs, [
      {
        tenantId: 'tenant-a',
        fileId: 'file-1',
        path: 'tenant-a/upload/file-1.pdf',
        actorId: 'user-1',
        ipAddress: '127.0.0.1',
      },
    ]);
    assert.equal(audits[0]?.action, 'storage_cleanup_required');
  });

  it('records a queue failure explicitly when cleanup cannot be scheduled', async () => {
    const { service, audits } = createHarness({
      deleteStorage: async () => {
        throw new Error('storage unavailable');
      },
      enqueueCleanup: async () => false,
    });

    const result = await service.remove(user as never, file.id);

    assert.deepEqual(result.data, {
      storageCleanupRequired: true,
      storageCleanupQueued: false,
    });
    assert.equal(audits[0]?.action, 'storage_cleanup_enqueue_failed');
  });
});
