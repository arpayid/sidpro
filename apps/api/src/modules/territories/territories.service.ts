import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { createHamletSchema, createNeighborhoodUnitSchema, updateHamletSchema, updateNeighborhoodUnitSchema } from '@sidpro/validators';

@Injectable()
export class TerritoriesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAllHamlets(user: JwtPayload, page = 1, limit = 20, search?: string) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.hamlet.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { neighborhoodUnits: true } } },
      }),
      this.prisma.hamlet.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async createHamlet(
    user: JwtPayload,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createHamletSchema, body);

    const existing = await this.prisma.hamlet.findUnique({
      where: { tenantId_code: { tenantId, code: parsed.code } },
    });
    if (existing) throw new ConflictException('Kode dusun sudah terdaftar');

    const hamlet = await this.prisma.hamlet.create({
      data: { tenantId, name: parsed.name, code: parsed.code },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'territories',
      entityType: 'hamlet',
      entityId: hamlet.id,
      ipAddress,
    });

    return successResponse(hamlet, 'Dusun berhasil ditambahkan');
  }

  async updateHamlet(
    user: JwtPayload,
    id: string,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(updateHamletSchema, body);
    const existing = await this.prisma.hamlet.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Dusun tidak ditemukan');

    if (parsed.code && parsed.code !== existing.code) {
      const duplicate = await this.prisma.hamlet.findUnique({
        where: { tenantId_code: { tenantId, code: parsed.code } },
      });
      if (duplicate) throw new ConflictException('Kode dusun sudah terdaftar');
    }

    const hamlet = await this.prisma.hamlet.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name } : {}),
        ...(parsed.code !== undefined ? { code: parsed.code } : {}),
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'territories',
      entityType: 'hamlet',
      entityId: id,
      ipAddress,
    });

    return successResponse(hamlet, 'Dusun berhasil diperbarui');
  }

  async findNeighborhoodUnitsByHamlet(user: JwtPayload, hamletId: string) {
    const tenantId = this.requireTenant(user);
    const hamlet = await this.prisma.hamlet.findFirst({ where: { id: hamletId, tenantId } });
    if (!hamlet) throw new NotFoundException('Dusun tidak ditemukan');

    const data = await this.prisma.neighborhoodUnit.findMany({
      where: { tenantId, hamletId },
      orderBy: [{ rw: 'asc' }, { rt: 'asc' }],
    });

    return successResponse(data);
  }

  async createNeighborhoodUnit(
    user: JwtPayload,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createNeighborhoodUnitSchema, body);

    const hamlet = await this.prisma.hamlet.findFirst({
      where: { id: parsed.hamletId, tenantId },
    });
    if (!hamlet) throw new NotFoundException('Dusun tidak ditemukan');

    const existing = await this.prisma.neighborhoodUnit.findUnique({
      where: {
        tenantId_hamletId_rt_rw: {
          tenantId,
          hamletId: parsed.hamletId,
          rt: parsed.rt,
          rw: parsed.rw,
        },
      },
    });
    if (existing) throw new ConflictException('RT/RW sudah terdaftar pada dusun ini');

    const unit = await this.prisma.neighborhoodUnit.create({
      data: {
        tenantId,
        hamletId: parsed.hamletId,
        rt: parsed.rt,
        rw: parsed.rw,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'territories',
      entityType: 'neighborhood_unit',
      entityId: unit.id,
      metadata: { hamletId: parsed.hamletId },
      ipAddress,
    });

    return successResponse(unit, 'RT/RW berhasil ditambahkan');
  }

  async updateNeighborhoodUnit(
    user: JwtPayload,
    id: string,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(updateNeighborhoodUnitSchema, body);
    const existing = await this.prisma.neighborhoodUnit.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('RT/RW tidak ditemukan');

    const rt = parsed.rt ?? existing.rt;
    const rw = parsed.rw ?? existing.rw;

    if (rt !== existing.rt || rw !== existing.rw) {
      const duplicate = await this.prisma.neighborhoodUnit.findUnique({
        where: {
          tenantId_hamletId_rt_rw: {
            tenantId,
            hamletId: existing.hamletId,
            rt,
            rw,
          },
        },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('RT/RW sudah terdaftar pada dusun ini');
      }
    }

    if (!parsed.rt && !parsed.rw) {
      throw new BadRequestException('Minimal satu field (rt atau rw) harus diisi');
    }

    const unit = await this.prisma.neighborhoodUnit.update({
      where: { id },
      data: {
        ...(parsed.rt !== undefined ? { rt: parsed.rt } : {}),
        ...(parsed.rw !== undefined ? { rw: parsed.rw } : {}),
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'territories',
      entityType: 'neighborhood_unit',
      entityId: id,
      ipAddress,
    });

    return successResponse(unit, 'RT/RW berhasil diperbarui');
  }
}
