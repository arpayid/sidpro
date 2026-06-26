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
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { createDevelopmentProjectSchema, updateDevelopmentProjectSchema } from '@sidpro/validators';

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

  private async resolveTenantId(tenantCode: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { code: tenantCode } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    return tenant.id;
  }

  async findPublicProjects(tenantCode: string, limit = 20) {
    const tenantId = await this.resolveTenantId(tenantCode);
    const projects = await this.prisma.developmentProject.findMany({
      where: {
        tenantId,
        status: { in: ['planned', 'ongoing', 'completed'] },
      },
      orderBy: [{ progress: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        budget: true,
        progress: true,
        status: true,
        location: true,
      },
    });

    return successResponse(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        budget: project.budget ? Number(project.budget) : null,
        progress: project.progress,
        status: project.status,
        location: project.location,
      })),
    );
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
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createDevelopmentProjectSchema, body);
    const existing = await this.prisma.developmentProject.findUnique({
      where: { tenantId_code: { tenantId, code: parsed.code } },
    });
    if (existing) throw new ConflictException('Kode proyek sudah digunakan');

    const project = await this.prisma.developmentProject.create({
      data: {
        tenantId,
        name: parsed.name,
        code: parsed.code,
        description: parsed.description,
        location: parsed.location,
        budget: parsed.budget !== undefined ? new Prisma.Decimal(parsed.budget) : null,
        fundingSource: parsed.fundingSource,
        status: parsed.status ?? 'planned',
        progress: parsed.progress ?? 0,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
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
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.developmentProject.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Proyek pembangunan tidak ditemukan');

    const data: Record<string, unknown> = { ...parseWithZod(updateDevelopmentProjectSchema, body) };
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
