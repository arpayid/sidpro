import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

@Injectable()
export class DevelopmentService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAll(user: JwtPayload, page = 1, limit = 20, status?: string) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId, ...(status ? { status } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.developmentProject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.developmentProject.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const project = await this.prisma.developmentProject.findFirst({ where: { id, tenantId } });
    if (!project) throw new NotFoundException('Proyek pembangunan tidak ditemukan');
    return successResponse(project);
  }

  async create(
    user: JwtPayload,
    body: {
      name: string;
      code: string;
      description?: string;
      location?: string;
      budget?: number;
      fundingSource?: string;
      status?: string;
      progress?: number;
      startDate?: string;
      endDate?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.developmentProject.findUnique({
      where: { tenantId_code: { tenantId, code: body.code } },
    });
    if (existing) throw new ConflictException('Kode proyek sudah digunakan');

    const project = await this.prisma.developmentProject.create({
      data: {
        tenantId,
        name: body.name,
        code: body.code,
        description: body.description,
        location: body.location,
        budget: body.budget !== undefined ? new Prisma.Decimal(body.budget) : null,
        fundingSource: body.fundingSource,
        status: body.status ?? 'planned',
        progress: body.progress ?? 0,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'development',
      entityType: 'development_project',
      entityId: project.id,
      ipAddress,
    });

    return successResponse(project, 'Proyek pembangunan berhasil ditambahkan');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: Record<string, unknown>,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.developmentProject.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Proyek pembangunan tidak ditemukan');

    const data = { ...body };
    if (typeof data.budget === 'number') data.budget = new Prisma.Decimal(data.budget);
    if (typeof data.startDate === 'string') data.startDate = new Date(data.startDate);
    if (typeof data.endDate === 'string') data.endDate = new Date(data.endDate);

    const project = await this.prisma.developmentProject.update({ where: { id }, data });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'development',
      entityType: 'development_project',
      entityId: id,
      ipAddress,
    });

    return successResponse(project, 'Proyek pembangunan berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.developmentProject.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Proyek pembangunan tidak ditemukan');

    await this.prisma.developmentProject.delete({ where: { id } });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'development',
      entityType: 'development_project',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'Proyek pembangunan berhasil dihapus');
  }
}
