export const STORAGE_CLEANUP_QUEUE_STATES = [
  'waiting',
  'active',
  'delayed',
  'failed',
  'paused',
] as const;

export type StorageCleanupQueueState = (typeof STORAGE_CLEANUP_QUEUE_STATES)[number];

export interface StorageCleanupQueueCounts {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  paused: number;
}

export interface StorageCleanupQueueMetricsSource {
  getJobCounts(...states: StorageCleanupQueueState[]): Promise<Record<string, number>>;
}

export interface StorageCleanupQueueHealthEvent {
  event: 'storage_cleanup_queue_health';
  context: 'startup' | 'interval' | 'final_failure';
  status: 'ok' | 'degraded';
  failedThreshold: number;
  counts: StorageCleanupQueueCounts;
}

export interface StorageCleanupFailureEvent {
  event: 'storage_cleanup_job_failed';
  jobId: string | null;
  fileId: string | null;
  tenantId: string | null;
  path: string | null;
  attempt: number;
  maxAttempts: number;
  finalAttempt: boolean;
  error: string;
}

function nonNegativeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getStorageCleanupQueueCounts(
  queue: StorageCleanupQueueMetricsSource,
): Promise<StorageCleanupQueueCounts> {
  const raw = await queue.getJobCounts(...STORAGE_CLEANUP_QUEUE_STATES);
  return {
    waiting: nonNegativeCount(raw.waiting),
    active: nonNegativeCount(raw.active),
    delayed: nonNegativeCount(raw.delayed),
    failed: nonNegativeCount(raw.failed),
    paused: nonNegativeCount(raw.paused),
  };
}

export function createStorageCleanupQueueHealthEvent(
  counts: StorageCleanupQueueCounts,
  failedThreshold: number,
  context: StorageCleanupQueueHealthEvent['context'],
): StorageCleanupQueueHealthEvent {
  return {
    event: 'storage_cleanup_queue_health',
    context,
    status: counts.failed >= failedThreshold ? 'degraded' : 'ok',
    failedThreshold,
    counts,
  };
}

export function createStorageCleanupFailureEvent(input: {
  jobId?: string | null;
  data?: { fileId?: unknown; tenantId?: unknown; path?: unknown } | null;
  attemptsMade?: number | null;
  maxAttempts?: number | null;
  error: unknown;
}): StorageCleanupFailureEvent {
  const attempt = Math.max(1, nonNegativeCount(input.attemptsMade));
  const maxAttempts = Math.max(1, nonNegativeCount(input.maxAttempts));
  const error = input.error instanceof Error ? input.error.message : String(input.error ?? 'Unknown error');

  return {
    event: 'storage_cleanup_job_failed',
    jobId: input.jobId ?? null,
    fileId: typeof input.data?.fileId === 'string' ? input.data.fileId : null,
    tenantId: typeof input.data?.tenantId === 'string' ? input.data.tenantId : null,
    path: typeof input.data?.path === 'string' ? input.data.path : null,
    attempt,
    maxAttempts,
    finalAttempt: attempt >= maxAttempts,
    error: error.slice(0, 500),
  };
}
