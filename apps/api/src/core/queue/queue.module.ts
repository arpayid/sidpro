import { Global, Module } from '@nestjs/common';
import { NotificationQueueService } from './notification-queue.service';
import { StorageCleanupQueueService } from './storage-cleanup-queue.service';

@Global()
@Module({
  providers: [NotificationQueueService, StorageCleanupQueueService],
  exports: [NotificationQueueService, StorageCleanupQueueService],
})
export class QueueModule {}
