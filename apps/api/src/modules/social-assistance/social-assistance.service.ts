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
export class SocialAssistanceService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findPrograms(user: JwtPayload, page = 1, limit = 20) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.aidProgram.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { recipients: true } } },
      }),
      this.prisma.aidProgram.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async createProgram(
    user: JwtPayload,
    body: {
      name: string;
      code: string;
      description?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.aidProgram.findUnique({
      where: { tenantId_code: { tenantId, code: body.code } },
    });
    if (existing) throw new ConflictException('Kode program sudah digunakan');

    const program = await this.prisma.aidProgram.create({
      data: {
        tenantId,
        name: body.name,
        code: body.code,
        description: body.description,
        status: body.status ?? 'active',
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'social-assistance',
      entityType: 'aid_program',
      entityId: program.id,
      ipAddress,
    });

    return successResponse(program, 'Program bantuan berhasil dibuat');
  }

  async updateProgram(
    user: JwtPayload,
    id: string,
    body: Record<string, unknown>,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.aidProgram.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Program bantuan tidak ditemukan');

    const data = { ...body };
    if (typeof data.startDate === 'string') data.startDate = new Date(data.startDate);
    if (typeof data.endDate === 'string') data.endDate = new Date(data.endDate);

    const program = await this.prisma.aidProgram.update({ where: { id }, data });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'social-assistance',
      entityType: 'aid_program',
      entityId: id,
      ipAddress,
    });

    return successResponse(program, 'Program bantuan berhasil diperbarui');
  }

  async findRecipients(user: JwtPayload, programId: string, page = 1, limit = 20) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId, programId };
    const [data, total] = await Promise.all([
      this.prisma.aidRecipient.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aidRecipient.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async addRecipient(
    user: JwtPayload,
    programId: string,
    body: {
      residentId?: string;
      familyId?: string;
      status?: string;
      amount?: number;
      notes?: string;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const program = await this.prisma.aidProgram.findFirst({ where: { id: programId, tenantId } });
    if (!program) throw new NotFoundException('Program bantuan tidak ditemukan');

    const recipient = await this.prisma.aidRecipient.create({
      data: {
        tenantId,
        programId,
        residentId: body.residentId,
        familyId: body.familyId,
        status: body.status ?? 'pending',
        amount: body.amount !== undefined ? new Prisma.Decimal(body.amount) : null,
        notes: body.notes,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'social-assistance',
      entityType: 'aid_recipient',
      entityId: recipient.id,
      ipAddress,
    });

    return successResponse(recipient, 'Penerima bantuan berhasil ditambahkan');
  }

  async updateRecipient(
    user: JwtPayload,
    id: string,
    body: { status?: string; amount?: number; notes?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.aidRecipient.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Penerima bantuan tidak ditemukan');

    const recipient = await this.prisma.aidRecipient.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.amount !== undefined ? { amount: new Prisma.Decimal(body.amount) } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'social-assistance',
      entityType: 'aid_recipient',
      entityId: id,
      ipAddress,
    });

    return successResponse(recipient, 'Penerima bantuan berhasil diperbarui');
  }
}
