export const STORAGE_CLEANUP_QUEUE_NAME = 'storage-cleanup' as const;
export const STORAGE_CLEANUP_JOB_NAME = 'delete-orphaned-object' as const;

export interface StorageCleanupJob {
  type: typeof STORAGE_CLEANUP_JOB_NAME;
  tenantId: string;
  fileId: string;
  path: string;
  actorId?: string | null;
  ipAddress?: string | null;
}
