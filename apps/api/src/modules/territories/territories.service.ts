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
    body: { name: string; code: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    const existing = await this.prisma.hamlet.findUnique({
      where: { tenantId_code: { tenantId, code: body.code } },
    });
    if (existing) throw new ConflictException('Kode dusun sudah terdaftar');

    const hamlet = await this.prisma.hamlet.create({
      data: { tenantId, name: body.name, code: body.code },
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
    body: { name?: string; code?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.hamlet.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Dusun tidak ditemukan');

    if (body.code && body.code !== existing.code) {
      const duplicate = await this.prisma.hamlet.findUnique({
        where: { tenantId_code: { tenantId, code: body.code } },
      });
      if (duplicate) throw new ConflictException('Kode dusun sudah terdaftar');
    }

    const hamlet = await this.prisma.hamlet.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.code !== undefined ? { code: body.code } : {}),
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
    body: { hamletId: string; rt: string; rw: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    const hamlet = await this.prisma.hamlet.findFirst({
      where: { id: body.hamletId, tenantId },
    });
    if (!hamlet) throw new NotFoundException('Dusun tidak ditemukan');

    const existing = await this.prisma.neighborhoodUnit.findUnique({
      where: {
        tenantId_hamletId_rt_rw: {
          tenantId,
          hamletId: body.hamletId,
          rt: body.rt,
          rw: body.rw,
        },
      },
    });
    if (existing) throw new ConflictException('RT/RW sudah terdaftar pada dusun ini');

    const unit = await this.prisma.neighborhoodUnit.create({
      data: {
        tenantId,
        hamletId: body.hamletId,
        rt: body.rt,
        rw: body.rw,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'territories',
      entityType: 'neighborhood_unit',
      entityId: unit.id,
      metadata: { hamletId: body.hamletId },
      ipAddress,
    });

    return successResponse(unit, 'RT/RW berhasil ditambahkan');
  }

  async updateNeighborhoodUnit(
    user: JwtPayload,
    id: string,
    body: { rt?: string; rw?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.neighborhoodUnit.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('RT/RW tidak ditemukan');

    const rt = body.rt ?? existing.rt;
    const rw = body.rw ?? existing.rw;

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

    if (!body.rt && !body.rw) {
      throw new BadRequestException('Minimal satu field (rt atau rw) harus diisi');
    }

    const unit = await this.prisma.neighborhoodUnit.update({
      where: { id },
      data: {
        ...(body.rt !== undefined ? { rt: body.rt } : {}),
        ...(body.rw !== undefined ? { rw: body.rw } : {}),
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
