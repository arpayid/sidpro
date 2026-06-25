import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  COMPLAINT_STATUS_EMAIL_JOB_NAME,
  NOTIFICATION_QUEUE_NAME,
  type ComplaintStatusEmailJob,
} from '@sidpro/types';
import { NotificationQueueService } from '../src/core/queue/notification-queue.service.js';

function connectionFromRedisUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

const redisUrl = process.env.REDIS_URL;

describe('NotificationQueueService enqueue smoke', { skip: !redisUrl }, () => {
  it('enqueues complaint status email jobs on the notifications queue', async () => {
    assert.ok(redisUrl, 'REDIS_URL is required for this integration smoke test');

    const queue = new Queue<ComplaintStatusEmailJob>(NOTIFICATION_QUEUE_NAME, {
      connection: connectionFromRedisUrl(redisUrl),
    });
    const service = new NotificationQueueService(
      new ConfigService({ REDIS_URL: redisUrl }),
    );

    try {
      await queue.drain(true);

      await service.enqueueComplaintStatusEmail({
        tenantId: 'tenant-smoke',
        complaintId: 'complaint-smoke',
        ticket: 'PGD-SMOKE',
        title: 'Smoke notification',
        reporterEmail: 'warga@example.test',
        reporterName: 'Warga Smoke',
        fromStatus: 'submitted',
        toStatus: 'verified',
        fromStatusLabel: 'Masuk',
        statusLabel: 'Diverifikasi',
        note: 'Smoke test notification queue.',
        appUrl: 'http://localhost:3000',
      });

      const waitingJobs = await queue.getWaiting();
      const job = waitingJobs.find((item) => item.data.ticket === 'PGD-SMOKE');

      assert.ok(job, 'expected smoke notification job to be waiting in Redis');
      assert.equal(job.name, COMPLAINT_STATUS_EMAIL_JOB_NAME);
      assert.equal(job.queueName, NOTIFICATION_QUEUE_NAME);
      assert.equal(job.data.type, COMPLAINT_STATUS_EMAIL_JOB_NAME);
      assert.equal(job.data.reporterEmail, 'warga@example.test');
    } finally {
      await service.onModuleDestroy();
      await queue.drain(true);
      await queue.close();
    }
  });
});
