import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
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
      return new Queue('notifications', {
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
        type: 'complaint-status-email',
        ...payload,
      };
      await this.queue.add('complaint-status-email', job, {
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
