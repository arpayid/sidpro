import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import { isDistrictAdmin, isRegencyAdmin } from './tenant-scope.util';

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

  private async collectDescendantVillageIds(parentId: string): Promise<string[]> {
    const children = await this.prisma.tenant.findMany({
      where: { parentId, status: 'active' },
      select: { id: true, level: true },
    });

    const villageIds: string[] = [];
    for (const child of children) {
      if (child.level === 'desa') {
        villageIds.push(child.id);
      } else {
        villageIds.push(...(await this.collectDescendantVillageIds(child.id)));
      }
    }
    return villageIds;
  }

  private async requireRegencyAdmin(user: JwtPayload) {
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant scope required');
    }
    if (!isRegencyAdmin(user.roles) && !user.permissions.includes('tenants.regency_overview')) {
      throw new ForbiddenException('Akses dashboard kabupaten ditolak');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || tenant.level !== 'kabupaten') {
      throw new ForbiddenException('Tenant bukan level kabupaten');
    }

    return tenant;
  }

  private async requireDistrictAdmin(user: JwtPayload) {
    if (!user.tenantId) {
      throw new ForbiddenException('Tenant scope required');
    }
    if (!isDistrictAdmin(user.roles) && !user.permissions.includes('tenants.district_overview')) {
      throw new ForbiddenException('Akses dashboard kecamatan ditolak');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    if (!tenant || tenant.level !== 'kecamatan') {
      throw new ForbiddenException('Tenant bukan level kecamatan');
    }

    return tenant;
  }

  private async buildVillageStats(villageIds: string[]) {
    if (!villageIds.length) {
      return {
        villageCount: 0,
        totals: {
          residents: 0,
          families: 0,
          letterRequests: 0,
          pendingLetters: 0,
          complaints: 0,
          openComplaints: 0,
        },
        villages: [] as {
          id: string;
          name: string;
          code: string;
          status: string;
          residentCount: number;
          openComplaintCount: number;
          pendingLetterCount: number;
        }[],
      };
    }

    const tenantFilter = { tenantId: { in: villageIds } };
    const [
      residents,
      families,
      letterRequests,
      pendingLetters,
      complaints,
      openComplaints,
      villages,
    ] = await Promise.all([
      this.prisma.resident.count({ where: { ...tenantFilter, deletedAt: null } }),
      this.prisma.family.count({ where: { ...tenantFilter, deletedAt: null } }),
      this.prisma.letterRequest.count({ where: tenantFilter }),
      this.prisma.letterRequest.count({
        where: { ...tenantFilter, status: { in: ['submitted', 'verified'] } },
      }),
      this.prisma.complaint.count({ where: tenantFilter }),
      this.prisma.complaint.count({
        where: { ...tenantFilter, status: { notIn: ['closed', 'rejected'] } },
      }),
      this.prisma.tenant.findMany({
        where: { id: { in: villageIds } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true, status: true },
      }),
    ]);

    const villageStats = await Promise.all(
      villages.map(async (village) => {
        const [residentCount, openComplaintCount, pendingLetterCount] = await Promise.all([
          this.prisma.resident.count({
            where: { tenantId: village.id, deletedAt: null },
          }),
          this.prisma.complaint.count({
            where: { tenantId: village.id, status: { notIn: ['closed', 'rejected'] } },
          }),
          this.prisma.letterRequest.count({
            where: {
              tenantId: village.id,
              status: { in: ['submitted', 'verified'] },
            },
          }),
        ]);
        return {
          ...village,
          residentCount,
          openComplaintCount,
          pendingLetterCount,
        };
      }),
    );

    return {
      villageCount: villages.length,
      totals: {
        residents,
        families,
        letterRequests,
        pendingLetters,
        complaints,
        openComplaints,
      },
      villages: villageStats,
    };
  }

  async getRegencyOverview(user: JwtPayload) {
    const regency = await this.requireRegencyAdmin(user);
    const villageIds = await this.collectDescendantVillageIds(regency.id);
    const stats = await this.buildVillageStats(villageIds);

    return successResponse({
      regency: { id: regency.id, name: regency.name, code: regency.code },
      ...stats,
    });
  }

  async getDistrictOverview(user: JwtPayload) {
    const district = await this.requireDistrictAdmin(user);
    const villageIds = await this.collectDescendantVillageIds(district.id);
    const stats = await this.buildVillageStats(villageIds);

    return successResponse({
      district: { id: district.id, name: district.name, code: district.code },
      ...stats,
    });
  }

  async getVillageSummary(user: JwtPayload, villageId: string) {
    const regency = await this.requireRegencyAdmin(user);
    const villageIds = await this.collectDescendantVillageIds(regency.id);
    if (!villageIds.includes(villageId)) {
      throw new ForbiddenException('Desa tidak berada di bawah kabupaten ini');
    }

    const village = await this.prisma.tenant.findUnique({
      where: { id: villageId },
      select: { id: true, name: true, code: true, status: true, level: true },
    });
    if (!village || village.level !== 'desa') {
      throw new NotFoundException('Desa tidak ditemukan');
    }

    const profile = await this.prisma.village.findFirst({
      where: { tenantId: villageId },
      select: {
        name: true,
        regency: true,
        district: true,
        address: true,
        province: true,
      },
    });

    const [residents, families, pendingLetters, openComplaints, totalComplaints] =
      await Promise.all([
        this.prisma.resident.count({ where: { tenantId: villageId, deletedAt: null } }),
        this.prisma.family.count({ where: { tenantId: villageId, deletedAt: null } }),
        this.prisma.letterRequest.count({
          where: { tenantId: villageId, status: { in: ['submitted', 'verified'] } },
        }),
        this.prisma.complaint.count({
          where: { tenantId: villageId, status: { notIn: ['closed', 'rejected'] } },
        }),
        this.prisma.complaint.count({ where: { tenantId: villageId } }),
      ]);

    return successResponse({
      village,
      profile,
      stats: {
        residents,
        families,
        pendingLetters,
        openComplaints,
        totalComplaints,
      },
    });
  }

  async provisionVillage(
    user: JwtPayload,
    body: { name: string; code: string; parentId: string },
    ipAddress?: string,
  ) {
    this.assertAccess(user);

    const parent = await this.prisma.tenant.findUnique({ where: { id: body.parentId } });
    if (!parent) throw new NotFoundException('Parent tenant tidak ditemukan');
    if (!['kabupaten', 'kecamatan'].includes(parent.level)) {
      throw new BadRequestException('Parent harus level kabupaten atau kecamatan');
    }

    const existing = await this.prisma.tenant.findUnique({ where: { code: body.code } });
    if (existing) throw new ConflictException('Kode tenant sudah digunakan');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: body.name,
        code: body.code,
        level: 'desa',
        parentId: parent.id,
        status: 'active',
      },
    });

    await this.auditLogs.log({
      tenantId: parent.id,
      actorId: user.sub,
      action: 'provision_village',
      module: 'tenants',
      entityType: 'tenant',
      entityId: tenant.id,
      metadata: { name: body.name, code: body.code, parentId: body.parentId },
      ipAddress,
    });

    return successResponse(tenant, 'Tenant desa berhasil diprovisikan');
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
