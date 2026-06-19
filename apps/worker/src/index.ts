/**
 * SIDPRO Worker - Background job processor
 * Queues: pdf-generation, notifications, import-export
 */

import { Worker, Queue } from 'bullmq';
import type { ComplaintStatusEmailJob } from '@sidpro/types';
import { createEmailAdapter } from './email/factory';
import { processComplaintStatusEmail } from './jobs/complaint-status-email';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const url = new URL(redisUrl);

const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  password: url.password || undefined,
  maxRetriesPerRequest: null as null,
};

const emailAdapter = createEmailAdapter();

const queues = {
  pdf: new Queue('pdf-generation', { connection }),
  notifications: new Queue('notifications', { connection }),
  importExport: new Queue('import-export', { connection }),
};

const pdfWorker = new Worker(
  'pdf-generation',
  async (job) => {
    console.log(`[pdf-generation] Processing job ${job.id}:`, job.data);
    return { status: 'completed', message: 'PDF generation placeholder' };
  },
  { connection },
);

const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    if (job.name === 'complaint-status-email') {
      return processComplaintStatusEmail(emailAdapter, job.data as ComplaintStatusEmailJob);
    }

    console.log(`[notifications] Unknown job ${job.name}:`, job.data);
    return { status: 'ignored', jobName: job.name };
  },
  { connection },
);

pdfWorker.on('completed', (job) => console.log(`[pdf-generation] Job ${job.id} completed`));
pdfWorker.on('failed', (job, err) => console.error(`[pdf-generation] Job ${job?.id} failed:`, err));

notificationWorker.on('completed', (job) =>
  console.log(`[notifications] Job ${job.id} (${job.name}) completed`),
);
notificationWorker.on('failed', (job, err) =>
  console.error(`[notifications] Job ${job?.id} (${job?.name}) failed:`, err),
);

console.log('SIDPRO Worker started');
console.log('Email adapter:', process.env.SMTP_HOST ? 'smtp' : 'console');
console.log('Queues:', Object.keys(queues).join(', '));

process.on('SIGTERM', async () => {
  await Promise.all([pdfWorker.close(), notificationWorker.close()]);
  process.exit(0);
});
