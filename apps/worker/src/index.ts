/**
 * SIDPRO Worker - Background job processor
 * Queues: pdf-generation, notifications, import-export
 */

import { Worker, Queue } from 'bullmq';
import { COMPLAINT_STATUS_EMAIL_JOB_NAME, NOTIFICATION_QUEUE_NAME } from '@sidpro/types';
import type { ComplaintStatusEmailJob } from '@sidpro/types';
import { createEmailAdapter } from './email/factory';
import { processComplaintStatusEmail } from './jobs/complaint-status-email';
import { createLetterPdfProcessor } from './jobs/letter-pdf';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const url = new URL(redisUrl);

const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  password: url.password || undefined,
  maxRetriesPerRequest: null as null,
};

const emailAdapter = createEmailAdapter();
const pdfWorkerEnabled = process.env.ENABLE_PDF_WORKER === 'true';

function assertPdfWorkerConfig() {
  if (!pdfWorkerEnabled) return;

  const missing = ['MINIO_ENDPOINT', 'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD', 'MINIO_BUCKET'].filter(
    (key) => !process.env[key],
  );
  if (missing.length) {
    throw new Error(
      `ENABLE_PDF_WORKER=true requires explicit storage config: ${missing.join(', ')}`,
    );
  }
}

assertPdfWorkerConfig();
const letterPdfProcessor = pdfWorkerEnabled ? createLetterPdfProcessor() : null;

const queues = {
  notifications: new Queue(NOTIFICATION_QUEUE_NAME, { connection }),
  importExport: new Queue('import-export', { connection }),
  ...(pdfWorkerEnabled ? { pdf: new Queue('pdf-generation', { connection }) } : {}),
};

const pdfWorker = pdfWorkerEnabled
  ? new Worker(
      'pdf-generation',
      async (job) => {
        console.log(`[pdf-generation] Processing job ${job.id}:`, job.data);
        return letterPdfProcessor!.process(job.data);
      },
      { connection },
    )
  : null;

const notificationWorker = new Worker(
  NOTIFICATION_QUEUE_NAME,
  async (job) => {
    if (job.name === COMPLAINT_STATUS_EMAIL_JOB_NAME) {
      return processComplaintStatusEmail(emailAdapter, job.data as ComplaintStatusEmailJob);
    }

    console.log(`[notifications] Unknown job ${job.name}:`, job.data);
    return { status: 'ignored', jobName: job.name };
  },
  { connection },
);

pdfWorker?.on('completed', (job) => console.log(`[pdf-generation] Job ${job.id} completed`));
pdfWorker?.on('failed', (job, err) => console.error(`[pdf-generation] Job ${job?.id} failed:`, err));

notificationWorker.on('completed', (job) =>
  console.log(`[notifications] Job ${job.id} (${job.name}) completed`),
);
notificationWorker.on('failed', (job, err) =>
  console.error(`[notifications] Job ${job?.id} (${job?.name}) failed:`, err),
);

console.log('SIDPRO Worker started');
console.log('Email adapter:', process.env.SMTP_HOST ? 'smtp' : 'console');
console.log('PDF worker enabled:', pdfWorkerEnabled ? 'yes' : 'no');
console.log('Queues:', Object.keys(queues).join(', '));

process.on('SIGTERM', async () => {
  await Promise.all([pdfWorker?.close(), notificationWorker.close(), letterPdfProcessor?.close()]);
  process.exit(0);
});
