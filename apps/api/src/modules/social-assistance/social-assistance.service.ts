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
import { createSocialAidProgramSchema, createSocialAidRecipientSchema, updateSocialAidProgramSchema, updateSocialAidRecipientSchema } from '@sidpro/validators';

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
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createSocialAidProgramSchema, body);
    const existing = await this.prisma.aidProgram.findUnique({
      where: { tenantId_code: { tenantId, code: parsed.code } },
    });
    if (existing) throw new ConflictException('Kode program sudah digunakan');

    const program = await this.prisma.aidProgram.create({
      data: {
        tenantId,
        name: parsed.name,
        code: parsed.code,
        description: parsed.description,
        status: parsed.status ?? 'active',
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
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
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.aidProgram.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Program bantuan tidak ditemukan');

    const data: Record<string, unknown> = { ...parseWithZod(updateSocialAidProgramSchema, body) };
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
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createSocialAidRecipientSchema, body);
    const program = await this.prisma.aidProgram.findFirst({ where: { id: programId, tenantId } });
    if (!program) throw new NotFoundException('Program bantuan tidak ditemukan');

    const recipient = await this.prisma.aidRecipient.create({
      data: {
        tenantId,
        programId,
        residentId: parsed.residentId,
        familyId: parsed.familyId,
        status: parsed.status ?? 'pending',
        amount: parsed.amount !== undefined ? new Prisma.Decimal(parsed.amount) : null,
        notes: parsed.notes,
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
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(updateSocialAidRecipientSchema, body);
    const existing = await this.prisma.aidRecipient.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Penerima bantuan tidak ditemukan');

    const recipient = await this.prisma.aidRecipient.update({
      where: { id },
      data: {
        ...(parsed.status ? { status: parsed.status } : {}),
        ...(parsed.amount !== undefined ? { amount: new Prisma.Decimal(parsed.amount) } : {}),
        ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
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
