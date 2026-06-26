import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createTenantSchema, provisionVillageSchema, updateTenantSchema } from '@sidpro/validators';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import { isDistrictAdmin, isRegencyAdmin } from './tenant-scope.util';

const EXCLUDED_DESA_PERMISSIONS = [
  'tenants.regency_overview',
  'tenants.district_overview',
  'tenants.provision_village',
];

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

  assertProvisionAccess(user: JwtPayload) {
    const allowed =
      user.roles.includes('superadmin_system') ||
      user.permissions.includes('settings.manage') ||
      user.permissions.includes('tenants.provision_village');
    if (!allowed) {
      throw new ForbiddenException('Akses provisioning desa ditolak');
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

  async getProvisionParents(user: JwtPayload) {
    this.assertProvisionAccess(user);

    let rootId = user.tenantId;
    if (!rootId && user.roles.includes('superadmin_system')) {
      const regency = await this.prisma.tenant.findFirst({
        where: { level: 'kabupaten', status: 'active' },
        orderBy: { name: 'asc' },
      });
      rootId = regency?.id ?? null;
    }
    if (!rootId) {
      throw new ForbiddenException('Tenant scope required untuk opsi parent');
    }

    const root = await this.prisma.tenant.findUnique({ where: { id: rootId } });
    if (!root) throw new NotFoundException('Tenant tidak ditemukan');

    const parents: { id: string; name: string; code: string; level: string }[] = [];

    if (root.level === 'kabupaten') {
      parents.push({ id: root.id, name: root.name, code: root.code, level: root.level });
      const districts = await this.prisma.tenant.findMany({
        where: { parentId: root.id, level: 'kecamatan', status: 'active' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true, level: true },
      });
      parents.push(...districts);
    } else if (root.level === 'kecamatan') {
      parents.push({ id: root.id, name: root.name, code: root.code, level: root.level });
    } else {
      throw new ForbiddenException('Provisioning hanya dari tenant kabupaten/kecamatan');
    }

    return successResponse({ parents });
  }

  async provisionVillage(
    user: JwtPayload,
    body: {
      name: string;
      code: string;
      parentId: string;
      villageCode?: string;
      adminEmail?: string;
      adminName?: string;
    },
    ipAddress?: string,
  ) {
    this.assertProvisionAccess(user);
    const parsed = parseWithZod(provisionVillageSchema, body);

    const parent = await this.prisma.tenant.findUnique({ where: { id: parsed.parentId } });
    if (!parent) throw new NotFoundException('Parent tenant tidak ditemukan');
    if (!['kabupaten', 'kecamatan'].includes(parent.level)) {
      throw new BadRequestException('Parent harus level kabupaten atau kecamatan');
    }

    const existing = await this.prisma.tenant.findUnique({ where: { code: parsed.code } });
    if (existing) throw new ConflictException('Kode tenant sudah digunakan');

    const regency =
      parent.level === 'kabupaten'
        ? parent
        : await this.prisma.tenant.findUnique({ where: { id: parent.parentId ?? '' } });
    const districtName = parent.level === 'kecamatan' ? parent.name : null;

    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (parsed.adminEmail && !adminPassword) {
      throw new BadRequestException(
        'SEED_ADMIN_PASSWORD wajib di env untuk membuat admin desa saat provisioning',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: parsed.name,
          code: parsed.code,
          level: 'desa',
          parentId: parent.id,
          status: 'active',
        },
      });

      const villageCode = (parsed.villageCode ?? parsed.code).toUpperCase().slice(0, 16);
      await tx.village.create({
        data: {
          tenantId: tenant.id,
          name: parsed.name,
          code: villageCode,
          regency: regency?.name ?? null,
          district: districtName,
          description: `Desa diprovisikan otomatis — ${new Date().toISOString().slice(0, 10)}`,
        },
      });

      const allPermissions = await tx.permission.findMany();
      const desaAdminPermIds = allPermissions
        .filter((p) => !EXCLUDED_DESA_PERMISSIONS.includes(p.code))
        .map((p) => p.id);
      const operatorPermIds = allPermissions
        .filter((p) =>
          ['population', 'families', 'letters', 'complaints', 'cms'].some((m) =>
            p.module.startsWith(m),
          ),
        )
        .map((p) => p.id);
      const wargaPermIds = allPermissions
        .filter((p) => ['letters.create', 'complaints.create'].includes(p.code))
        .map((p) => p.id);

      const roleDefs = [
        { code: 'admin_desa', name: 'Admin Desa', scope: 'tenant', permIds: desaAdminPermIds },
        { code: 'operator_desa', name: 'Operator Desa', scope: 'tenant', permIds: operatorPermIds },
        { code: 'warga', name: 'Warga', scope: 'tenant', permIds: wargaPermIds },
      ];

      let adminRoleId: string | null = null;
      for (const roleDef of roleDefs) {
        const role = await tx.role.create({
          data: {
            name: roleDef.name,
            code: roleDef.code,
            scope: roleDef.scope,
            tenantId: tenant.id,
          },
        });
        if (roleDef.code === 'admin_desa') adminRoleId = role.id;
        for (const permissionId of roleDef.permIds) {
          await tx.rolePermission.create({ data: { roleId: role.id, permissionId } });
        }
      }

      await tx.setting.create({
        data: {
          tenantId: tenant.id,
          key: 'gis.map_center',
          value: { lat: -3.668, lng: 119.974, zoom: 13 },
        },
      });

      let adminUser: { id: string; email: string } | null = null;
      if (parsed.adminEmail && adminPassword && adminRoleId) {
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        adminUser = await tx.user.create({
          data: {
            email: parsed.adminEmail,
            name: parsed.adminName ?? `Admin ${parsed.name}`,
            passwordHash,
            tenantId: tenant.id,
            status: 'active',
          },
          select: { id: true, email: true },
        });
        await tx.userRole.create({
          data: { userId: adminUser.id, roleId: adminRoleId },
        });
      }

      return { tenant, adminUser };
    });

    await this.auditLogs.log({
      tenantId: parent.id,
      actorId: user.sub,
      action: 'provision_village',
      module: 'tenants',
      entityType: 'tenant',
      entityId: result.tenant.id,
      metadata: {
        name: parsed.name,
        code: parsed.code,
        parentId: parsed.parentId,
        adminEmail: parsed.adminEmail ?? null,
      },
      ipAddress,
    });

    return successResponse(
      {
        tenant: result.tenant,
        adminUser: result.adminUser,
        adminCreated: Boolean(result.adminUser),
      },
      result.adminUser
        ? 'Tenant desa, profil, role, dan admin berhasil diprovisikan'
        : 'Tenant desa, profil, dan role berhasil diprovisikan',
    );
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
    const parsed = parseWithZod(createTenantSchema, body);

    const existing = await this.prisma.tenant.findUnique({ where: { code: parsed.code } });
    if (existing) throw new ConflictException('Kode tenant sudah digunakan');

    const tenant = await this.prisma.tenant.create({
      data: {
        name: parsed.name,
        code: parsed.code,
        status: parsed.status ?? 'active',
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
    const parsed = parseWithZod(updateTenantSchema, body);

    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant tidak ditemukan');

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: parsed,
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
