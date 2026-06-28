import { Queue, Worker } from 'bullmq';
import {
  COMPLAINT_STATUS_EMAIL_JOB_NAME,
  NOTIFICATION_QUEUE_NAME,
  STORAGE_CLEANUP_QUEUE_NAME,
} from '@sidpro/types';
import type { ComplaintStatusEmailJob } from '@sidpro/types';
import { createEmailAdapter } from './email/factory';
import { processComplaintStatusEmail } from './jobs/complaint-status-email';
import { createLetterPdfProcessor } from './jobs/letter-pdf';
import { createStorageCleanupProcessor } from './jobs/storage-cleanup';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redis = new URL(redisUrl);
const connection = {
  host: redis.hostname,
  port: Number(redis.port) || 6379,
  password: redis.password || undefined,
  maxRetriesPerRequest: null as null,
};

const emailAdapter = createEmailAdapter();
const pdfWorkerEnabled = process.env.ENABLE_PDF_WORKER === 'true';
const storageCleanupWorkerEnabled = process.env.ENABLE_STORAGE_CLEANUP_WORKER === 'true';

function assertPdfWorkerConfig() {
  if (!pdfWorkerEnabled) return;
  const missing = ['MINIO_ENDPOINT', 'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD', 'MINIO_BUCKET'].filter(
    (key) => !process.env[key],
  );
  if (missing.length) {
    throw new Error(`ENABLE_PDF_WORKER=true requires explicit storage config: ${missing.join(', ')}`);
  }
}

assertPdfWorkerConfig();
const letterPdfProcessor = pdfWorkerEnabled ? createLetterPdfProcessor() : null;
const storageCleanupProcessor = storageCleanupWorkerEnabled ? createStorageCleanupProcessor() : null;

const queues = {
  notifications: new Queue(NOTIFICATION_QUEUE_NAME, { connection }),
  importExport: new Queue('import-export', { connection }),
  ...(pdfWorkerEnabled ? { pdf: new Queue('pdf-generation', { connection }) } : {}),
  ...(storageCleanupWorkerEnabled
    ? { storageCleanup: new Queue(STORAGE_CLEANUP_QUEUE_NAME, { connection }) }
    : {}),
};

const pdfWorker = pdfWorkerEnabled
  ? new Worker(
      'pdf-generation',
      async (job) => letterPdfProcessor!.process(job.data),
      { connection },
    )
  : null;

const notificationWorker = new Worker(
  NOTIFICATION_QUEUE_NAME,
  async (job) => {
    if (job.name === COMPLAINT_STATUS_EMAIL_JOB_NAME) {
      return processComplaintStatusEmail(emailAdapter, job.data as ComplaintStatusEmailJob);
    }
    return { status: 'ignored', jobName: job.name };
  },
  { connection },
);

const storageCleanupWorker = storageCleanupWorkerEnabled
  ? new Worker(
      STORAGE_CLEANUP_QUEUE_NAME,
      async (job) =>
        storageCleanupProcessor!.process(job.data, {
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts ?? 1,
        }),
      { connection },
    )
  : null;

for (const worker of [pdfWorker, notificationWorker, storageCleanupWorker]) {
  worker?.on('failed', (job, error) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, error);
  });
}

console.log('SIDPRO Worker started');
console.log('Email adapter:', process.env.SMTP_HOST ? 'smtp' : 'console');
console.log('PDF worker enabled:', pdfWorkerEnabled ? 'yes' : 'no');
console.log('Storage cleanup worker enabled:', storageCleanupWorkerEnabled ? 'yes' : 'no');
console.log('Queues:', Object.keys(queues).join(', '));

async function closeWorker() {
  await Promise.all([
    pdfWorker?.close(),
    notificationWorker.close(),
    storageCleanupWorker?.close(),
    letterPdfProcessor?.close(),
    storageCleanupProcessor?.close(),
    ...Object.values(queues).map((queue) => queue.close()),
  ]);
}

process.once('SIGTERM', () => {
  void closeWorker();
});
