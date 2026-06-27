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
} = {}) {
  const calls: string[] = [];
  const audits: Array<Record<string, unknown>> = [];
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

  return {
    service: new FilesService(prisma as never, auditLogs as never, storage as never),
    calls,
    audits,
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

  it('records storage cleanup work after metadata deletion succeeds but object deletion fails', async () => {
    const { service, calls, audits } = createHarness({
      deleteStorage: async () => {
        throw new Error('storage unavailable');
      },
    });

    const result = await service.remove(user as never, file.id);

    assert.equal(result.success, true);
    assert.deepEqual(result.data, { storageCleanupRequired: true });
    assert.deepEqual(calls, [
      'metadata-delete',
      'storage-delete',
      'audit:storage_cleanup_required',
    ]);
    assert.equal(audits[0]?.action, 'storage_cleanup_required');
  });
});
