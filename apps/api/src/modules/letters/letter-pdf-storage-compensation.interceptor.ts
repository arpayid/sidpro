import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Request } from 'express';
import { Observable, catchError, from, mergeMap, throwError } from 'rxjs';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { PrismaService } from '../../database/prisma.service';
import { StorageCleanupQueueService } from '../../core/queue/storage-cleanup-queue.service';
import { StorageService } from '../../core/storage/storage.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

type LetterPdfRequest = Request & {
  params: { id?: string };
  user?: JwtPayload;
};

@Injectable()
export class LetterPdfStorageCompensationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LetterPdfStorageCompensationInterceptor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly storageCleanupQueue: StorageCleanupQueueService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<LetterPdfRequest>();
    const tenantId = request.user?.tenantId;
    const letterRequestId = request.params?.id;

    return next.handle().pipe(
      catchError((error) =>
        from(
          this.compensateIfNeeded({
            tenantId,
            letterRequestId,
            actorId: request.user?.sub,
            ipAddress: request.ip,
          }),
        ).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }

  private async compensateIfNeeded(input: {
    tenantId?: string | null;
    letterRequestId?: string;
    actorId?: string;
    ipAddress?: string;
  }) {
    if (!input.tenantId || !input.letterRequestId) return;

    const { tenantId, letterRequestId, actorId, ipAddress } = input;
    const prefix = `${tenantId}/letters/${letterRequestId}/`;

    try {
      const persistedOutput = await this.prisma.letterOutput.findFirst({
        where: { tenantId, letterRequestId },
        select: { id: true },
      });
      if (persistedOutput) return;

      let paths: string[];
      try {
        paths = await this.storage.listFilesByPrefix(prefix);
      } catch (error) {
        await this.queuePrefixCleanup({
          tenantId,
          letterRequestId,
          prefix,
          actorId,
          ipAddress,
          reason: 'letter_pdf_object_probe_failed',
        });
        return;
      }

      if (paths.length === 0) return;

      try {
        await this.storage.deletePrefix(prefix);
        await this.auditLogs.log({
          tenantId,
          actorId,
          action: 'storage_cleanup_completed',
          module: 'letters',
          entityType: 'letter_request',
          entityId: letterRequestId,
          metadata: {
            reason: 'letter_pdf_metadata_transaction_failed',
            cleanupTarget: 'prefix',
            prefix,
            objectCount: paths.length,
            source: 'generate_pdf_compensation',
          },
          ipAddress,
        });
      } catch (error) {
        await this.queuePrefixCleanup({
          tenantId,
          letterRequestId,
          prefix,
          actorId,
          ipAddress,
          reason: 'letter_pdf_direct_cleanup_failed',
        });
      }
    } catch (error) {
      this.logger.error(
        `Letter PDF storage compensation failed for request ${letterRequestId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async queuePrefixCleanup(input: {
    tenantId: string;
    letterRequestId: string;
    prefix: string;
    actorId?: string;
    ipAddress?: string;
    reason: string;
  }) {
    const cleanupId = `letter-pdf-orphan-${createHash('sha256')
      .update(input.prefix)
      .digest('hex')}`;
    const queued = await this.storageCleanupQueue.enqueueStorageCleanup({
      tenantId: input.tenantId,
      fileId: cleanupId,
      path: input.prefix,
      target: 'prefix',
      actorId: input.actorId,
      ipAddress: input.ipAddress,
    });

    await this.auditLogs.log({
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: queued ? 'storage_cleanup_required' : 'storage_cleanup_enqueue_failed',
      module: 'letters',
      entityType: 'letter_request',
      entityId: input.letterRequestId,
      metadata: {
        reason: input.reason,
        cleanupTarget: 'prefix',
        prefix: input.prefix,
        cleanupQueued: queued,
        source: 'generate_pdf_compensation',
      },
      ipAddress: input.ipAddress,
    });
  }
}
