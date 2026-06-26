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
import { createBudgetItemSchema, createBudgetYearSchema, createFinanceDocumentSchema, updateBudgetItemSchema } from '@sidpro/validators';

@Injectable()
export class FinanceService {
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

  async findBudgetYears(user: JwtPayload, page = 1, limit = 20) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.budgetYear.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { year: 'desc' },
        include: { items: true },
      }),
      this.prisma.budgetYear.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async createBudgetYear(
    user: JwtPayload,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createBudgetYearSchema, body);
    const existing = await this.prisma.budgetYear.findUnique({
      where: { tenantId_year: { tenantId, year: parsed.year } },
    });
    if (existing) throw new ConflictException('Tahun anggaran sudah ada');

    const budgetYear = await this.prisma.budgetYear.create({
      data: {
        tenantId,
        year: parsed.year,
        totalBudget: new Prisma.Decimal(parsed.totalBudget),
        status: parsed.status ?? 'draft',
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'finance',
      entityType: 'budget_year',
      entityId: budgetYear.id,
      ipAddress,
    });

    return successResponse(budgetYear, 'Tahun anggaran berhasil dibuat');
  }

  async createBudgetItem(
    user: JwtPayload,
    budgetYearId: string,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createBudgetItemSchema, body);
    const budgetYear = await this.prisma.budgetYear.findFirst({
      where: { id: budgetYearId, tenantId },
    });
    if (!budgetYear) throw new NotFoundException('Tahun anggaran tidak ditemukan');

    const item = await this.prisma.budgetItem.create({
      data: {
        budgetYearId,
        category: parsed.category,
        name: parsed.name,
        planned: new Prisma.Decimal(parsed.planned),
        realized: new Prisma.Decimal(parsed.realized ?? 0),
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'finance',
      entityType: 'budget_item',
      entityId: item.id,
      ipAddress,
    });

    return successResponse(item, 'Item anggaran berhasil ditambahkan');
  }

  async updateBudgetItem(
    user: JwtPayload,
    id: string,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(updateBudgetItemSchema, body);
    const item = await this.prisma.budgetItem.findFirst({
      where: { id },
      include: { budgetYear: true },
    });
    if (!item || item.budgetYear.tenantId !== tenantId) {
      throw new NotFoundException('Item anggaran tidak ditemukan');
    }

    const updated = await this.prisma.budgetItem.update({
      where: { id },
      data: {
        ...(parsed.category ? { category: parsed.category } : {}),
        ...(parsed.name ? { name: parsed.name } : {}),
        ...(parsed.planned !== undefined ? { planned: new Prisma.Decimal(parsed.planned) } : {}),
        ...(parsed.realized !== undefined ? { realized: new Prisma.Decimal(parsed.realized) } : {}),
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'finance',
      entityType: 'budget_item',
      entityId: id,
      ipAddress,
    });

    return successResponse(updated, 'Item anggaran berhasil diperbarui');
  }

  async findDocuments(user: JwtPayload, page = 1, limit = 20, year?: number) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId, ...(year ? { year } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.financeDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.financeDocument.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async createDocument(
    user: JwtPayload,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createFinanceDocumentSchema, body);
    const document = await this.prisma.financeDocument.create({
      data: { tenantId, ...parsed },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'finance',
      entityType: 'finance_document',
      entityId: document.id,
      ipAddress,
    });

    return successResponse(document, 'Dokumen keuangan berhasil ditambahkan');
  }

  async getTransparency(tenantCode: string, year?: number) {
    const tenantId = await this.resolveTenantId(tenantCode);
    const currentYear = year ?? new Date().getFullYear();

    const [budgetYear, documents] = await Promise.all([
      this.prisma.budgetYear.findUnique({
        where: { tenantId_year: { tenantId, year: currentYear } },
        include: { items: true },
      }),
      this.prisma.financeDocument.findMany({
        where: { tenantId, isPublic: true, ...(year ? { year } : {}) },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, year: true, createdAt: true },
      }),
    ]);

    const totalPlanned = budgetYear?.items.reduce(
      (sum, item) => sum + Number(item.planned),
      0,
    ) ?? 0;
    const totalRealized = budgetYear?.items.reduce(
      (sum, item) => sum + Number(item.realized),
      0,
    ) ?? 0;

    return successResponse({
      year: currentYear,
      budgetYear,
      summary: {
        totalBudget: budgetYear ? Number(budgetYear.totalBudget) : 0,
        totalPlanned,
        totalRealized,
        absorptionRate: totalPlanned > 0 ? Math.round((totalRealized / totalPlanned) * 100) : 0,
      },
      publicDocuments: documents,
    });
  }
}
