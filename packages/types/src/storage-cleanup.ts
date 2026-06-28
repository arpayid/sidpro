export const STORAGE_CLEANUP_QUEUE_NAME = 'storage-cleanup' as const;
export const STORAGE_CLEANUP_JOB_NAME = 'delete-orphaned-object' as const;

export type StorageCleanupTarget = 'object' | 'prefix';

export interface StorageCleanupJob {
  type: typeof STORAGE_CLEANUP_JOB_NAME;
  tenantId: string;
  fileId: string;
  path: string;
  target?: StorageCleanupTarget;
  letterRequestId?: string;
  actorId?: string | null;
  ipAddress?: string | null;
}
