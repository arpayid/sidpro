import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  STORAGE_CLEANUP_JOB_NAME,
  STORAGE_CLEANUP_QUEUE_NAME,
  type StorageCleanupJob,
} from '@sidpro/types';

export type StorageCleanupPayload = Omit<StorageCleanupJob, 'type'>;

@Injectable()
export class StorageCleanupQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(StorageCleanupQueueService.name);
  private readonly queue: Queue | null;

  constructor(private readonly config: ConfigService) {
    this.queue = this.createQueue();
  }

  private createQueue(): Queue | null {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.error('REDIS_URL not set — storage cleanup jobs cannot be queued');
      return null;
    }

    try {
      const url = new URL(redisUrl);
      return new Queue(STORAGE_CLEANUP_QUEUE_NAME, {
        connection: {
          host: url.hostname,
          port: Number(url.port) || 6379,
          password: url.password || undefined,
          maxRetriesPerRequest: null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to initialize storage cleanup queue', error);
      return null;
    }
  }

  async enqueueStorageCleanup(payload: StorageCleanupPayload): Promise<boolean> {
    if (!this.queue) return false;

    try {
      const job: StorageCleanupJob = {
        type: STORAGE_CLEANUP_JOB_NAME,
        ...payload,
      };

      await this.queue.add(STORAGE_CLEANUP_JOB_NAME, job, {
        jobId: `storage-cleanup-${payload.fileId}`,
        attempts: 8,
        backoff: { type: 'exponential', delay: 5000 },
        // Keep enough recent state for queue-health logs and incident follow-up.
        // BullMQ interprets age in seconds.
        removeOnComplete: { age: 86_400, count: 1000 },
        removeOnFail: { age: 604_800, count: 500 },
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to enqueue storage cleanup for file ${payload.fileId}`, error);
      return false;
    }
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }
}
