import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { successResponse } from '../../common/utils/response.util';

@Injectable()
export class VillageProfileService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  async getPublic(tenantCode: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: tenantCode },
      include: { villages: true },
    });
    if (!tenant) throw new NotFoundException('Desa tidak ditemukan');

    const village = tenant.villages[0];
    if (!village) throw new NotFoundException('Profil desa belum tersedia');

    return successResponse({
      tenant: { id: tenant.id, name: tenant.name, code: tenant.code },
      village,
    });
  }

  async getForTenant(user: JwtPayload) {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: { villages: true },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    return successResponse({
      tenant: { id: tenant.id, name: tenant.name, code: tenant.code },
      village: tenant.villages[0] ?? null,
    });
  }

  async update(
    user: JwtPayload,
    body: {
      name?: string;
      address?: string;
      province?: string;
      regency?: string;
      district?: string;
      postalCode?: string;
      vision?: string;
      mission?: string;
      description?: string;
    },
    ipAddress?: string,
  ) {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');

    const village = await this.prisma.village.findFirst({
      where: { tenantId: user.tenantId },
    });

    const updated = village
      ? await this.prisma.village.update({
          where: { id: village.id },
          data: body,
        })
      : await this.prisma.village.create({
          data: {
            tenantId: user.tenantId,
            name: body.name ?? 'Desa',
            code: 'default',
            ...body,
          },
        });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'village-profile',
      entityType: 'village',
      entityId: updated.id,
      ipAddress,
    });

    return successResponse(updated, 'Profil desa berhasil diperbarui');
  }
}
