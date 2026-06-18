import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import { sanitizeAuditLog } from './audit-metadata.util';

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

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
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

  private buildTenantWhere(user: JwtPayload): Prisma.AuditLogWhereInput {
    if (user.tenantId) {
      return { tenantId: user.tenantId };
    }
    return {};
  }

  private buildWhere(user: JwtPayload, query: AuditLogQuery): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {
      ...this.buildTenantWhere(user),
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { module: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { actor: { name: { contains: search, mode: 'insensitive' } } },
        { actor: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  async findAll(user: JwtPayload, query: AuditLogQuery) {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const where = this.buildWhere(user, query);

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const data = rows.map((row) => sanitizeAuditLog(row));
    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { actor: { select: { id: true, name: true, email: true } } },
    });

    if (!log) throw new NotFoundException('Audit log tidak ditemukan');
    if (user.tenantId && log.tenantId !== user.tenantId) {
      throw new ForbiddenException('Akses audit log ditolak');
    }

    return successResponse(sanitizeAuditLog(log));
  }
}
