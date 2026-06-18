import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  assertAccess(user: JwtPayload) {
    const allowed =
      user.roles.includes('superadmin_system') ||
      user.permissions.includes('settings.manage');
    if (!allowed) {
      throw new ForbiddenException('Akses tenant management ditolak');
    }
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    return successResponse(tenant);
  }

  async create(
    user: JwtPayload,
    body: { name: string; code: string; status?: string },
    ipAddress?: string,
  ) {
    this.assertAccess(user);

    const existing = await this.prisma.tenant.findUnique({ where: { code: body.code } });
    if (existing) throw new ConflictException('Kode tenant sudah digunakan');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: body.name,
        code: body.code,
        status: body.status ?? 'active',
      },
    });

    await this.auditLogs.log({
      tenantId: tenant.id,
      actorId: user.sub,
      action: 'create',
      module: 'tenants',
      entityType: 'tenant',
      entityId: tenant.id,
      ipAddress,
    });

    return successResponse(tenant, 'Tenant berhasil dibuat');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: { name?: string; status?: string },
    ipAddress?: string,
  ) {
    this.assertAccess(user);

    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant tidak ditemukan');

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: body,
    });

    await this.auditLogs.log({
      tenantId: id,
      actorId: user.sub,
      action: 'update',
      module: 'tenants',
      entityType: 'tenant',
      entityId: id,
      ipAddress,
    });

    return successResponse(tenant, 'Tenant berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    this.assertAccess(user);

    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant tidak ditemukan');

    await this.prisma.tenant.delete({ where: { id } });

    await this.auditLogs.log({
      tenantId: id,
      actorId: user.sub,
      action: 'delete',
      module: 'tenants',
      entityType: 'tenant',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'Tenant berhasil dihapus');
  }
}
