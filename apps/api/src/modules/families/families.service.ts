import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { sendXlsxDownload } from '../../common/utils/spreadsheet.util';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { AddressResolutionService } from '../../core/addressing/address-resolution.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import type { ResidentAddressInput } from '@sidpro/validators';
import { addFamilyMemberSchema, createFamilySchema, updateFamilySchema } from '@sidpro/validators';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { paginatedResponse, successResponse, maskKk } from '../../common/utils/response.util';

@Injectable()
export class FamiliesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private addressResolution: AddressResolutionService,
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
      ...(search ? { kkNumber: { contains: search } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.family.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          address: true,
          familyMembers: {
            include: { resident: { select: { id: true, fullName: true, nik: true } } },
          },
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
      address?: ResidentAddressInput;
      economicStatus?: string;
      houseStatus?: string;
      waterSource?: string;
      electricity?: string;
      sanitation?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    const parsed = parseWithZod(createFamilySchema, body);

    const existing = await this.prisma.family.findUnique({
      where: { tenantId_kkNumber: { tenantId, kkNumber: parsed.kkNumber } },
    });
    if (existing) throw new ConflictException('Nomor KK sudah terdaftar');

    if (parsed.headResidentId) {
      const headResident = await this.prisma.resident.findFirst({
        where: { id: parsed.headResidentId, tenantId, deletedAt: null },
      });
      if (!headResident) throw new NotFoundException('Kepala keluarga tidak ditemukan');
    }

    let addressId = parsed.addressId;
    if (parsed.address) {
      addressId = await this.addressResolution.resolveAddress(tenantId, parsed.address);
    }

    const family = await this.prisma.family.create({
      data: {
        tenantId,
        kkNumber: parsed.kkNumber,
        headResidentId: parsed.headResidentId,
        economicStatus: parsed.economicStatus,
        houseStatus: parsed.houseStatus,
        waterSource: parsed.waterSource,
        electricity: parsed.electricity,
        sanitation: parsed.sanitation,
        addressId,
      },
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
    body: {
      headResidentId?: string;
      addressId?: string;
      address?: ResidentAddressInput;
      economicStatus?: string;
      houseStatus?: string;
      waterSource?: string;
      electricity?: string;
      sanitation?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.family.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Keluarga tidak ditemukan');

    const parsed = parseWithZod(updateFamilySchema, body);

    if (parsed.headResidentId) {
      const headResident = await this.prisma.resident.findFirst({
        where: { id: parsed.headResidentId, tenantId, deletedAt: null },
      });
      if (!headResident) throw new NotFoundException('Kepala keluarga tidak ditemukan');
    }

    let addressId = parsed.addressId;
    if (parsed.address) {
      addressId = await this.addressResolution.resolveAddress(tenantId, parsed.address);
    }

    const family = await this.prisma.family.update({
      where: { id },
      data: {
        headResidentId: parsed.headResidentId,
        economicStatus: parsed.economicStatus,
        houseStatus: parsed.houseStatus,
        waterSource: parsed.waterSource,
        electricity: parsed.electricity,
        sanitation: parsed.sanitation,
        ...(addressId !== undefined ? { addressId } : {}),
      },
    });

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

    await this.prisma.$transaction(async (tx) => {
      await tx.familyMember.deleteMany({ where: { familyId: id, tenantId } });
      await tx.resident.updateMany({
        where: { familyId: id, tenantId },
        data: { familyId: null },
      });
      await tx.family.update({
        where: { id },
        data: { deletedAt: new Date(), headResidentId: null },
      });
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
    const parsed = parseWithZod(addFamilyMemberSchema, body);

    const family = await this.prisma.family.findFirst({
      where: { id: familyId, tenantId, deletedAt: null },
    });
    if (!family) throw new NotFoundException('Keluarga tidak ditemukan');

    const existingMember = await this.prisma.familyMember.findUnique({
      where: { familyId_residentId: { familyId, residentId: parsed.residentId } },
    });
    if (existingMember) {
      throw new ConflictException('Penduduk sudah terdaftar sebagai anggota KK ini');
    }

    const resident = await this.prisma.resident.findFirst({
      where: { id: parsed.residentId, tenantId, deletedAt: null },
    });
    if (!resident) throw new NotFoundException('Penduduk tidak ditemukan');

    if (parsed.isHead) {
      const currentHead = await this.prisma.familyMember.findFirst({
        where: { familyId, isHead: true, residentId: { not: parsed.residentId } },
      });
      if (currentHead) {
        throw new ConflictException(
          'Keluarga sudah memiliki kepala keluarga. Lepas status kepala terlebih dahulu.',
        );
      }
    }

    const member = await this.prisma.$transaction(async (tx) => {
      if (parsed.isHead) {
        await tx.familyMember.updateMany({
          where: { familyId, isHead: true },
          data: { isHead: false },
        });
        await tx.family.update({
          where: { id: familyId },
          data: { headResidentId: parsed.residentId },
        });
      }

      const created = await tx.familyMember.create({
        data: {
          tenantId,
          familyId,
          residentId: parsed.residentId,
          relationship: parsed.relationship,
          isHead: parsed.isHead,
        },
        include: { resident: { select: { id: true, fullName: true } } },
      });

      await tx.resident.update({
        where: { id: parsed.residentId },
        data: { familyId },
      });

      return created;
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

    await this.prisma.$transaction(async (tx) => {
      await tx.familyMember.delete({ where: { id: memberId } });
      await tx.resident.updateMany({
        where: { id: member.residentId, familyId },
        data: { familyId: null },
      });
      if (member.isHead) {
        await tx.family.update({
          where: { id: familyId },
          data: { headResidentId: null },
        });
      }
    });

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

  async exportFamilies(user: JwtPayload, ipAddress: string | undefined, res: Response) {
    const tenantId = this.requireTenant(user);
    const viewSensitive = user.permissions.includes('families.view_sensitive');

    const families = await this.prisma.family.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { kkNumber: 'asc' },
      include: {
        address: true,
        familyMembers: {
          include: { resident: { select: { fullName: true } } },
        },
      },
    });

    const rows = families.map((f) => {
      const head = f.familyMembers.find((m) => m.isHead)?.resident?.fullName ?? '';
      return {
        kkNumber: viewSensitive ? f.kkNumber : maskKk(f.kkNumber),
        headName: head,
        memberCount: f.familyMembers.length,
        economicStatus: f.economicStatus ?? '',
        houseStatus: f.houseStatus ?? '',
        address: [
          f.address?.street,
          f.address?.rt ? `RT ${f.address.rt}` : null,
          f.address?.rw ? `RW ${f.address.rw}` : null,
        ]
          .filter(Boolean)
          .join(', '),
      };
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'export',
      module: 'families',
      entityType: 'family',
      metadata: { count: families.length },
      ipAddress,
    });

    await sendXlsxDownload(res, [{ name: 'Keluarga', rows }], 'keluarga-export.xlsx');
  }
}
