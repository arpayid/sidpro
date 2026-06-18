import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  paginatedResponse,
  successResponse,
  maskKk,
} from '../../common/utils/response.util';

@Injectable()
export class FamiliesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAll(user: JwtPayload, page = 1, limit = 20, search?: string) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      deletedAt: null,
      ...(search
        ? { kkNumber: { contains: search } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.family.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          address: true,
          familyMembers: { include: { resident: { select: { id: true, fullName: true, nik: true } } } },
        },
      }),
      this.prisma.family.count({ where }),
    ]);

    const viewSensitive = user.permissions.includes('families.view_sensitive');
    const data = rows.map((f) => ({
      ...f,
      kkNumber: viewSensitive ? f.kkNumber : maskKk(f.kkNumber),
    }));

    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const family = await this.prisma.family.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        address: true,
        familyMembers: { include: { resident: true } },
        residents: true,
      },
    });
    if (!family) throw new NotFoundException('Keluarga tidak ditemukan');

    const viewSensitive = user.permissions.includes('families.view_sensitive');
    return successResponse({
      ...family,
      kkNumber: viewSensitive ? family.kkNumber : maskKk(family.kkNumber),
    });
  }

  async create(
    user: JwtPayload,
    body: {
      kkNumber: string;
      headResidentId?: string;
      addressId?: string;
      economicStatus?: string;
      houseStatus?: string;
      waterSource?: string;
      electricity?: string;
      sanitation?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    const existing = await this.prisma.family.findUnique({
      where: { tenantId_kkNumber: { tenantId, kkNumber: body.kkNumber } },
    });
    if (existing) throw new ConflictException('Nomor KK sudah terdaftar');

    const family = await this.prisma.family.create({
      data: { tenantId, ...body },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'families',
      entityType: 'family',
      entityId: family.id,
      ipAddress,
    });

    return successResponse(family, 'Keluarga berhasil ditambahkan');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: Record<string, unknown>,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.family.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Keluarga tidak ditemukan');

    const family = await this.prisma.family.update({ where: { id }, data: body });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'families',
      entityType: 'family',
      entityId: id,
      ipAddress,
    });

    return successResponse(family, 'Keluarga berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.family.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Keluarga tidak ditemukan');

    await this.prisma.family.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'families',
      entityType: 'family',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'Keluarga berhasil dihapus');
  }

  async addMember(
    user: JwtPayload,
    familyId: string,
    body: { residentId: string; relationship: string; isHead?: boolean },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, tenantId, deletedAt: null },
    });
    if (!family) throw new NotFoundException('Keluarga tidak ditemukan');

    const member = await this.prisma.familyMember.create({
      data: {
        tenantId,
        familyId,
        residentId: body.residentId,
        relationship: body.relationship,
        isHead: body.isHead ?? false,
      },
      include: { resident: { select: { id: true, fullName: true } } },
    });

    await this.prisma.resident.update({
      where: { id: body.residentId },
      data: { familyId },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'add_member',
      module: 'families',
      entityType: 'family_member',
      entityId: member.id,
      metadata: { familyId },
      ipAddress,
    });

    return successResponse(member, 'Anggota keluarga berhasil ditambahkan');
  }

  async removeMember(user: JwtPayload, familyId: string, memberId: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId, tenantId },
    });
    if (!member) throw new NotFoundException('Anggota keluarga tidak ditemukan');

    await this.prisma.$transaction([
      this.prisma.familyMember.delete({ where: { id: memberId } }),
      this.prisma.resident.updateMany({
        where: { id: member.residentId, familyId },
        data: { familyId: null },
      }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'remove_member',
      module: 'families',
      entityType: 'family_member',
      entityId: memberId,
      metadata: { familyId },
      ipAddress,
    });

    return successResponse(null, 'Anggota keluarga berhasil dihapus');
  }
}
