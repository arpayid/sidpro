import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  assignComplaintSchema,
  createComplaintSchema,
  publicComplaintTrackSchema,
  respondComplaintSchema,
  updateComplaintStatusSchema,
} from '@sidpro/validators';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { FilesService } from '../../core/files/files.service';
import { NotificationQueueService } from '../../core/queue/notification-queue.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

const COMPLAINT_INCLUDE_LIST = {
  reporter: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  _count: { select: { responses: true } },
} as const;

const STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ['verified', 'rejected'],
  verified: ['assigned', 'rejected'],
  assigned: ['in_progress', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: ['closed'],
  rejected: [],
  closed: [],
};

const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  submitted: 'Masuk',
  verified: 'Diverifikasi',
  assigned: 'Ditugaskan',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  rejected: 'Ditolak',
  closed: 'Ditutup',
};

@Injectable()
export class ComplaintsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private filesService: FilesService,
    private notificationQueue: NotificationQueueService,
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

  async resolveTenantIdForUpload(tenantCode: string): Promise<string> {
    return this.resolveTenantId(tenantCode);
  }

  private assertTransition(from: string, to: string) {
    const allowed = STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Transisi status ${from} → ${to} tidak diizinkan`);
    }
  }

  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/[\s-]/g, '');
    if (normalized.startsWith('+62')) {
      normalized = `0${normalized.slice(3)}`;
    } else if (normalized.startsWith('62')) {
      normalized = `0${normalized.slice(2)}`;
    }
    return normalized;
  }

  private formatTicketId(id: string): string {
    return `PGD-${id.slice(0, 8).toUpperCase()}`;
  }

  private async notifyComplaintStatusChange(
    tenantId: string,
    complaint: {
      id: string;
      title: string;
      reporterEmail: string | null;
      reporterName: string | null;
    },
    fromStatus: string,
    toStatus: string,
    note?: string | null,
  ) {
    if (!complaint.reporterEmail || fromStatus === toStatus) return;

    await this.notificationQueue.enqueueComplaintStatusEmail({
      tenantId,
      complaintId: complaint.id,
      ticket: this.formatTicketId(complaint.id),
      title: complaint.title,
      reporterEmail: complaint.reporterEmail,
      reporterName: complaint.reporterName,
      fromStatus,
      toStatus,
      fromStatusLabel: COMPLAINT_STATUS_LABELS[fromStatus] ?? fromStatus,
      statusLabel: COMPLAINT_STATUS_LABELS[toStatus] ?? toStatus,
      note: note ?? null,
      appUrl: process.env.APP_URL,
    });
  }

  private parseTicketPrefix(ticket: string): string {
    return ticket.replace(/^PGD-/i, '').toUpperCase();
  }

  private buildPublicTimeline(
    complaint: { status: string; createdAt: Date; updatedAt: Date },
    responses: { status: string | null; createdAt: Date }[],
  ) {
    const timeline: { status: string; label: string; at: string }[] = [
      {
        status: 'submitted',
        label: COMPLAINT_STATUS_LABELS.submitted,
        at: complaint.createdAt.toISOString(),
      },
    ];

    for (const response of responses) {
      if (!response.status) continue;
      const last = timeline[timeline.length - 1];
      if (last?.status === response.status) continue;
      timeline.push({
        status: response.status,
        label: COMPLAINT_STATUS_LABELS[response.status] ?? response.status,
        at: response.createdAt.toISOString(),
      });
    }

    const last = timeline[timeline.length - 1];
    if (last?.status !== complaint.status) {
      timeline.push({
        status: complaint.status,
        label: COMPLAINT_STATUS_LABELS[complaint.status] ?? complaint.status,
        at: complaint.updatedAt.toISOString(),
      });
    }

    return timeline;
  }

  private buildWhere(
    tenantId: string,
    filters: {
      status?: string;
      priority?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Prisma.ComplaintWhereInput {
    const where: Prisma.ComplaintWhereInput = {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
    };

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: new Date(`${filters.dateFrom}T00:00:00.000Z`) } : {}),
        ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { reporterName: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findAll(
    user: JwtPayload,
    page = 1,
    limit = 20,
    filters: {
      status?: string;
      priority?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) {
    const tenantId = this.requireTenant(user);
    const where = this.buildWhere(tenantId, filters);

    const [data, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: COMPLAINT_INCLUDE_LIST,
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
        assignee: { select: { id: true, name: true, email: true } },
        responses: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!complaint) throw new NotFoundException('Pengaduan tidak ditemukan');

    const attachments = await this.prisma.file.findMany({
      where: { tenantId, ownerType: 'complaint', ownerId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        path: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    });

    return successResponse({ ...complaint, attachments });
  }

  async createPublic(tenantCode: string, body: unknown) {
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const tenantId = await this.resolveTenantId(tenantCode);
    const fileIds = parsed.data.fileIds ?? [];

    const complaint = await this.prisma.$transaction(async (tx) => {
      const created = await tx.complaint.create({
        data: {
          tenantId,
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          priority: parsed.data.priority ?? 'medium',
          location: parsed.data.location,
          reporterName: parsed.data.reporterName,
          reporterPhone: parsed.data.reporterPhone,
          reporterEmail: parsed.data.reporterEmail,
          status: 'submitted',
        },
      });

      if (fileIds.length) {
        await this.filesService.linkPublicComplaintFiles(tenantId, created.id, fileIds);
      }

      return created;
    });

    return successResponse(complaint, 'Pengaduan berhasil dikirim');
  }

  async trackPublic(tenantCode: string, body: unknown) {
    const parsed = publicComplaintTrackSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const tenantId = await this.resolveTenantId(tenantCode);
    const prefix = this.parseTicketPrefix(parsed.data.ticket);
    const normalizedPhone = this.normalizePhone(parsed.data.reporterPhone);

    const complaints = await this.prisma.$queryRaw<
      {
        id: string;
        title: string;
        category: string;
        priority: string;
        status: string;
        reporter_phone: string | null;
        created_at: Date;
        updated_at: Date;
        closed_at: Date | null;
      }[]
    >`
      SELECT id, title, category, priority, status, reporter_phone, created_at, updated_at, closed_at
      FROM complaints
      WHERE tenant_id = ${tenantId}
        AND id::text ILIKE ${`${prefix}%`}
      LIMIT 1
    `;

    const row = complaints[0];
    if (!row || !row.reporter_phone) {
      throw new NotFoundException('Pengaduan tidak ditemukan');
    }

    if (this.normalizePhone(row.reporter_phone) !== normalizedPhone) {
      throw new NotFoundException('Pengaduan tidak ditemukan');
    }

    const responses = await this.prisma.complaintResponse.findMany({
      where: { complaintId: row.id },
      orderBy: { createdAt: 'asc' },
      select: { response: true, status: true, createdAt: true },
    });

    const complaint = {
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return successResponse({
      ticket: this.formatTicketId(row.id),
      title: row.title,
      category: row.category,
      priority: row.priority,
      status: row.status,
      statusLabel: COMPLAINT_STATUS_LABELS[row.status] ?? row.status,
      submittedAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      closedAt: row.closed_at?.toISOString() ?? null,
      timeline: this.buildPublicTimeline(complaint, responses),
      responses: responses.map((r) => ({
        message: r.response,
        at: r.createdAt.toISOString(),
      })),
    });
  }

  async create(user: JwtPayload, body: unknown, ipAddress?: string) {
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const tenantId = this.requireTenant(user);

    const complaint = await this.prisma.complaint.create({
      data: {
        tenantId,
        reporterId: user.sub,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority ?? 'medium',
        location: parsed.data.location,
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

  async updateStatus(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = updateComplaintStatusSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.complaint.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Pengaduan tidak ditemukan');

    const { status: nextStatus, note } = parsed.data;

    if (['rejected', 'closed'].includes(nextStatus) && !user.permissions.includes('complaints.close')) {
      throw new ForbiddenException('Missing permission: complaints.close');
    }
    if (!['rejected', 'closed'].includes(nextStatus) && !user.permissions.includes('complaints.update')) {
      throw new ForbiddenException('Missing permission: complaints.update');
    }

    this.assertTransition(existing.status, nextStatus);

    const complaint = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(nextStatus === 'closed' || nextStatus === 'rejected'
            ? { closedAt: new Date() }
            : {}),
        },
        include: COMPLAINT_INCLUDE_LIST,
      });

      if (note) {
        await tx.complaintResponse.create({
          data: {
            complaintId: id,
            responderId: user.sub,
            response: note,
            status: nextStatus,
          },
        });
      }

      return updated;
    });

    const action =
      nextStatus === 'verified'
        ? 'verify'
        : nextStatus === 'rejected'
          ? 'reject'
          : nextStatus === 'closed'
            ? 'close'
            : 'update_status';

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action,
      module: 'complaints',
      entityType: 'complaint',
      entityId: id,
      metadata: { from: existing.status, to: nextStatus },
      ipAddress,
    });

    await this.notifyComplaintStatusChange(tenantId, existing, existing.status, nextStatus, note);

    return successResponse(complaint, 'Status pengaduan diperbarui');
  }

  async assign(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = assignComplaintSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.complaint.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Pengaduan tidak ditemukan');

    if (existing.status === 'submitted') {
      throw new BadRequestException('Verifikasi pengaduan terlebih dahulu');
    }
    if (!['verified', 'assigned', 'in_progress'].includes(existing.status)) {
      throw new BadRequestException('Pengaduan tidak dapat ditugaskan pada status ini');
    }

    const assignee = await this.prisma.user.findFirst({
      where: { id: parsed.data.assigneeId, tenantId, deletedAt: null, status: 'active' },
    });
    if (!assignee) throw new NotFoundException('Petugas tidak ditemukan');

    const nextStatus = existing.status === 'verified' ? 'assigned' : existing.status;

    const complaint = await this.prisma.complaint.update({
      where: { id },
      data: {
        assigneeId: parsed.data.assigneeId,
        status: nextStatus,
      },
      include: COMPLAINT_INCLUDE_LIST,
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'assign',
      module: 'complaints',
      entityType: 'complaint',
      entityId: id,
      metadata: { assigneeId: parsed.data.assigneeId },
      ipAddress,
    });

    await this.notifyComplaintStatusChange(tenantId, existing, existing.status, nextStatus);

    return successResponse(complaint, 'Pengaduan berhasil ditugaskan');
  }

  async addResponse(user: JwtPayload, id: string, body: unknown, ipAddress?: string) {
    const parsed = respondComplaintSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.complaint.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Pengaduan tidak ditemukan');

    const nextStatus = parsed.data.status ?? 'in_progress';

    const [response, updatedComplaint] = await this.prisma.$transaction([
      this.prisma.complaintResponse.create({
        data: {
          complaintId: id,
          responderId: user.sub,
          response: parsed.data.response,
          status: nextStatus,
        },
      }),
      this.prisma.complaint.update({
        where: { id },
        data: {
          status:
            nextStatus === 'resolved' && existing.status !== 'closed'
              ? 'resolved'
              : existing.status === 'assigned'
                ? 'in_progress'
                : existing.status,
          ...(nextStatus === 'resolved' ? { closedAt: null } : {}),
        },
      }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'respond',
      module: 'complaints',
      entityType: 'complaint',
      entityId: id,
      metadata: { status: nextStatus },
      ipAddress,
    });

    await this.notifyComplaintStatusChange(
      tenantId,
      existing,
      existing.status,
      updatedComplaint.status,
      parsed.data.response,
    );

    return successResponse(response, 'Tanggapan berhasil dikirim');
  }

  async respond(
    user: JwtPayload,
    id: string,
    body: unknown,
    ipAddress?: string,
  ) {
    return this.addResponse(user, id, body, ipAddress);
  }

  async close(user: JwtPayload, id: string, ipAddress?: string) {
    return this.updateStatus(
      user,
      id,
      { status: 'closed', note: 'Pengaduan ditutup' },
      ipAddress,
    );
  }

  async exportCsv(user: JwtPayload, ipAddress: string | undefined, res: Response) {
    const tenantId = this.requireTenant(user);
    const complaints = await this.prisma.complaint.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        priority: true,
        status: true,
        reporterName: true,
        reporterPhone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const header = 'id,title,category,priority,status,reporter_name,reporter_phone,created_at,updated_at';
    const rows = complaints.map((c) =>
      [
        c.id,
        `"${c.title.replace(/"/g, '""')}"`,
        c.category,
        c.priority,
        c.status,
        `"${(c.reporterName ?? '').replace(/"/g, '""')}"`,
        c.reporterPhone ?? '',
        c.createdAt.toISOString(),
        c.updatedAt.toISOString(),
      ].join(','),
    );

    const csv = [header, ...rows].join('\n');

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'export',
      module: 'complaints',
      entityType: 'complaint',
      metadata: { format: 'csv', count: complaints.length },
      ipAddress,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="complaints-export.csv"');
    res.send(csv);
  }
}
