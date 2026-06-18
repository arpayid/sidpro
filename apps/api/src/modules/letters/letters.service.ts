import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

@Injectable()
export class LettersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  // ─── Letter Types ─────────────────────────────────────────────────────────

  async findLetterTypes(user: JwtPayload, page = 1, limit = 20) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.letterType.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        include: { templates: { where: { isActive: true }, take: 1 } },
      }),
      this.prisma.letterType.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async createLetterType(
    user: JwtPayload,
    body: { code: string; name: string; requiredFields?: object; requiredFiles?: object },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const letterType = await this.prisma.letterType.create({
      data: { tenantId, ...body },
    });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'letters',
      entityType: 'letter_type',
      entityId: letterType.id,
      ipAddress,
    });
    return successResponse(letterType, 'Jenis surat berhasil dibuat');
  }

  // ─── Letter Templates ───────────────────────────────────────────────────────

  async findTemplates(user: JwtPayload, letterTypeId?: string) {
    const tenantId = this.requireTenant(user);
    const data = await this.prisma.letterTemplate.findMany({
      where: { tenantId, ...(letterTypeId ? { letterTypeId } : {}) },
      orderBy: { version: 'desc' },
    });
    return successResponse(data);
  }

  async createTemplate(
    user: JwtPayload,
    body: { letterTypeId: string; name: string; content: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const template = await this.prisma.letterTemplate.create({
      data: { tenantId, ...body },
    });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'letters',
      entityType: 'letter_template',
      entityId: template.id,
      ipAddress,
    });
    return successResponse(template, 'Template surat berhasil dibuat');
  }

  // ─── Letter Requests ────────────────────────────────────────────────────────

  async findRequests(user: JwtPayload, page = 1, limit = 20, status?: string) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId, ...(status ? { status } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.letterRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          letterType: true,
          resident: { select: { id: true, fullName: true } },
          requester: { select: { id: true, name: true } },
        },
      }),
      this.prisma.letterRequest.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async findRequest(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const request = await this.prisma.letterRequest.findFirst({
      where: { id, tenantId },
      include: {
        letterType: true,
        resident: true,
        approvals: { orderBy: { createdAt: 'asc' } },
        outputs: true,
      },
    });
    if (!request) throw new NotFoundException('Permohonan surat tidak ditemukan');
    return successResponse(request);
  }

  async createRequest(
    user: JwtPayload,
    body: {
      letterTypeId: string;
      residentId?: string;
      purpose: string;
      formData?: Record<string, unknown>;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const request = await this.prisma.letterRequest.create({
      data: {
        tenantId,
        requesterId: user.sub,
        letterTypeId: body.letterTypeId,
        residentId: body.residentId,
        purpose: body.purpose,
        formData: body.formData as object,
        status: 'submitted',
      },
    });
    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'letters',
      entityType: 'letter_request',
      entityId: request.id,
      ipAddress,
    });
    return successResponse(request, 'Permohonan surat berhasil diajukan');
  }

  async verify(
    user: JwtPayload,
    id: string,
    body: { notes?: string; approved: boolean },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const request = await this.prisma.letterRequest.findFirst({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Permohonan surat tidak ditemukan');

    const status = body.approved ? 'verified' : 'rejected';
    await this.prisma.$transaction([
      this.prisma.letterApproval.create({
        data: {
          tenantId,
          letterRequestId: id,
          approverId: user.sub,
          level: 'verify',
          status,
          notes: body.notes,
        },
      }),
      this.prisma.letterRequest.update({ where: { id }, data: { status } }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: body.approved ? 'verify' : 'reject',
      module: 'letters',
      entityType: 'letter_request',
      entityId: id,
      ipAddress,
    });

    return successResponse({ status }, 'Verifikasi surat selesai');
  }

  async approve(
    user: JwtPayload,
    id: string,
    body: { notes?: string; approved: boolean },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const request = await this.prisma.letterRequest.findFirst({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Permohonan surat tidak ditemukan');
    if (request.status !== 'verified') {
      throw new BadRequestException('Surat harus diverifikasi terlebih dahulu');
    }

    const status = body.approved ? 'approved' : 'rejected';
    await this.prisma.$transaction([
      this.prisma.letterApproval.create({
        data: {
          tenantId,
          letterRequestId: id,
          approverId: user.sub,
          level: 'approve',
          status,
          notes: body.notes,
        },
      }),
      this.prisma.letterRequest.update({ where: { id }, data: { status } }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: body.approved ? 'approve' : 'reject',
      module: 'letters',
      entityType: 'letter_request',
      entityId: id,
      ipAddress,
    });

    return successResponse({ status }, 'Persetujuan surat selesai');
  }

  async reject(user: JwtPayload, id: string, notes?: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const request = await this.prisma.letterRequest.findFirst({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Permohonan surat tidak ditemukan');

    await this.prisma.$transaction([
      this.prisma.letterApproval.create({
        data: {
          tenantId,
          letterRequestId: id,
          approverId: user.sub,
          level: 'reject',
          status: 'rejected',
          notes,
        },
      }),
      this.prisma.letterRequest.update({ where: { id }, data: { status: 'rejected' } }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'reject',
      module: 'letters',
      entityType: 'letter_request',
      entityId: id,
      ipAddress,
    });

    return successResponse({ status: 'rejected' }, 'Permohonan surat ditolak');
  }

  async generatePdf(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const request = await this.prisma.letterRequest.findFirst({
      where: { id, tenantId },
      include: { letterType: true },
    });
    if (!request) throw new NotFoundException('Permohonan surat tidak ditemukan');
    if (request.status !== 'approved') {
      throw new BadRequestException('Surat harus disetujui sebelum digenerate');
    }

    const year = new Date().getFullYear();
    const sequence = await this.prisma.letterNumberSequence.upsert({
      where: {
        tenantId_letterTypeId_year: {
          tenantId,
          letterTypeId: request.letterTypeId,
          year,
        },
      },
      create: { tenantId, letterTypeId: request.letterTypeId, year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });

    const letterNumber = `${request.letterType.code}/${year}/${String(sequence.lastNumber).padStart(4, '0')}`;
    const qrCode = randomUUID();

    const output = await this.prisma.$transaction(async (tx) => {
      await tx.letterRequest.update({
        where: { id },
        data: { letterNumber, status: 'completed', completedAt: new Date() },
      });
      return tx.letterOutput.create({
        data: { tenantId, letterRequestId: id, qrCode, signedAt: new Date() },
      });
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'generate',
      module: 'letters',
      entityType: 'letter_output',
      entityId: output.id,
      metadata: { letterNumber, qrCode },
      ipAddress,
    });

    return successResponse(
      {
        letterNumber,
        qrCode,
        outputId: output.id,
        pdfUrl: null,
        message: 'PDF placeholder — QR code generated for verification',
      },
      'Surat berhasil digenerate',
    );
  }

  async download(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const output = await this.prisma.letterOutput.findFirst({
      where: { letterRequestId: id, tenantId },
      include: { letterRequest: { include: { letterType: true } } },
    });
    if (!output) throw new NotFoundException('Output surat tidak ditemukan');

    return successResponse({
      qrCode: output.qrCode,
      letterNumber: output.letterRequest.letterNumber,
      pdfUrl: null,
      message: 'PDF download placeholder',
    });
  }

  async verifyByQr(qrCode: string) {
    const output = await this.prisma.letterOutput.findUnique({
      where: { qrCode },
      include: {
        letterRequest: {
          include: {
            letterType: { select: { name: true, code: true } },
            resident: { select: { fullName: true } },
          },
        },
      },
    });
    if (!output) throw new NotFoundException('Surat tidak ditemukan atau QR tidak valid');

    return successResponse({
      valid: true,
      qrCode: output.qrCode,
      letterNumber: output.letterRequest.letterNumber,
      letterType: output.letterRequest.letterType.name,
      residentName: output.letterRequest.resident?.fullName,
      signedAt: output.signedAt,
      status: output.letterRequest.status,
    });
  }
}
