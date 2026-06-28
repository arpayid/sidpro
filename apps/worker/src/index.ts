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
import {
  createStorageCleanupFailureEvent,
  createStorageCleanupQueueHealthEvent,
  getStorageCleanupQueueCounts,
  parsePositiveInteger,
} from './queue-observability';

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
const storageCleanupHealthLogIntervalMs = parsePositiveInteger(
  process.env.STORAGE_CLEANUP_HEALTH_LOG_INTERVAL_MS,
  60_000,
);
const storageCleanupFailedThreshold = parsePositiveInteger(
  process.env.STORAGE_CLEANUP_FAILED_THRESHOLD,
  1,
);

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return message.slice(0, 500);
}

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

async function reportStorageCleanupQueueHealth(
  context: 'startup' | 'interval' | 'final_failure',
) {
  const queue = queues.storageCleanup;
  if (!queue) return;

  try {
    const counts = await getStorageCleanupQueueCounts(queue);
    const event = createStorageCleanupQueueHealthEvent(
      counts,
      storageCleanupFailedThreshold,
      context,
    );
    const message = JSON.stringify(event);
    if (event.status === 'degraded') {
      console.error(message);
    } else {
      console.log(message);
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'storage_cleanup_queue_health_error',
        context,
        error: safeErrorMessage(error),
      }),
    );
  }
}

const storageCleanupHealthTimer = queues.storageCleanup
  ? setInterval(() => {
      void reportStorageCleanupQueueHealth('interval');
    }, storageCleanupHealthLogIntervalMs)
  : null;
storageCleanupHealthTimer?.unref();

if (queues.storageCleanup) {
  void reportStorageCleanupQueueHealth('startup');
}

notificationWorker.on('completed', (job) =>
  console.log(`[notifications] Job ${job.id} (${job.name}) completed`),
);
pdfWorker?.on('completed', (job) => console.log(`[pdf-generation] Job ${job.id} completed`));
storageCleanupWorker?.on('completed', (job) =>
  console.log(
    JSON.stringify({
      event: 'storage_cleanup_job_completed',
      jobId: job.id ?? null,
      fileId: typeof job.data?.fileId === 'string' ? job.data.fileId : null,
      tenantId: typeof job.data?.tenantId === 'string' ? job.data.tenantId : null,
      path: typeof job.data?.path === 'string' ? job.data.path : null,
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts ?? 1,
    }),
  ),
);
storageCleanupWorker?.on('failed', (job, error) => {
  const event = createStorageCleanupFailureEvent({
    jobId: job?.id ?? null,
    data: job?.data,
    attemptsMade: job?.attemptsMade ?? null,
    maxAttempts: job?.opts.attempts ?? null,
    error,
  });
  console.error(JSON.stringify(event));
  if (event.finalAttempt) {
    void reportStorageCleanupQueueHealth('final_failure');
  }
});
storageCleanupWorker?.on('error', (error) => {
  console.error(
    JSON.stringify({
      event: 'storage_cleanup_worker_error',
      error: safeErrorMessage(error),
    }),
  );
});

for (const worker of [pdfWorker, notificationWorker]) {
  worker?.on('failed', (job, error) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, error);
  });
}

console.log('SIDPRO Worker started');
console.log('Email adapter:', process.env.SMTP_HOST ? 'smtp' : 'console');
console.log('PDF worker enabled:', pdfWorkerEnabled ? 'yes' : 'no');
console.log('Storage cleanup worker enabled:', storageCleanupWorkerEnabled ? 'yes' : 'no');
console.log('Storage cleanup health interval (ms):', storageCleanupHealthLogIntervalMs);
console.log('Storage cleanup failed threshold:', storageCleanupFailedThreshold);
console.log('Queues:', Object.keys(queues).join(', '));

async function closeWorker() {
  if (storageCleanupHealthTimer) clearInterval(storageCleanupHealthTimer);
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
