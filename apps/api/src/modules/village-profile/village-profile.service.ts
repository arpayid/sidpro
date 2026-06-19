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

    const contact = await this.getContactSetting(tenant.id);
    const officials = await this.getOfficials(tenant.id);

    return successResponse({
      tenant: { id: tenant.id, name: tenant.name, code: tenant.code },
      village,
      contact,
      officials,
    });
  }

  private async getOfficials(tenantId: string) {
    const signatory = await this.prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: 'letters.signatory' } },
    });
    const value = (signatory?.value ?? {}) as { name?: string; title?: string };
    if (!value.name) return [];
    return [{ name: value.name, title: value.title ?? 'Pejabat Desa' }];
  }

  private async getContactSetting(tenantId: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: 'village.contact' } },
    });
    const value = (setting?.value ?? {}) as { phone?: string; email?: string };
    return {
      phone: value.phone ?? null,
      email: value.email ?? null,
    };
  }

  private async upsertContactSetting(
    tenantId: string,
    contact: { phone?: string; email?: string },
  ) {
    await this.prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: 'village.contact' } },
      update: { value: contact },
      create: { tenantId, key: 'village.contact', value: contact },
    });
  }

  async getForTenant(user: JwtPayload) {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: { villages: true },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    const contact = await this.getContactSetting(tenant.id);

    return successResponse({
      tenant: { id: tenant.id, name: tenant.name, code: tenant.code },
      village: tenant.villages[0] ?? null,
      contact,
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
      contactPhone?: string;
      contactEmail?: string;
    },
    ipAddress?: string,
  ) {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');

    const { contactPhone, contactEmail, ...villageFields } = body;

    const village = await this.prisma.village.findFirst({
      where: { tenantId: user.tenantId },
    });

    const updated = village
      ? await this.prisma.village.update({
          where: { id: village.id },
          data: villageFields,
        })
      : await this.prisma.village.create({
          data: {
            tenantId: user.tenantId,
            name: villageFields.name ?? 'Desa',
            code: 'default',
            ...villageFields,
          },
        });

    if (contactPhone !== undefined || contactEmail !== undefined) {
      const existing = await this.getContactSetting(user.tenantId);
      await this.upsertContactSetting(user.tenantId, {
        phone: contactPhone ?? existing.phone ?? undefined,
        email: contactEmail ?? existing.email ?? undefined,
      });
    }

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
