import { createHash } from 'node:crypto';

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

export interface StorageCleanupCompletedEvent {
  event: 'storage_cleanup_job_completed';
  jobReference: string | null;
  attempt: number;
  maxAttempts: number;
}

export interface StorageCleanupFailureEvent {
  event: 'storage_cleanup_job_failed';
  jobReference: string | null;
  attempt: number;
  maxAttempts: number;
  finalAttempt: boolean;
  error: string;
}

function nonNegativeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function normalizedReferenceValue(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return null;
}

function redactKnownMetadata(message: string, data: Record<string, unknown> | null | undefined): string {
  const values = [data?.path, data?.fileId, data?.tenantId]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .sort((left, right) => right.length - left.length);

  return values.reduce((redacted, value) => redacted.replaceAll(value, '[redacted]'), message);
}

function sanitizeErrorMessage(error: unknown, data: Record<string, unknown> | null | undefined): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return redactKnownMetadata(message, data)
    .replace(/\b(?:https?|s3):\/\/[^\s'"`]+/gi, '[redacted-url]')
    .slice(0, 500);
}

export function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function createOpaqueLogReference(value: unknown): string | null {
  const normalized = normalizedReferenceValue(value);
  if (!normalized) return null;
  return `sha256:${createHash('sha256').update(normalized).digest('hex').slice(0, 16)}`;
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

export function createStorageCleanupCompletedEvent(input: {
  jobId?: string | number | null;
  attemptsMade?: number | null;
  maxAttempts?: number | null;
}): StorageCleanupCompletedEvent {
  return {
    event: 'storage_cleanup_job_completed',
    jobReference: createOpaqueLogReference(input.jobId),
    attempt: Math.max(1, nonNegativeCount(input.attemptsMade)),
    maxAttempts: Math.max(1, nonNegativeCount(input.maxAttempts)),
  };
}

export function createStorageCleanupFailureEvent(input: {
  jobId?: string | number | null;
  data?: Record<string, unknown> | null;
  attemptsMade?: number | null;
  maxAttempts?: number | null;
  error: unknown;
}): StorageCleanupFailureEvent {
  const attempt = Math.max(1, nonNegativeCount(input.attemptsMade));
  const maxAttempts = Math.max(1, nonNegativeCount(input.maxAttempts));

  return {
    event: 'storage_cleanup_job_failed',
    jobReference: createOpaqueLogReference(input.jobId),
    attempt,
    maxAttempts,
    finalAttempt: attempt >= maxAttempts,
    error: sanitizeErrorMessage(input.error, input.data),
  };
}
