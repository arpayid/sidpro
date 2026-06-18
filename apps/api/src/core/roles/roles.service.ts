import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

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

  async findAll(user: JwtPayload, page = 1, limit = 20) {
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

  async create(
    user: JwtPayload,
    body: { name: string; code: string; scope?: string; permissionIds?: string[] },
    ipAddress?: string,
  ) {
    const existing = await this.prisma.role.findFirst({
      where: { code: body.code, ...this.tenantWhere(user) },
    });
    if (existing) throw new ConflictException('Kode role sudah digunakan');

    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          name: body.name,
          code: body.code,
          scope: body.scope ?? 'tenant',
          tenantId: user.tenantId,
        },
      });
      if (body.permissionIds?.length) {
        await tx.rolePermission.createMany({
          data: body.permissionIds.map((permissionId) => ({
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
      ipAddress,
    });

    return successResponse(role, 'Role berhasil dibuat');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: { name?: string; permissionIds?: string[] },
    ipAddress?: string,
  ) {
    const existing = await this.prisma.role.findFirst({
      where: { id, ...this.tenantWhere(user) },
    });
    if (!existing) throw new NotFoundException('Role tidak ditemukan');

    const role = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id },
        data: { ...(body.name ? { name: body.name } : {}) },
      });
      if (body.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (body.permissionIds.length) {
          await tx.rolePermission.createMany({
            data: body.permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }
      return updated;
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'roles',
      entityType: 'role',
      entityId: id,
      ipAddress,
    });

    return successResponse(role, 'Role berhasil diperbarui');
  }
}
