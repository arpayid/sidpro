import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  assignUserRolesSchema,
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
} from '@sidpro/validators';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import {
  assertSuperadminRoleAccess,
  VILLAGE_ADMIN_ROLE_CODE,
  SUPERADMIN_ROLE_CODE,
} from '../../common/utils/rbac-security.util';

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  status: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  userRoles: { include: { role: { select: { id: true, name: true, code: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private tenantWhere(user: JwtPayload) {
    if (!user.tenantId) return {};
    return { tenantId: user.tenantId };
  }

  private async getRoleCodes(roleIds: string[]) {
    if (!roleIds.length) return [];
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { code: true },
    });
    return roles.map((r) => r.code);
  }

  private async assertRemainingAdmin(tenantId: string | null, targetUserId: string) {
    const remaining = await this.prisma.user.count({
      where: {
        tenantId,
        status: 'active',
        deletedAt: null,
        NOT: { id: targetUserId },
        userRoles: {
          some: {
            role: { code: { in: [VILLAGE_ADMIN_ROLE_CODE, SUPERADMIN_ROLE_CODE] } },
          },
        },
      },
    });
    if (remaining < 1) {
      throw new ForbiddenException('Tidak dapat menonaktifkan admin terakhir di tenant ini');
    }
  }

  private async assertTargetIsAdmin(userId: string) {
    const admin = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { code: { in: [VILLAGE_ADMIN_ROLE_CODE, SUPERADMIN_ROLE_CODE] } },
      },
    });
    return Boolean(admin);
  }

  private async assertRolesInTenant(user: JwtPayload, roleIds: string[]) {
    if (!roleIds.length) return;
    const count = await this.prisma.role.count({
      where: {
        id: { in: roleIds },
        ...this.tenantWhere(user),
      },
    });
    if (count !== roleIds.length) {
      throw new ForbiddenException('Role tidak valid untuk tenant ini');
    }
  }

  async findAll(
    user: JwtPayload,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    roleId?: string,
  ) {
    const where = {
      ...this.tenantWhere(user),
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(roleId ? { userRoles: { some: { roleId } } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const record = await this.prisma.user.findFirst({
      where: { id, ...this.tenantWhere(user), deletedAt: null },
      select: userSelect,
    });
    if (!record) throw new NotFoundException('User tidak ditemukan');
    return successResponse(record);
  }

  async create(user: JwtPayload, body: unknown, ipAddress?: string) {
    const parsed = parseWithZod(createUserSchema, body);

    if (!user.tenantId && !user.roles.includes(SUPERADMIN_ROLE_CODE)) {
      throw new ForbiddenException('Tenant scope required');
    }

    if (parsed.roleIds?.length) {
      const roleCodes = await this.getRoleCodes(parsed.roleIds);
      assertSuperadminRoleAccess(user, roleCodes);
      await this.assertRolesInTenant(user, parsed.roleIds);
    }

    const existing = await this.prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const created = await this.prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        phone: parsed.phone,
        passwordHash,
        tenantId: user.tenantId,
        ...(parsed.roleIds?.length
          ? { userRoles: { create: parsed.roleIds.map((roleId) => ({ roleId })) } }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        tenantId: true,
        createdAt: true,
      },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'users',
      entityType: 'user',
      entityId: created.id,
      metadata: { email: created.email, roleIds: parsed.roleIds ?? [] },
      ipAddress,
    });

    return successResponse(created, 'User berhasil dibuat — tercatat di audit log');
  }

  async update(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = parseWithZod(updateUserSchema, body);

    const existing = await this.prisma.user.findFirst({
      where: { id, ...this.tenantWhere(user), deletedAt: null },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    const data: Record<string, unknown> = {};
    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.phone !== undefined) data.phone = parsed.phone;
    if (parsed.password) data.passwordHash = await bcrypt.hash(parsed.password, 12);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        tenantId: true,
        updatedAt: true,
      },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'users',
      entityType: 'user',
      entityId: id,
      metadata: {
        fields: Object.keys(parsed).filter((k) => k !== 'password'),
        passwordReset: Boolean(parsed.password),
      },
      ipAddress,
    });

    return successResponse(updated, 'User berhasil diperbarui — tercatat di audit log');
  }

  async updateStatus(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = parseWithZod(updateUserStatusSchema, body);

    if (parsed.status !== 'active' && !user.permissions.includes('users.disable')) {
      throw new ForbiddenException('Missing permission: users.disable');
    }
    if (parsed.status === 'active' && !user.permissions.includes('users.update')) {
      throw new ForbiddenException('Missing permission: users.update');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id, ...this.tenantWhere(user), deletedAt: null },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    if (id === user.sub && parsed.status !== 'active') {
      throw new ForbiddenException('Tidak dapat menonaktifkan akun sendiri');
    }

    if (parsed.status !== 'active' && (await this.assertTargetIsAdmin(id))) {
      await this.assertRemainingAdmin(existing.tenantId, id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: parsed.status },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        updatedAt: true,
      },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: parsed.status === 'active' ? 'enable' : 'disable',
      module: 'users',
      entityType: 'user',
      entityId: id,
      metadata: { status: parsed.status },
      ipAddress,
    });

    return successResponse(updated, 'Status user diperbarui — tercatat di audit log');
  }

  async assignRoles(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = parseWithZod(assignUserRolesSchema, body);

    const existing = await this.prisma.user.findFirst({
      where: { id, ...this.tenantWhere(user), deletedAt: null },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    const roleCodes = await this.getRoleCodes(parsed.roleIds);
    assertSuperadminRoleAccess(user, roleCodes);
    await this.assertRolesInTenant(user, parsed.roleIds);

    if (id === user.sub) {
      const currentlyAdmin = await this.prisma.userRole.findFirst({
        where: {
          userId: id,
          role: { code: { in: [VILLAGE_ADMIN_ROLE_CODE, SUPERADMIN_ROLE_CODE] } },
        },
      });
      const willBeAdmin = roleCodes.some((c) =>
        [VILLAGE_ADMIN_ROLE_CODE, SUPERADMIN_ROLE_CODE].includes(c),
      );
      if (currentlyAdmin && !willBeAdmin) {
        await this.assertRemainingAdmin(existing.tenantId, id);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (parsed.roleIds.length) {
        await tx.userRole.createMany({
          data: parsed.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
      return tx.user.findUnique({
        where: { id },
        select: userSelect,
      });
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'assign_role',
      module: 'users',
      entityType: 'user',
      entityId: id,
      metadata: { roleIds: parsed.roleIds, roleCodes },
      ipAddress,
    });

    return successResponse(updated, 'Role user diperbarui — tercatat di audit log');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id, ...this.tenantWhere(user), deletedAt: null },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    if (id === user.sub) {
      throw new ForbiddenException('Tidak dapat menghapus akun sendiri');
    }

    if (await this.assertTargetIsAdmin(id)) {
      await this.assertRemainingAdmin(existing.tenantId, id);
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'inactive' },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'users',
      entityType: 'user',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'User berhasil dihapus — tercatat di audit log');
  }
}
