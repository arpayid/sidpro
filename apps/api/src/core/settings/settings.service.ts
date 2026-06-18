import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { successResponse } from '../../common/utils/response.util';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAll(user: JwtPayload) {
    const tenantId = this.requireTenant(user);
    const data = await this.prisma.setting.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });
    return successResponse(data);
  }

  async findOne(user: JwtPayload, key: string) {
    const tenantId = this.requireTenant(user);
    const setting = await this.prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (!setting) throw new NotFoundException('Setting tidak ditemukan');
    return successResponse(setting);
  }

  async upsert(
    user: JwtPayload,
    key: string,
    value: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const setting = await this.prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: { tenantId, key, value: value as object },
      update: { value: value as object },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'upsert',
      module: 'settings',
      entityType: 'setting',
      entityId: setting.id,
      metadata: { key },
      ipAddress,
    });

    return successResponse(setting, 'Setting berhasil disimpan');
  }

  async remove(user: JwtPayload, key: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });
    if (!existing) throw new NotFoundException('Setting tidak ditemukan');

    await this.prisma.setting.delete({
      where: { tenantId_key: { tenantId, key } },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'settings',
      entityType: 'setting',
      entityId: existing.id,
      metadata: { key },
      ipAddress,
    });

    return successResponse(null, 'Setting berhasil dihapus');
  }
}
