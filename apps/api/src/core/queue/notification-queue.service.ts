import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { COMPLAINT_STATUS_EMAIL_JOB_NAME, NOTIFICATION_QUEUE_NAME } from '@sidpro/types';
import type { ComplaintStatusEmailJob } from '@sidpro/types';

export type ComplaintStatusEmailPayload = Omit<ComplaintStatusEmailJob, 'type'>;

@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly queue: Queue | null;

  constructor(private readonly config: ConfigService) {
    this.queue = this.createQueue();
  }

  private createQueue(): Queue | null {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — complaint email notifications disabled');
      return null;
    }

    try {
      const url = new URL(redisUrl);
      return new Queue(NOTIFICATION_QUEUE_NAME, {
        connection: {
          host: url.hostname,
          port: Number(url.port) || 6379,
          password: url.password || undefined,
          maxRetriesPerRequest: null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to initialize notification queue', error);
      return null;
    }
  }

  async enqueueComplaintStatusEmail(payload: ComplaintStatusEmailPayload): Promise<void> {
    if (!this.queue) return;

    try {
      const job: ComplaintStatusEmailJob = {
        type: COMPLAINT_STATUS_EMAIL_JOB_NAME,
        ...payload,
      };
      await this.queue.add(COMPLAINT_STATUS_EMAIL_JOB_NAME, job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      });
    } catch (error) {
      this.logger.error('Failed to enqueue complaint status email', error);
    }
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }
}
