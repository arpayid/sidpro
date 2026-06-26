import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  assignRolePermissionsSchema,
  createRoleSchema,
  updateRoleSchema,
} from '@sidpro/validators';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import { assertSuperadminRoleMutation } from '../../common/utils/rbac-security.util';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private tenantWhere(user: JwtPayload) {
    if (!user.tenantId) return {};
    return { tenantId: user.tenantId };
  }

  async findAll(user: JwtPayload, page = 1, limit = 50) {
    const where = this.tenantWhere(user);
    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          rolePermissions: { include: { permission: true } },
          _count: { select: { userRoles: true } },
        },
      }),
      this.prisma.role.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, ...this.tenantWhere(user) },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan');
    return successResponse(role);
  }

  async create(user: JwtPayload, body: unknown, ipAddress?: string) {
    const parsed = parseWithZod(createRoleSchema, body);

    assertSuperadminRoleMutation(user, parsed.code);

    const existing = await this.prisma.role.findFirst({
      where: { code: parsed.code, ...this.tenantWhere(user) },
    });
    if (existing) throw new ConflictException('Kode role sudah digunakan');

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: parsed.name,
          code: parsed.code,
          scope: parsed.scope ?? 'tenant',
          tenantId: user.tenantId,
        },
      });
      if (parsed.permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: parsed.permissionIds.map((permissionId) => ({
            roleId: created.id,
            permissionId,
          })),
        });
      }
      return created;
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'roles',
      entityType: 'role',
      entityId: role.id,
      metadata: { code: role.code, permissionIds: parsed.permissionIds ?? [] },
      ipAddress,
    });

    return successResponse(role, 'Role berhasil dibuat — tercatat di audit log');
  }

  async update(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = parseWithZod(updateRoleSchema, body);

    const existing = await this.prisma.role.findFirst({
      where: { id, ...this.tenantWhere(user) },
    });
    if (!existing) throw new NotFoundException('Role tidak ditemukan');

    assertSuperadminRoleMutation(user, existing.code);

    const role = await this.prisma.role.update({
      where: { id },
      data: { ...(parsed.name ? { name: parsed.name } : {}) },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'roles',
      entityType: 'role',
      entityId: id,
      metadata: { name: parsed.name },
      ipAddress,
    });

    return successResponse(role, 'Role berhasil diperbarui — tercatat di audit log');
  }

  async assignPermissions(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = parseWithZod(assignRolePermissionsSchema, body);

    const existing = await this.prisma.role.findFirst({
      where: { id, ...this.tenantWhere(user) },
    });
    if (!existing) throw new NotFoundException('Role tidak ditemukan');

    assertSuperadminRoleMutation(user, existing.code);

    const role = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (parsed.permissionIds.length) {
        await tx.rolePermission.createMany({
          data: parsed.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
      return tx.role.findUnique({
        where: { id },
        include: {
          rolePermissions: { include: { permission: true } },
          _count: { select: { userRoles: true } },
        },
      });
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'assign_permissions',
      module: 'roles',
      entityType: 'role',
      entityId: id,
      metadata: {
        code: existing.code,
        permissionCount: parsed.permissionIds.length,
      },
      ipAddress,
    });

    return successResponse(role, 'Permission role diperbarui — tercatat di audit log');
  }
}
