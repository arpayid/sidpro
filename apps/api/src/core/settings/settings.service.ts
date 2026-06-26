import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { settingKeySchema, upsertSettingSchema } from '@sidpro/validators';
import { parseWithZod } from '../../common/utils/zod-validation.util';
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
    const parsedKey = parseWithZod(settingKeySchema, key);
    const setting = await this.prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: parsedKey } },
    });
    if (!setting) throw new NotFoundException('Setting tidak ditemukan');
    return successResponse(setting);
  }

  async upsert(
    user: JwtPayload,
    key: string,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsedKey = parseWithZod(settingKeySchema, key);
    const parsed = parseWithZod(upsertSettingSchema, body);
    const setting = await this.prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: parsedKey } },
      create: { tenantId, key: parsedKey, value: parsed.value as object },
      update: { value: parsed.value as object },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'upsert',
      module: 'settings',
      entityType: 'setting',
      entityId: setting.id,
      metadata: { key: parsedKey },
      ipAddress,
    });

    return successResponse(setting, 'Setting berhasil disimpan');
  }

  async remove(user: JwtPayload, key: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const parsedKey = parseWithZod(settingKeySchema, key);
    const existing = await this.prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: parsedKey } },
    });
    if (!existing) throw new NotFoundException('Setting tidak ditemukan');

    await this.prisma.setting.delete({
      where: { tenantId_key: { tenantId, key: parsedKey } },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'settings',
      entityType: 'setting',
      entityId: existing.id,
      metadata: { key: parsedKey },
      ipAddress,
    });

    return successResponse(null, 'Setting berhasil dihapus');
  }
}
