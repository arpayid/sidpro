import { Injectable, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { successResponse } from '../../common/utils/response.util';
import { sendXlsxDownload } from '../../common/utils/spreadsheet.util';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async getDashboard(user: JwtPayload) {
    const tenantId = this.requireTenant(user);

    const [
      residents,
      families,
      letterRequests,
      complaints,
      aidPrograms,
      assets,
      developmentProjects,
      budgetYears,
      recentAuditLogs,
      recentPendingLetters,
      recentOpenComplaints,
    ] = await Promise.all([
      this.prisma.resident.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.family.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.letterRequest.count({ where: { tenantId } }),
      this.prisma.complaint.count({ where: { tenantId } }),
      this.prisma.aidProgram.count({ where: { tenantId } }),
      this.prisma.asset.count({ where: { tenantId } }),
      this.prisma.developmentProject.count({ where: { tenantId } }),
      this.prisma.budgetYear.count({ where: { tenantId } }),
      this.prisma.auditLog.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true, email: true } } },
      }),
      this.prisma.letterRequest.findMany({
        where: { tenantId, status: { in: ['submitted', 'verified'] } },
        take: 5,
        orderBy: { submittedAt: 'desc' },
        include: {
          letterType: { select: { name: true } },
          resident: { select: { fullName: true } },
        },
      }),
      this.prisma.complaint.findMany({
        where: { tenantId, status: { notIn: ['closed', 'rejected'] } },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const [pendingLetters, openComplaints] = await Promise.all([
      this.prisma.letterRequest.count({
        where: { tenantId, status: { in: ['submitted', 'verified'] } },
      }),
      this.prisma.complaint.count({
        where: { tenantId, status: { notIn: ['closed', 'rejected'] } },
      }),
    ]);

    return successResponse({
      residents,
      families,
      letterRequests,
      pendingLetters,
      complaints,
      openComplaints,
      aidPrograms,
      assets,
      developmentProjects,
      budgetYears,
      recentActivity: {
        auditLogs: recentAuditLogs,
        pendingLetters: recentPendingLetters,
        openComplaints: recentOpenComplaints,
      },
    });
  }

  async getPopulationReport(user: JwtPayload) {
    const tenantId = this.requireTenant(user);

    const [byGender, byStatus, recentEvents] = await Promise.all([
      this.prisma.resident.groupBy({
        by: ['gender'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.resident.groupBy({
        by: ['residentStatus'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.civilEvent.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { eventDate: 'desc' },
        include: { resident: { select: { fullName: true } } },
      }),
    ]);

    return successResponse({ byGender, byStatus, recentEvents });
  }

  async getLettersReport(user: JwtPayload) {
    const tenantId = this.requireTenant(user);

    const [byStatus, byType, recent] = await Promise.all([
      this.prisma.letterRequest.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.prisma.letterRequest.groupBy({
        by: ['letterTypeId'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.prisma.letterRequest.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { submittedAt: 'desc' },
        include: { letterType: { select: { name: true } } },
      }),
    ]);

    return successResponse({ byStatus, byType, recent });
  }

  async getFinanceReport(user: JwtPayload, year?: number) {
    const tenantId = this.requireTenant(user);
    const targetYear = year ?? new Date().getFullYear();

    const budgetYear = await this.prisma.budgetYear.findUnique({
      where: { tenantId_year: { tenantId, year: targetYear } },
      include: { items: true },
    });

    const byCategory = budgetYear?.items.reduce(
      (acc, item) => {
        const cat = item.category;
        if (!acc[cat]) acc[cat] = { planned: 0, realized: 0 };
        acc[cat].planned += Number(item.planned);
        acc[cat].realized += Number(item.realized);
        return acc;
      },
      {} as Record<string, { planned: number; realized: number }>,
    );

    const totalPlanned = budgetYear?.items.reduce((sum, item) => sum + Number(item.planned), 0) ?? 0;
    const totalRealized = budgetYear?.items.reduce((sum, item) => sum + Number(item.realized), 0) ?? 0;

    return successResponse({
      year: targetYear,
      budgetYear,
      byCategory,
      summary: {
        totalBudget: budgetYear ? Number(budgetYear.totalBudget) : 0,
        totalPlanned,
        totalRealized,
        absorptionRate: totalPlanned > 0 ? Math.round((totalRealized / totalPlanned) * 100) : 0,
      },
    });
  }

  async getAuditReport(user: JwtPayload, days = 30) {
    const tenantId = this.requireTenant(user);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [byModule, byAction, recent] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['module'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { id: true },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { tenantId, createdAt: { gte: since } },
        _count: { id: true },
      }),
      this.prisma.auditLog.findMany({
        where: { tenantId, createdAt: { gte: since } },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true, email: true } } },
      }),
    ]);

    return successResponse({ periodDays: days, byModule, byAction, recent });
  }

  async exportPopulationReport(user: JwtPayload, ipAddress: string | undefined, res: Response) {
    const tenantId = this.requireTenant(user);

    const [byGender, byStatus, civilEvents] = await Promise.all([
      this.prisma.resident.groupBy({
        by: ['gender'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.resident.groupBy({
        by: ['residentStatus'],
        where: { tenantId, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.civilEvent.findMany({
        where: { tenantId },
        orderBy: { eventDate: 'desc' },
        include: { resident: { select: { fullName: true } } },
      }),
    ]);

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'export',
      module: 'reports',
      entityType: 'report',
      metadata: { reportType: 'population', civilEventCount: civilEvents.length },
      ipAddress,
    });

    await sendXlsxDownload(
      res,
      [
        {
          name: 'Jenis Kelamin',
          rows: byGender.map((row) => ({
            jenisKelamin: row.gender,
            jumlah: row._count.id,
          })),
        },
        {
          name: 'Status Penduduk',
          rows: byStatus.map((row) => ({
            status: row.residentStatus,
            jumlah: row._count.id,
          })),
        },
        {
          name: 'Peristiwa Sipil',
          rows: civilEvents.map((event) => ({
            tanggal: event.eventDate.toISOString().split('T')[0],
            jenis: event.eventType,
            penduduk: event.resident?.fullName ?? '',
            keterangan: event.notes ?? '',
          })),
        },
      ],
      'laporan-kependudukan.xlsx',
    );
  }

  async exportLettersReport(user: JwtPayload, ipAddress: string | undefined, res: Response) {
    const tenantId = this.requireTenant(user);

    const [byStatus, byType, requests, letterTypes] = await Promise.all([
      this.prisma.letterRequest.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.prisma.letterRequest.groupBy({
        by: ['letterTypeId'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.prisma.letterRequest.findMany({
        where: { tenantId },
        orderBy: { submittedAt: 'desc' },
        include: {
          letterType: { select: { name: true } },
          resident: { select: { fullName: true } },
        },
      }),
      this.prisma.letterType.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    const typeNames = new Map(letterTypes.map((type) => [type.id, type.name]));

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'export',
      module: 'reports',
      entityType: 'report',
      metadata: { reportType: 'letters', requestCount: requests.length },
      ipAddress,
    });

    await sendXlsxDownload(
      res,
      [
        {
          name: 'Ringkasan Status',
          rows: byStatus.map((row) => ({
            status: row.status,
            jumlah: row._count.id,
          })),
        },
        {
          name: 'Ringkasan Jenis',
          rows: byType.map((row) => ({
            jenisSurat: typeNames.get(row.letterTypeId) ?? row.letterTypeId,
            jumlah: row._count.id,
          })),
        },
        {
          name: 'Daftar Permohonan',
          rows: requests.map((request) => ({
            nomorSurat: request.letterNumber ?? '',
            jenisSurat: request.letterType.name,
            pemohon: request.resident?.fullName ?? '',
            status: request.status,
            keperluan: request.purpose,
            tanggalAjuan: request.submittedAt.toISOString().split('T')[0],
          })),
        },
      ],
      'laporan-surat.xlsx',
    );
  }

  async exportFinanceReport(
    user: JwtPayload,
    ipAddress: string | undefined,
    res: Response,
    year?: number,
  ) {
    const tenantId = this.requireTenant(user);
    const targetYear = year ?? new Date().getFullYear();

    const budgetYear = await this.prisma.budgetYear.findUnique({
      where: { tenantId_year: { tenantId, year: targetYear } },
      include: { items: true },
    });

    const items = budgetYear?.items ?? [];
    const byCategory = items.reduce(
      (acc, item) => {
        const cat = item.category;
        if (!acc[cat]) acc[cat] = { planned: 0, realized: 0 };
        acc[cat].planned += Number(item.planned);
        acc[cat].realized += Number(item.realized);
        return acc;
      },
      {} as Record<string, { planned: number; realized: number }>,
    );

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'export',
      module: 'reports',
      entityType: 'report',
      metadata: { reportType: 'finance', year: targetYear, itemCount: items.length },
      ipAddress,
    });

    await sendXlsxDownload(
      res,
      [
        {
          name: `Anggaran ${targetYear}`,
          rows: items.map((item) => ({
            kategori: item.category,
            uraian: item.name,
            anggaran: Number(item.planned),
            realisasi: Number(item.realized),
          })),
        },
        {
          name: 'Per Kategori',
          rows: Object.entries(byCategory).map(([category, totals]) => ({
            kategori: category,
            anggaran: totals.planned,
            realisasi: totals.realized,
            serapan:
              totals.planned > 0
                ? `${Math.round((totals.realized / totals.planned) * 100)}%`
                : '0%',
          })),
        },
      ],
      `laporan-keuangan-${targetYear}.xlsx`,
    );
  }
}
