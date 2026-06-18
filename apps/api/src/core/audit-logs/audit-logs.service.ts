import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditLogInput {
  tenantId?: string | null;
  actorId?: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? undefined,
        actorId: input.actorId ?? undefined,
        action: input.action,
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as object,
        ipAddress: input.ipAddress,
      },
    });
  }
}
