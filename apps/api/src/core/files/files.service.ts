import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAll(
    user: JwtPayload,
    page = 1,
    limit = 20,
    ownerType?: string,
    ownerId?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      ...(ownerType ? { ownerType } : {}),
      ...(ownerId ? { ownerId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.file.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const file = await this.prisma.file.findFirst({ where: { id, tenantId } });
    if (!file) throw new NotFoundException('File tidak ditemukan');
    return successResponse(file);
  }

  async create(
    user: JwtPayload,
    body: {
      ownerType: string;
      ownerId?: string;
      path: string;
      mimeType: string;
      size: number;
      checksum?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const file = await this.prisma.file.create({
      data: { tenantId, ...body },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'files',
      entityType: 'file',
      entityId: file.id,
      ipAddress,
    });

    return successResponse(file, 'Metadata file berhasil dibuat');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: { ownerType?: string; ownerId?: string; path?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.file.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('File tidak ditemukan');

    const file = await this.prisma.file.update({ where: { id }, data: body });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'files',
      entityType: 'file',
      entityId: id,
      ipAddress,
    });

    return successResponse(file, 'Metadata file berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.file.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('File tidak ditemukan');

    await this.prisma.file.delete({ where: { id } });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'files',
      entityType: 'file',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'Metadata file berhasil dihapus');
  }
}
