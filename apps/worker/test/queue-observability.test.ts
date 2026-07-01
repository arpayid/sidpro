import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createOpaqueLogReference,
  createStorageCleanupCompletedEvent,
  createStorageCleanupFailureEvent,
  createStorageCleanupQueueHealthEvent,
  getStorageCleanupQueueCounts,
  parsePositiveInteger,
} from '../src/queue-observability';

describe('storage cleanup queue observability', () => {
  it('normalizes queue counts and marks a failed backlog as degraded', async () => {
    const counts = await getStorageCleanupQueueCounts({
      getJobCounts: async () => ({
        waiting: 4,
        active: 2,
        delayed: 1,
        failed: 3,
        paused: -1,
      }),
    });

    assert.deepEqual(counts, {
      waiting: 4,
      active: 2,
      delayed: 1,
      failed: 3,
      paused: 0,
    });
    assert.deepEqual(createStorageCleanupQueueHealthEvent(counts, 3, 'interval'), {
      event: 'storage_cleanup_queue_health',
      context: 'interval',
      status: 'degraded',
      failedThreshold: 3,
      counts,
    });
  });

  it('marks queue health as ok below the configured failure threshold', () => {
    const event = createStorageCleanupQueueHealthEvent(
      { waiting: 0, active: 1, delayed: 0, failed: 1, paused: 0 },
      2,
      'startup',
    );

    assert.equal(event.status, 'ok');
  });

  it('uses opaque references for cleanup completion events', () => {
    const event = createStorageCleanupCompletedEvent({
      jobId: 'storage-cleanup-file-1',
      attemptsMade: 2,
      maxAttempts: 8,
    });

    assert.deepEqual(event, {
      event: 'storage_cleanup_job_completed',
      jobReference: createOpaqueLogReference('storage-cleanup-file-1'),
      attempt: 2,
      maxAttempts: 8,
    });
    assert.doesNotMatch(JSON.stringify(event), /file-1/);
  });

  it('records retry versus permanent storage cleanup failures without raw storage metadata', () => {
    const retry = createStorageCleanupFailureEvent({
      jobId: 'storage-cleanup-file-1',
      data: { fileId: 'file-1', tenantId: 'tenant-1', path: 'tenant-1/uploads/a.pdf' },
      attemptsMade: 2,
      maxAttempts: 8,
      error: new Error(
        'Could not delete tenant-1/uploads/a.pdf through https://access:secret@example.test/bucket',
      ),
    });
    assert.equal(retry.finalAttempt, false);
    assert.equal(retry.attempt, 2);
    assert.equal(retry.jobReference, createOpaqueLogReference('storage-cleanup-file-1'));
    assert.doesNotMatch(JSON.stringify(retry), /file-1|tenant-1|uploads\/a\.pdf|access:secret/);
    assert.match(retry.error, /\[redacted\]|\[redacted-url\]/);

    const permanent = createStorageCleanupFailureEvent({
      jobId: 'storage-cleanup-file-2',
      attemptsMade: 8,
      maxAttempts: 8,
      error: 'access denied',
    });
    assert.equal(permanent.finalAttempt, true);
    assert.equal(permanent.jobReference, createOpaqueLogReference('storage-cleanup-file-2'));
  });

  it('uses safe positive environment values with a fallback', () => {
    assert.equal(parsePositiveInteger(undefined, 60_000), 60_000);
    assert.equal(parsePositiveInteger('90000', 60_000), 90_000);
    assert.equal(parsePositiveInteger('0', 60_000), 60_000);
    assert.equal(parsePositiveInteger('-2', 60_000), 60_000);
    assert.equal(parsePositiveInteger('abc', 60_000), 60_000);
  });
});
