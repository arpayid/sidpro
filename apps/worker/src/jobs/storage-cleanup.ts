import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import {
  STORAGE_CLEANUP_JOB_NAME,
  type StorageCleanupJob,
  type StorageCleanupTarget,
} from '@sidpro/types';

interface StorageCleanupAttempt {
  attempt: number;
  maxAttempts: number;
}

interface StorageCleanupProcessorDeps {
  prisma: Pick<PrismaClient, 'auditLog' | 'file' | 'letterRequest'>;
  storage: {
    deleteFile(path: string): Promise<void>;
    deletePrefix(prefix: string): Promise<void>;
  };
}

interface StorageCleanupRuntime {
  process(data: unknown, attempt: StorageCleanupAttempt): Promise<{ path: string }>;
  close(): Promise<void>;
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown storage cleanup error';
  return message.slice(0, 500);
}

function parseCleanupTarget(value: unknown): StorageCleanupTarget {
  if (value === undefined || value === null) return 'object';
  if (value === 'object' || value === 'prefix') return value;
  throw new Error('Storage cleanup target must be object or prefix');
}

export function parseStorageCleanupJob(data: unknown): StorageCleanupJob {
  const job = data as Partial<StorageCleanupJob> | null;
  if (!job || job.type !== STORAGE_CLEANUP_JOB_NAME) {
    throw new Error('Invalid storage cleanup job type');
  }
  if (!job.tenantId || !job.fileId || !job.path) {
    throw new Error('Storage cleanup job requires tenantId, fileId, and path');
  }

  const target = parseCleanupTarget(job.target);
  if (!job.path.startsWith(`${job.tenantId}/`)) {
    throw new Error('Storage cleanup path must remain within the job tenant prefix');
  }
  if (target === 'prefix' && !job.path.endsWith('/')) {
    throw new Error('Storage cleanup prefix target must end with a slash');
  }

  return {
    type: STORAGE_CLEANUP_JOB_NAME,
    tenantId: job.tenantId,
    fileId: job.fileId,
    path: job.path,
    target,
    letterRequestId: job.letterRequestId,
    actorId: job.actorId ?? null,
    ipAddress: job.ipAddress ?? null,
  };
}

async function writeAudit(
  deps: StorageCleanupProcessorDeps,
  job: StorageCleanupJob,
  action: string,
  metadata: Record<string, unknown>,
) {
  await deps.prisma.auditLog.create({
    data: {
      tenantId: job.tenantId,
      actorId: job.actorId ?? null,
      action,
      module: 'files',
      entityType: 'file',
      entityId: job.fileId,
      metadata: {
        path: job.path,
        target: job.target ?? 'object',
        ...(job.letterRequestId ? { letterRequestId: job.letterRequestId } : {}),
        ...metadata,
      },
      ipAddress: job.ipAddress ?? null,
    },
  });
}

export async function processStorageCleanupJob(
  deps: StorageCleanupProcessorDeps,
  data: unknown,
  context: StorageCleanupAttempt,
): Promise<{ path: string }> {
  const job = parseStorageCleanupJob(data);
  const attempt = Math.max(1, context.attempt);
  const maxAttempts = Math.max(1, context.maxAttempts);
  let letterRequestClaimed = false;

  try {
    if (job.target === 'prefix') {
      if (job.letterRequestId) {
        const claim = await deps.prisma.letterRequest.updateMany({
          where: {
            id: job.letterRequestId,
            tenantId: job.tenantId,
            status: 'approved',
          },
          data: { status: 'generating' },
        });
        if (claim.count !== 1) {
          await writeAudit(deps, job, 'storage_cleanup_skipped', {
            attempt,
            maxAttempts,
            reason: 'letter_request_not_available_for_cleanup',
          });
          return { path: job.path };
        }
        letterRequestClaimed = true;
      }

      const referencedFile = await deps.prisma.file.findFirst({
        where: {
          tenantId: job.tenantId,
          path: { startsWith: job.path },
        },
        select: { id: true },
      });
      if (referencedFile) {
        await writeAudit(deps, job, 'storage_cleanup_skipped', {
          attempt,
          maxAttempts,
          reason: 'referenced_file_exists',
          referencedFileId: referencedFile.id,
        });
        return { path: job.path };
      }

      await deps.storage.deletePrefix(job.path);
    } else {
      await deps.storage.deleteFile(job.path);
    }
    await writeAudit(deps, job, 'storage_cleanup_completed', { attempt, maxAttempts });
    return { path: job.path };
  } catch (error) {
    const finalAttempt = attempt >= maxAttempts;
    await writeAudit(
      deps,
      job,
      finalAttempt ? 'storage_cleanup_failed' : 'storage_cleanup_retry',
      {
        attempt,
        maxAttempts,
        error: safeErrorMessage(error),
      },
    );
    throw error;
  } finally {
    if (letterRequestClaimed && job.letterRequestId) {
      await deps.prisma.letterRequest.updateMany({
        where: {
          id: job.letterRequestId,
          tenantId: job.tenantId,
          status: 'generating',
        },
        data: { status: 'approved' },
      });
    }
  }
}

function createStorageClientFromEnv() {
  const endpoint = process.env.MINIO_ENDPOINT;
  const port = process.env.MINIO_PORT ?? '9000';
  const useSsl = process.env.MINIO_USE_SSL === 'true';
  const accessKeyId = process.env.MINIO_ROOT_USER;
  const secretAccessKey = process.env.MINIO_ROOT_PASSWORD;
  const bucket = process.env.MINIO_BUCKET ?? 'sidpro-files';

  const missing = [
    ['DATABASE_URL', process.env.DATABASE_URL],
    ['MINIO_ENDPOINT', endpoint],
    ['MINIO_ROOT_USER', accessKeyId],
    ['MINIO_ROOT_PASSWORD', secretAccessKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) {
    throw new Error(`Storage cleanup worker requires: ${missing.join(', ')}`);
  }

  const client = new S3Client({
    endpoint: `${useSsl ? 'https' : 'http'}://${endpoint}:${port}`,
    region: 'us-east-1',
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
    forcePathStyle: true,
  });

  return {
    deleteFile: async (path: string) => {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }));
    },
    deletePrefix: async (prefix: string) => {
      let continuationToken: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        for (const object of page.Contents ?? []) {
          if (object.Key) {
            await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
          }
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);
    },
  };
}

export function createStorageCleanupProcessor(): StorageCleanupRuntime {
  const prisma = new PrismaClient();
  const storage = createStorageClientFromEnv();

  return {
    process: (data, attempt) => processStorageCleanupJob({ prisma, storage }, data, attempt),
    close: () => prisma.$disconnect(),
  };
}
