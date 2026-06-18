import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

@Injectable()
export class ComplaintsService {
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

  async findAll(user: JwtPayload, page = 1, limit = 20, status?: string) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId, ...(status ? { status } : {}) };

    const [data, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          _count: { select: { responses: true } },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const complaint = await this.prisma.complaint.findFirst({
      where: { id, tenantId },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true } },
        responses: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!complaint) throw new NotFoundException('Pengaduan tidak ditemukan');
    return successResponse(complaint);
  }

  async createPublic(
    tenantCode: string,
    body: {
      title: string;
      description: string;
      category: string;
      priority?: string;
      location?: string;
      reporterName?: string;
      reporterPhone?: string;
      reporterEmail?: string;
    },
  ) {
    const tenantId = await this.resolveTenantId(tenantCode);

    const complaint = await this.prisma.complaint.create({
      data: {
        tenantId,
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority ?? 'medium',
        location: body.location,
        reporterName: body.reporterName,
        reporterPhone: body.reporterPhone,
        reporterEmail: body.reporterEmail,
        status: 'submitted',
      },
    });

    return successResponse(complaint, 'Pengaduan berhasil dikirim');
  }

  async create(
    user: JwtPayload,
    body: {
      title: string;
      description: string;
      category: string;
      priority?: string;
      location?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    const complaint = await this.prisma.complaint.create({
      data: {
        tenantId,
        reporterId: user.sub,
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority ?? 'medium',
        location: body.location,
        status: 'submitted',
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'complaints',
      entityType: 'complaint',
      entityId: complaint.id,
      ipAddress,
    });

    return successResponse(complaint, 'Pengaduan berhasil dibuat');
  }

  async assign(
    user: JwtPayload,
    id: string,
    assigneeId: string,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.complaint.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Pengaduan tidak ditemukan');

    const complaint = await this.prisma.complaint.update({
      where: { id },
      data: { assigneeId, status: 'assigned' },
      include: { assignee: { select: { id: true, name: true } } },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'assign',
      module: 'complaints',
      entityType: 'complaint',
      entityId: id,
      metadata: { assigneeId },
      ipAddress,
    });

    return successResponse(complaint, 'Pengaduan berhasil ditugaskan');
  }

  async respond(
    user: JwtPayload,
    id: string,
    body: { response: string; status?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.complaint.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Pengaduan tidak ditemukan');

    const [response] = await this.prisma.$transaction([
      this.prisma.complaintResponse.create({
        data: {
          complaintId: id,
          responderId: user.sub,
          response: body.response,
          status: body.status,
        },
      }),
      this.prisma.complaint.update({
        where: { id },
        data: { status: body.status ?? 'in_progress' },
      }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'respond',
      module: 'complaints',
      entityType: 'complaint',
      entityId: id,
      ipAddress,
    });

    return successResponse(response, 'Tanggapan berhasil dikirim');
  }

  async close(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.complaint.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Pengaduan tidak ditemukan');
    if (existing.status === 'closed') {
      throw new BadRequestException('Pengaduan sudah ditutup');
    }

    const complaint = await this.prisma.complaint.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date() },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'close',
      module: 'complaints',
      entityType: 'complaint',
      entityId: id,
      ipAddress,
    });

    return successResponse(complaint, 'Pengaduan berhasil ditutup');
  }
}
