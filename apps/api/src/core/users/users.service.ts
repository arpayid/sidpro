import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

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

  async findAll(user: JwtPayload, page = 1, limit = 20, search?: string) {
    const where = {
      ...this.tenantWhere(user),
      deletedAt: null,
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
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          status: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
          userRoles: { include: { role: { select: { id: true, name: true, code: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const record = await this.prisma.user.findFirst({
      where: { id, ...this.tenantWhere(user), deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        userRoles: { include: { role: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!record) throw new NotFoundException('User tidak ditemukan');
    return successResponse(record);
  }

  async create(
    user: JwtPayload,
    body: {
      email: string;
      name: string;
      password: string;
      phone?: string;
      roleIds?: string[];
    },
    ipAddress?: string,
  ) {
    if (!user.tenantId && !user.roles.includes('superadmin_system')) {
      throw new ForbiddenException('Tenant scope required');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ConflictException('Email sudah terdaftar');

    const passwordHash = await bcrypt.hash(body.password, 12);
    const created = await this.prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        phone: body.phone,
        passwordHash,
        tenantId: user.tenantId,
        ...(body.roleIds?.length
          ? { userRoles: { create: body.roleIds.map((roleId) => ({ roleId })) } }
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
      ipAddress,
    });

    return successResponse(created, 'User berhasil dibuat');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: {
      name?: string;
      phone?: string;
      status?: string;
      password?: string;
      roleIds?: string[];
    },
    ipAddress?: string,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { id, ...this.tenantWhere(user), deletedAt: null },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.status !== undefined) data.status = body.status;
    if (body.password) data.passwordHash = await bcrypt.hash(body.password, 12);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        if (body.roleIds.length) {
          await tx.userRole.createMany({
            data: body.roleIds.map((roleId) => ({ userId: id, roleId })),
          });
        }
      }
      return tx.user.update({
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
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'users',
      entityType: 'user',
      entityId: id,
      ipAddress,
    });

    return successResponse(updated, 'User berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { id, ...this.tenantWhere(user), deletedAt: null },
    });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

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

    return successResponse(null, 'User berhasil dihapus');
  }
}
