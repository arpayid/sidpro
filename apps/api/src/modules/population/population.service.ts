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
  maskNik,
} from '../../common/utils/response.util';

@Injectable()
export class PopulationService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  private maskResident<T extends { nik: string }>(resident: T, viewSensitive: boolean) {
    if (viewSensitive) return resident;
    return { ...resident, nik: maskNik(resident.nik) };
  }

  async findAll(
    user: JwtPayload,
    page = 1,
    limit = 20,
    search?: string,
    viewSensitive = false,
  ) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' as const } },
              { nik: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.resident.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fullName: 'asc' },
        include: { address: true, family: { select: { id: true, kkNumber: true } } },
      }),
      this.prisma.resident.count({ where }),
    ]);

    const data = rows.map((r) => this.maskResident(r, viewSensitive));
    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string, viewSensitive = false) {
    const tenantId = this.requireTenant(user);
    const resident = await this.prisma.resident.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { address: true, family: true, familyMembers: true },
    });
    if (!resident) throw new NotFoundException('Penduduk tidak ditemukan');
    return successResponse(this.maskResident(resident, viewSensitive));
  }

  async create(
    user: JwtPayload,
    body: {
      nik: string;
      fullName: string;
      gender: string;
      birthPlace: string;
      birthDate: string;
      religion?: string;
      education?: string;
      occupation?: string;
      maritalStatus?: string;
      bloodType?: string;
      disabilityStatus?: string;
      residentStatus?: string;
      familyId?: string;
      addressId?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    const existing = await this.prisma.resident.findUnique({
      where: { tenantId_nik: { tenantId, nik: body.nik } },
    });
    if (existing) throw new ConflictException('NIK sudah terdaftar');

    const resident = await this.prisma.resident.create({
      data: {
        tenantId,
        nik: body.nik,
        fullName: body.fullName,
        gender: body.gender,
        birthPlace: body.birthPlace,
        birthDate: new Date(body.birthDate),
        religion: body.religion,
        education: body.education,
        occupation: body.occupation,
        maritalStatus: body.maritalStatus,
        bloodType: body.bloodType,
        disabilityStatus: body.disabilityStatus,
        residentStatus: body.residentStatus ?? 'permanent',
        familyId: body.familyId,
        addressId: body.addressId,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'population',
      entityType: 'resident',
      entityId: resident.id,
      ipAddress,
    });

    return successResponse(resident, 'Penduduk berhasil ditambahkan');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: Record<string, unknown>,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.resident.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Penduduk tidak ditemukan');

    const data = { ...body };
    if (typeof data.birthDate === 'string') {
      data.birthDate = new Date(data.birthDate);
    }

    const resident = await this.prisma.resident.update({
      where: { id },
      data,
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'population',
      entityType: 'resident',
      entityId: id,
      ipAddress,
    });

    return successResponse(resident, 'Penduduk berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.resident.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Penduduk tidak ditemukan');

    await this.prisma.resident.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'population',
      entityType: 'resident',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'Penduduk berhasil dihapus');
  }
}
