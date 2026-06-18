import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  assignRolePermissionsSchema,
  createRoleSchema,
  updateRoleSchema,
} from '@sidpro/validators';
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
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    assertSuperadminRoleMutation(user, parsed.data.code);

    const existing = await this.prisma.role.findFirst({
      where: { code: parsed.data.code, ...this.tenantWhere(user) },
    });
    if (existing) throw new ConflictException('Kode role sudah digunakan');

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: parsed.data.name,
          code: parsed.data.code,
          scope: parsed.data.scope ?? 'tenant',
          tenantId: user.tenantId,
        },
      });
      if (parsed.data.permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: parsed.data.permissionIds.map((permissionId) => ({
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
      metadata: { code: role.code, permissionIds: parsed.data.permissionIds ?? [] },
      ipAddress,
    });

    return successResponse(role, 'Role berhasil dibuat — tercatat di audit log');
  }

  async update(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existing = await this.prisma.role.findFirst({
      where: { id, ...this.tenantWhere(user) },
    });
    if (!existing) throw new NotFoundException('Role tidak ditemukan');

    assertSuperadminRoleMutation(user, existing.code);

    const role = await this.prisma.role.update({
      where: { id },
      data: { ...(parsed.data.name ? { name: parsed.data.name } : {}) },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'roles',
      entityType: 'role',
      entityId: id,
      metadata: { name: parsed.data.name },
      ipAddress,
    });

    return successResponse(role, 'Role berhasil diperbarui — tercatat di audit log');
  }

  async assignPermissions(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = assignRolePermissionsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const existing = await this.prisma.role.findFirst({
      where: { id, ...this.tenantWhere(user) },
    });
    if (!existing) throw new NotFoundException('Role tidak ditemukan');

    assertSuperadminRoleMutation(user, existing.code);

    const role = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (parsed.data.permissionIds.length) {
        await tx.rolePermission.createMany({
          data: parsed.data.permissionIds.map((permissionId) => ({
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
        permissionCount: parsed.data.permissionIds.length,
      },
      ipAddress,
    });

    return successResponse(role, 'Permission role diperbarui — tercatat di audit log');
  }
}
