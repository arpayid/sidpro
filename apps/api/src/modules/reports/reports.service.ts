import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { successResponse } from '../../common/utils/response.util';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

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
    ] = await Promise.all([
      this.prisma.resident.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.family.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.letterRequest.count({ where: { tenantId } }),
      this.prisma.complaint.count({ where: { tenantId } }),
      this.prisma.aidProgram.count({ where: { tenantId } }),
      this.prisma.asset.count({ where: { tenantId } }),
      this.prisma.developmentProject.count({ where: { tenantId } }),
      this.prisma.budgetYear.count({ where: { tenantId } }),
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

    return successResponse({
      year: targetYear,
      budgetYear,
      byCategory,
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
}
