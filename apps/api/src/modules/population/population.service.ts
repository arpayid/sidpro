import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import {
  sendXlsxDownload,
  xlsxBufferToJson,
} from '../../common/utils/spreadsheet.util';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  paginatedResponse,
  successResponse,
  maskNik,
} from '../../common/utils/response.util';

interface ResidentImportRow {
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
}

export interface RowValidationError {
  row: number;
  errors: string[];
}

export interface ResidentAddressInput {
  hamletId?: string;
  neighborhoodUnitId?: string;
  street?: string;
}

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

  async resolveAddress(
    tenantId: string,
    input: ResidentAddressInput,
  ): Promise<string> {
    const { hamletId, neighborhoodUnitId, street } = input;

    if (neighborhoodUnitId) {
      const unit = await this.prisma.neighborhoodUnit.findFirst({
        where: { id: neighborhoodUnitId, tenantId },
      });
      if (!unit) throw new NotFoundException('RT/RW tidak ditemukan');

      if (hamletId && hamletId !== unit.hamletId) {
        throw new ConflictException('RT/RW tidak sesuai dengan dusun yang dipilih');
      }

      const address = await this.prisma.address.create({
        data: {
          tenantId,
          hamletId: hamletId ?? unit.hamletId,
          neighborhoodUnitId: unit.id,
          rt: unit.rt,
          rw: unit.rw,
          street,
        },
      });
      return address.id;
    }

    if (hamletId) {
      const hamlet = await this.prisma.hamlet.findFirst({
        where: { id: hamletId, tenantId },
      });
      if (!hamlet) throw new NotFoundException('Dusun tidak ditemukan');

      const address = await this.prisma.address.create({
        data: { tenantId, hamletId, street },
      });
      return address.id;
    }

    const address = await this.prisma.address.create({
      data: { tenantId, street },
    });
    return address.id;
  }

  private async resolveResidentAddressId(
    tenantId: string,
    body: { addressId?: string; address?: ResidentAddressInput },
  ): Promise<string | undefined> {
    if (body.address) {
      return this.resolveAddress(tenantId, body.address);
    }
    if (body.addressId) {
      const existing = await this.prisma.address.findFirst({
        where: { id: body.addressId, tenantId },
      });
      if (!existing) throw new NotFoundException('Alamat tidak ditemukan');
      return body.addressId;
    }
    return undefined;
  }

  async findAll(
    user: JwtPayload,
    page = 1,
    limit = 20,
    search?: string,
    residentStatus?: string,
    viewSensitive = false,
  ) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      deletedAt: null,
      ...(residentStatus ? { residentStatus } : {}),
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
      address?: ResidentAddressInput;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    const existing = await this.prisma.resident.findUnique({
      where: { tenantId_nik: { tenantId, nik: body.nik } },
    });
    if (existing) throw new ConflictException('NIK sudah terdaftar');

    const addressId = await this.resolveResidentAddressId(tenantId, body);

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
        addressId,
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
    body: Record<string, unknown> & {
      addressId?: string;
      address?: ResidentAddressInput;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.resident.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Penduduk tidak ditemukan');

    const { address, addressId: inputAddressId, ...rest } = body;
    const data: Prisma.ResidentUpdateInput = { ...rest };

    if (typeof rest.birthDate === 'string') {
      data.birthDate = new Date(rest.birthDate);
    }

    const addressId = await this.resolveResidentAddressId(tenantId, {
      addressId: inputAddressId,
      address,
    });
    if (addressId !== undefined) {
      data.address = { connect: { id: addressId } };
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

  async recordMutation(
    user: JwtPayload,
    id: string,
    body: { residentStatus: 'moved' | 'deceased'; eventDate: string; notes?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.resident.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Penduduk tidak ditemukan');

    if (!['moved', 'deceased'].includes(body.residentStatus)) {
      throw new BadRequestException('Mutasi hanya untuk status pindah atau meninggal');
    }

    const resident = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.resident.update({
        where: { id },
        data: { residentStatus: body.residentStatus },
      });

      await tx.civilEvent.create({
        data: {
          tenantId,
          residentId: id,
          eventType: body.residentStatus,
          eventDate: new Date(body.eventDate),
          notes: body.notes,
        },
      });

      return updated;
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'mutate',
      module: 'population',
      entityType: 'resident',
      entityId: id,
      metadata: { residentStatus: body.residentStatus, eventDate: body.eventDate },
      ipAddress,
    });

    return successResponse(resident, 'Mutasi penduduk berhasil dicatat');
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

  async exportResidents(user: JwtPayload, ipAddress: string | undefined, res: Response) {
    const tenantId = this.requireTenant(user);

    const residents = await this.prisma.resident.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { fullName: 'asc' },
    });

    const rows = residents.map((r) => ({
      nik: r.nik,
      fullName: r.fullName,
      gender: r.gender,
      birthPlace: r.birthPlace,
      birthDate: r.birthDate.toISOString().split('T')[0],
      religion: r.religion ?? '',
      education: r.education ?? '',
      occupation: r.occupation ?? '',
      maritalStatus: r.maritalStatus ?? '',
      bloodType: r.bloodType ?? '',
      disabilityStatus: r.disabilityStatus ?? '',
      residentStatus: r.residentStatus,
    }));

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'export',
      module: 'population',
      entityType: 'resident',
      metadata: { count: residents.length },
      ipAddress,
    });

    await sendXlsxDownload(res, [{ name: 'Penduduk', rows }], 'residents-export.xlsx');
  }

  private validateImportRow(row: Record<string, unknown>, rowNumber: number): RowValidationError | null {
    const errors: string[] = [];
    const nik = String(row.nik ?? '').trim();
    const fullName = String(row.fullName ?? '').trim();
    const gender = String(row.gender ?? '').trim();
    const birthPlace = String(row.birthPlace ?? '').trim();
    const birthDate = String(row.birthDate ?? '').trim();

    if (!nik) errors.push('NIK wajib diisi');
    else if (!/^\d{16}$/.test(nik)) errors.push('NIK harus 16 digit angka');

    if (!fullName) errors.push('Nama lengkap wajib diisi');
    if (!gender) errors.push('Jenis kelamin wajib diisi');
    if (!birthPlace) errors.push('Tempat lahir wajib diisi');
    if (!birthDate) errors.push('Tanggal lahir wajib diisi');
    else if (Number.isNaN(Date.parse(birthDate))) errors.push('Format tanggal lahir tidak valid');

    if (errors.length === 0) return null;
    return { row: rowNumber, errors };
  }

  private async parseImportRows(buffer: Buffer): Promise<Record<string, unknown>[]> {
    return xlsxBufferToJson(buffer);
  }

  async importResidents(
    user: JwtPayload,
    buffer: Buffer,
    preview: boolean,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const rawRows = await this.parseImportRows(buffer);

    if (rawRows.length === 0) {
      return successResponse({ totalRows: 0, validRows: 0, errors: [], imported: 0 }, 'Tidak ada data');
    }

    const validationErrors: RowValidationError[] = [];
    const validRows: { rowNumber: number; data: ResidentImportRow }[] = [];

    rawRows.forEach((row, index) => {
      const rowNumber = index + 2;
      const error = this.validateImportRow(row, rowNumber);
      if (error) {
        validationErrors.push(error);
        return;
      }

      validRows.push({
        rowNumber,
        data: {
          nik: String(row.nik).trim(),
          fullName: String(row.fullName).trim(),
          gender: String(row.gender).trim(),
          birthPlace: String(row.birthPlace).trim(),
          birthDate: String(row.birthDate).trim(),
          religion: String(row.religion ?? '').trim() || undefined,
          education: String(row.education ?? '').trim() || undefined,
          occupation: String(row.occupation ?? '').trim() || undefined,
          maritalStatus: String(row.maritalStatus ?? '').trim() || undefined,
          bloodType: String(row.bloodType ?? '').trim() || undefined,
          disabilityStatus: String(row.disabilityStatus ?? '').trim() || undefined,
          residentStatus: String(row.residentStatus ?? 'permanent').trim() || 'permanent',
        },
      });
    });

    if (preview) {
      return successResponse({
        totalRows: rawRows.length,
        validRows: validRows.length,
        errors: validationErrors,
        imported: 0,
      });
    }

    let imported = 0;
    const importErrors: RowValidationError[] = [...validationErrors];

    for (const { rowNumber, data } of validRows) {
      const existing = await this.prisma.resident.findUnique({
        where: { tenantId_nik: { tenantId, nik: data.nik } },
      });

      if (existing && existing.deletedAt === null) {
        importErrors.push({ row: rowNumber, errors: ['NIK sudah terdaftar'] });
        continue;
      }

      if (existing?.deletedAt) {
        await this.prisma.resident.update({
          where: { id: existing.id },
          data: {
            ...data,
            birthDate: new Date(data.birthDate),
            deletedAt: null,
          },
        });
      } else {
        await this.prisma.resident.create({
          data: {
            tenantId,
            ...data,
            birthDate: new Date(data.birthDate),
          },
        });
      }
      imported++;
    }

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'import',
      module: 'population',
      entityType: 'resident',
      metadata: {
        totalRows: rawRows.length,
        imported,
        errors: importErrors.length,
      },
      ipAddress,
    });

    return successResponse({
      totalRows: rawRows.length,
      validRows: validRows.length,
      errors: importErrors,
      imported,
    }, `Import selesai: ${imported} penduduk berhasil diimpor`);
  }
}
