import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  createLetterRequestSchema,
  publicLetterTrackSchema,
} from '@sidpro/validators';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { StorageService } from '../../core/storage/storage.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse, maskNik } from '../../common/utils/response.util';
import {
  DEFAULT_LETTER_TEMPLATE,
  LetterPdfService,
  type LetterPdfVillage,
} from './letter-pdf.service';

interface SignatoryConfig {
  name?: string;
  title?: string;
}

interface LetterPdfConfig {
  maskNik?: boolean;
}

interface LetterHeaderConfig {
  useCustom?: boolean;
  name?: string;
  address?: string;
  province?: string;
  regency?: string;
  district?: string;
}

interface VillageRecord {
  name: string;
  address?: string | null;
  province?: string | null;
  regency?: string | null;
  district?: string | null;
}

const LETTER_STATUS_LABELS: Record<string, string> = {
  submitted: 'Diajukan',
  verified: 'Terverifikasi',
  approved: 'Disetujui',
  completed: 'Selesai',
  rejected: 'Ditolak',
};

const LETTER_APPROVAL_LABELS: Record<string, string> = {
  verify: 'Verifikasi',
  approve: 'Persetujuan',
  reject: 'Penolakan',
};

@Injectable()
export class LettersService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
    private storage: StorageService,
    private letterPdf: LetterPdfService,
    private config: ConfigService,
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

  private formatTicketId(id: string): string {
    return `SRT-${id.slice(0, 8).toUpperCase()}`;
  }

  private parseTicketPrefix(ticket: string): string {
    return ticket.replace(/^SRT-/i, '').toUpperCase();
  }

  private buildPublicTimeline(
    request: { status: string; submittedAt: Date; updatedAt: Date },
    approvals: { level: string; status: string; createdAt: Date }[],
  ) {
    const timeline: { status: string; label: string; at: string }[] = [
      {
        status: 'submitted',
        label: LETTER_STATUS_LABELS.submitted,
        at: request.submittedAt.toISOString(),
      },
    ];

    for (const approval of approvals) {
      timeline.push({
        status: approval.status,
        label: `${LETTER_APPROVAL_LABELS[approval.level] ?? approval.level}: ${
          LETTER_STATUS_LABELS[approval.status] ?? approval.status
        }`,
        at: approval.createdAt.toISOString(),
      });
    }

    const last = timeline[timeline.length - 1];
    if (last?.status !== request.status) {
      timeline.push({
        status: request.status,
        label: LETTER_STATUS_LABELS[request.status] ?? request.status,
        at: request.updatedAt.toISOString(),
      });
    }

    return timeline;
  }

  private buildVerificationUrl(qrCode: string): string {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000').replace(/\/$/, '');
    return `${appUrl}/verifikasi-surat?code=${encodeURIComponent(qrCode)}`;
  }

  private async getSignatory(tenantId: string): Promise<{ name: string; title: string }> {
    const settings = await this.getLetterSettingsData(tenantId);
    return settings.signatory;
  }

  private async getLetterSettingsData(tenantId: string) {
    const [signatorySetting, pdfSetting, headerSetting] = await Promise.all([
      this.prisma.setting.findUnique({
        where: { tenantId_key: { tenantId, key: 'letters.signatory' } },
      }),
      this.prisma.setting.findUnique({
        where: { tenantId_key: { tenantId, key: 'letters.pdf' } },
      }),
      this.prisma.setting.findUnique({
        where: { tenantId_key: { tenantId, key: 'letters.header' } },
      }),
    ]);

    const signatoryValue = (signatorySetting?.value ?? {}) as SignatoryConfig;
    const pdfValue = (pdfSetting?.value ?? {}) as LetterPdfConfig;
    const headerValue = (headerSetting?.value ?? {}) as LetterHeaderConfig;

    return {
      signatory: {
        name: signatoryValue.name ?? 'Kepala Desa',
        title: signatoryValue.title ?? 'Kepala Desa',
      },
      pdf: {
        maskNik: pdfValue.maskNik ?? false,
      },
      header: {
        useCustom: headerValue.useCustom ?? false,
        name: headerValue.name,
        address: headerValue.address,
        province: headerValue.province,
        regency: headerValue.regency,
        district: headerValue.district,
      },
    };
  }

  private resolvePdfVillage(village: VillageRecord, header: LetterHeaderConfig): LetterPdfVillage {
    if (!header.useCustom) {
      return {
        name: village.name,
        address: village.address,
        regency: village.regency,
        district: village.district,
        province: village.province,
      };
    }

    return {
      name: header.name?.trim() || village.name,
      address: header.address?.trim() || village.address,
      regency: header.regency?.trim() || village.regency,
      district: header.district?.trim() || village.district,
      province: header.province?.trim() || village.province,
    };
  }

  async getSettings(user: JwtPayload) {
    const tenantId = this.requireTenant(user);
    const [settings, village, templates, letterTypes] = await Promise.all([
      this.getLetterSettingsData(tenantId),
      this.prisma.village.findFirst({ where: { tenantId } }),
      this.prisma.letterTemplate.findMany({
        where: { tenantId, isActive: true },
        orderBy: [{ letterTypeId: 'asc' }, { version: 'desc' }],
        include: { letterType: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.letterType.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
      }),
    ]);

    const activeTemplates = templates.filter(
      (template, index, list) =>
        list.findIndex((item) => item.letterTypeId === template.letterTypeId) === index,
    );

    return successResponse({
      ...settings,
      villageProfile: village
        ? {
            name: village.name,
            address: village.address,
            province: village.province,
            regency: village.regency,
            district: village.district,
          }
        : null,
      letterTypes,
      templates: activeTemplates,
    });
  }

  async updateSettings(
    user: JwtPayload,
    body: {
      signatory: { name: string; title: string };
      pdf: { maskNik: boolean };
      header: LetterHeaderConfig;
    },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    await this.prisma.$transaction([
      this.prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key: 'letters.signatory' } },
        create: { tenantId, key: 'letters.signatory', value: body.signatory as Prisma.InputJsonValue },
        update: { value: body.signatory as Prisma.InputJsonValue },
      }),
      this.prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key: 'letters.pdf' } },
        create: { tenantId, key: 'letters.pdf', value: body.pdf as Prisma.InputJsonValue },
        update: { value: body.pdf as Prisma.InputJsonValue },
      }),
      this.prisma.setting.upsert({
        where: { tenantId_key: { tenantId, key: 'letters.header' } },
        create: { tenantId, key: 'letters.header', value: body.header as Prisma.InputJsonValue },
        update: { value: body.header as Prisma.InputJsonValue },
      }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'letters',
      entityType: 'letter_settings',
      metadata: {
        maskNik: body.pdf.maskNik,
        useCustomHeader: body.header.useCustom,
      },
      ipAddress,
    });

    return successResponse(await this.getLetterSettingsData(tenantId), 'Pengaturan surat berhasil disimpan');
  }

  async updateTemplate(
    user: JwtPayload,
    id: string,
    body: { name?: string; content?: string; isActive?: boolean },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.letterTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Template surat tidak ditemukan');

    const template = await this.prisma.letterTemplate.update({
      where: { id },
      data: body,
      include: { letterType: { select: { id: true, code: true, name: true } } },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'letters',
      entityType: 'letter_template',
      entityId: id,
      metadata: { letterTypeId: template.letterTypeId },
      ipAddress,
    });

    return successResponse(template, 'Template surat berhasil diperbarui');
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
        outputs: { select: { id: true, qrCode: true, fileId: true, signedAt: true, createdAt: true } },
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
    const parsed = createLetterRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const isCitizenRequester =
      user.roles.includes('warga') &&
      !user.roles.some((role) =>
        ['admin_desa', 'operator_desa', 'superadmin_system', 'admin_kabupaten'].includes(role),
      );

    let residentId = parsed.data.residentId;
    if (!residentId) {
      if (!isCitizenRequester) {
        throw new BadRequestException({ residentId: ['Penduduk pemohon wajib diisi'] });
      }
    } else {
      const resident = await this.prisma.resident.findFirst({
        where: { id: residentId, tenantId, deletedAt: null },
      });
      if (!resident) throw new BadRequestException('Penduduk pemohon tidak ditemukan');
    }

    const letterType = await this.prisma.letterType.findFirst({
      where: { id: parsed.data.letterTypeId, tenantId, isActive: true },
    });
    if (!letterType) throw new BadRequestException('Jenis surat tidak ditemukan');

    const request = await this.prisma.letterRequest.create({
      data: {
        tenantId,
        requesterId: user.sub,
        letterTypeId: parsed.data.letterTypeId,
        residentId: residentId ?? null,
        purpose: parsed.data.purpose,
        formData: parsed.data.formData as object,
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
    if (request.status !== 'submitted') {
      throw new BadRequestException('Surat hanya dapat diverifikasi saat status diajukan');
    }

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
    if (!['submitted', 'verified'].includes(request.status)) {
      throw new BadRequestException('Surat tidak dapat ditolak pada status ini');
    }

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
      include: {
        letterType: true,
        resident: { include: { address: true } },
        requester: { select: { name: true } },
      },
    });
    if (!request) throw new NotFoundException('Permohonan surat tidak ditemukan');
    if (request.status !== 'approved') {
      throw new BadRequestException('Surat harus disetujui sebelum digenerate');
    }

    const existingOutput = await this.prisma.letterOutput.findFirst({
      where: { letterRequestId: id, tenantId },
    });
    if (existingOutput?.fileId) {
      throw new BadRequestException('PDF surat sudah pernah digenerate');
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
    const issuedAt = new Date();

    const [village, template, letterSettings] = await Promise.all([
      this.prisma.village.findFirst({ where: { tenantId } }),
      this.prisma.letterTemplate.findFirst({
        where: { tenantId, letterTypeId: request.letterTypeId, isActive: true },
        orderBy: { version: 'desc' },
      }),
      this.getLetterSettingsData(tenantId),
    ]);

    if (!village) {
      throw new BadRequestException('Profil desa belum dikonfigurasi');
    }

    const applicantName =
      request.resident?.fullName ?? request.requester?.name ?? 'Pemohon';
    const applicantAddress = request.resident?.address
      ? [
          request.resident.address.street,
          request.resident.address.rt ? `RT ${request.resident.address.rt}` : null,
          request.resident.address.rw ? `RW ${request.resident.address.rw}` : null,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    const residentNik = request.resident?.nik;
    const displayNik = residentNik
      ? letterSettings.pdf.maskNik
        ? maskNik(residentNik)
        : residentNik
      : '-';

    const verificationUrl = this.buildVerificationUrl(qrCode);
    const pdfBuffer = await this.letterPdf.generate({
      village: this.resolvePdfVillage(village, letterSettings.header),
      letterTypeName: request.letterType.name,
      letterNumber,
      purpose: request.purpose,
      templateContent: template?.content ?? DEFAULT_LETTER_TEMPLATE,
      applicant: {
        fullName: applicantName,
        nik: displayNik,
        address: applicantAddress,
      },
      signatory: letterSettings.signatory,
      issuedAt,
      verificationUrl,
      qrCode,
    });

    const safeNumber = letterNumber.replace(/\//g, '-');
    const storageKey = `${tenantId}/letters/${id}/${safeNumber}.pdf`;
    const checksum = createHash('sha256').update(pdfBuffer).digest('hex');

    await this.storage.uploadFile(pdfBuffer, storageKey, 'application/pdf');

    const output = await this.prisma.$transaction(async (tx) => {
      const file = await tx.file.create({
        data: {
          tenantId,
          ownerType: 'letter_output',
          ownerId: id,
          path: storageKey,
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
          checksum,
        },
      });

      await tx.letterRequest.update({
        where: { id },
        data: { letterNumber, status: 'completed', completedAt: issuedAt },
      });

      return tx.letterOutput.create({
        data: {
          tenantId,
          letterRequestId: id,
          qrCode,
          fileId: file.id,
          signedAt: issuedAt,
        },
      });
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'generate',
      module: 'letters',
      entityType: 'letter_output',
      entityId: output.id,
      metadata: { letterNumber, qrCode: qrCode.slice(0, 8), fileSize: pdfBuffer.length },
      ipAddress,
    });

    return successResponse(
      {
        letterNumber,
        qrCode,
        outputId: output.id,
        fileId: output.fileId,
        verificationUrl,
      },
      'Surat PDF berhasil digenerate',
    );
  }

  async download(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const output = await this.prisma.letterOutput.findFirst({
      where: { letterRequestId: id, tenantId },
      include: { letterRequest: { include: { letterType: true } } },
    });
    if (!output) throw new NotFoundException('Output surat tidak ditemukan');
    if (!output.fileId) {
      throw new BadRequestException('PDF surat belum tersedia. Generate terlebih dahulu.');
    }

    const file = await this.prisma.file.findFirst({
      where: { id: output.fileId, tenantId },
    });
    if (!file) throw new NotFoundException('File PDF tidak ditemukan');

    const url = await this.storage.getSignedUrl(file.path);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'download',
      module: 'letters',
      entityType: 'letter_output',
      entityId: output.id,
      metadata: { letterNumber: output.letterRequest.letterNumber },
      ipAddress,
    });

    return successResponse({
      url,
      expiresIn: 3600,
      qrCode: output.qrCode,
      letterNumber: output.letterRequest.letterNumber,
      mimeType: file.mimeType,
      fileName: `${output.letterRequest.letterType.code}-${output.letterRequest.letterNumber?.replace(/\//g, '-')}.pdf`,
    });
  }

  async verifyByQr(qrCode: string, ipAddress?: string) {
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
    if (!output) {
      throw new NotFoundException('Surat tidak ditemukan atau kode tidak valid');
    }

    const valid = output.letterRequest.status === 'completed';

    await this.auditLogs.log({
      tenantId: output.tenantId,
      action: 'verify',
      module: 'letters',
      entityType: 'letter_output',
      entityId: output.id,
      metadata: {
        valid,
        letterNumber: output.letterRequest.letterNumber,
        qrCodePrefix: qrCode.slice(0, 8),
      },
      ipAddress,
    });

    return successResponse({
      valid,
      qrCodePrefix: qrCode.slice(0, 8).toUpperCase(),
      letterNumber: output.letterRequest.letterNumber,
      letterType: output.letterRequest.letterType.name,
      residentName: output.letterRequest.resident?.fullName,
      signedAt: output.signedAt,
      status: output.letterRequest.status,
      issuedAt: output.signedAt,
    });
  }

  async trackPublic(tenantCode: string, body: unknown) {
    const parsed = publicLetterTrackSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const tenantId = await this.resolveTenantId(tenantCode);
    const prefix = this.parseTicketPrefix(parsed.data.ticket);

    const requests = await this.prisma.$queryRaw<
      {
        id: string;
        status: string;
        purpose: string;
        letter_number: string | null;
        submitted_at: Date;
        updated_at: Date;
        resident_nik: string | null;
        letter_type_name: string;
      }[]
    >`
      SELECT lr.id, lr.status, lr.purpose, lr.letter_number, lr.submitted_at, lr.updated_at,
             r.nik AS resident_nik, lt.name AS letter_type_name
      FROM letter_requests lr
      INNER JOIN letter_types lt ON lt.id = lr.letter_type_id
      LEFT JOIN residents r ON r.id = lr.resident_id
      WHERE lr.tenant_id = ${tenantId}
        AND lr.id::text ILIKE ${`${prefix}%`}
      LIMIT 1
    `;

    const row = requests[0];
    if (!row?.resident_nik) {
      throw new NotFoundException('Permohonan surat tidak ditemukan');
    }

    const nikLast4 = row.resident_nik.slice(-4);
    if (nikLast4 !== parsed.data.nikLast4) {
      throw new NotFoundException('Permohonan surat tidak ditemukan');
    }

    const approvals = await this.prisma.letterApproval.findMany({
      where: { letterRequestId: row.id },
      orderBy: { createdAt: 'asc' },
      select: { level: true, status: true, createdAt: true },
    });

    return successResponse({
      ticket: this.formatTicketId(row.id),
      letterType: row.letter_type_name,
      purpose: row.purpose,
      status: row.status,
      statusLabel: LETTER_STATUS_LABELS[row.status] ?? row.status,
      letterNumber: row.letter_number,
      submittedAt: row.submitted_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      timeline: this.buildPublicTimeline(
        {
          status: row.status,
          submittedAt: row.submitted_at,
          updatedAt: row.updated_at,
        },
        approvals,
      ),
    });
  }
}
