import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { successResponse } from '../../common/utils/response.util';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  private async resolveTenantId(tenantCode: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { code: tenantCode } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    return tenant.id;
  }

  async getStats(tenantCode: string) {
    const tenantId = await this.resolveTenantId(tenantCode);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [residents, families, lettersThisMonth, openComplaints] = await Promise.all([
      this.prisma.resident.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.family.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.letterRequest.count({
        where: { tenantId, submittedAt: { gte: monthStart } },
      }),
      this.prisma.complaint.count({
        where: { tenantId, status: { notIn: ['closed', 'rejected'] } },
      }),
    ]);

    return successResponse({
      residents,
      families,
      lettersThisMonth,
      openComplaints,
    });
  }
}
