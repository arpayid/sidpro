import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import {
  createBudgetItemSchema,
  createBudgetRealizationEntrySchema,
  createBudgetYearSchema,
  createFinanceDocumentSchema,
  updateBudgetItemSchema,
} from '@sidpro/validators';

type BudgetRealizationEntryRow = {
  id: string;
  tenantId: string;
  budgetItemId: string;
  entryType: string;
  amount: Prisma.Decimal;
  description: string | null;
  reference: string | null;
  occurredAt: Date;
  createdBy: string | null;
  createdAt: Date;
};

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

  private normalizeLedgerEntry(entry: BudgetRealizationEntryRow) {
    return {
      ...entry,
      amount: Number(entry.amount),
    };
  }

  private isLedgerConstraintViolation(error: unknown): boolean {
    const candidate = error as {
      code?: unknown;
      meta?: { code?: unknown };
    };
    return candidate.code === 'P2010' && candidate.meta?.code === '23514';
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

  async findBudgetRealizationEntries(
    user: JwtPayload,
    budgetItemId: string,
    page = 1,
    limit = 20,
  ) {
    const tenantId = this.requireTenant(user);
    const item = await this.prisma.budgetItem.findFirst({
      where: { id: budgetItemId },
      include: { budgetYear: { select: { tenantId: true } } },
    });
    if (!item || item.budgetYear.tenantId !== tenantId) {
      throw new NotFoundException('Item anggaran tidak ditemukan');
    }

    const offset = (page - 1) * limit;
    const [entries, totals] = await Promise.all([
      this.prisma.$queryRaw<BudgetRealizationEntryRow[]>(Prisma.sql`
        SELECT
          id,
          tenant_id AS "tenantId",
          budget_item_id AS "budgetItemId",
          entry_type AS "entryType",
          amount,
          description,
          reference,
          occurred_at AS "occurredAt",
          created_by AS "createdBy",
          created_at AS "createdAt"
        FROM budget_realization_entries
        WHERE tenant_id = ${tenantId}
          AND budget_item_id = ${budgetItemId}
        ORDER BY occurred_at DESC, created_at DESC
        OFFSET ${offset}
        LIMIT ${limit}
      `),
      this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::integer AS total
        FROM budget_realization_entries
        WHERE tenant_id = ${tenantId}
          AND budget_item_id = ${budgetItemId}
      `),
    ]);

    return paginatedResponse(
      entries.map((entry) => this.normalizeLedgerEntry(entry)),
      page,
      limit,
      totals[0]?.total ?? 0,
    );
  }

  async createBudgetRealizationEntry(
    user: JwtPayload,
    budgetItemId: string,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createBudgetRealizationEntrySchema, body);
    const entryId = randomUUID();
    const occurredAt = parsed.occurredAt ? new Date(parsed.occurredAt) : new Date();
    const amount = new Prisma.Decimal(parsed.amount);

    try {
      const updatedItem = await this.prisma.$transaction(async (tx) => {
        const item = await tx.budgetItem.findFirst({
          where: { id: budgetItemId },
          include: { budgetYear: { select: { tenantId: true } } },
        });
        if (!item || item.budgetYear.tenantId !== tenantId) {
          throw new NotFoundException('Item anggaran tidak ditemukan');
        }

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO budget_realization_entries (
            id,
            tenant_id,
            budget_item_id,
            entry_type,
            amount,
            description,
            reference,
            occurred_at,
            created_by
          )
          VALUES (
            ${entryId},
            ${tenantId},
            ${budgetItemId},
            ${parsed.type},
            ${amount},
            ${parsed.description ?? null},
            ${parsed.reference ?? null},
            ${occurredAt},
            ${user.sub}
          )
        `);

        return tx.budgetItem.findUnique({ where: { id: budgetItemId } });
      });

      if (!updatedItem) {
        throw new NotFoundException('Item anggaran tidak ditemukan');
      }

      await this.auditLogs.log({
        tenantId,
        actorId: user.sub,
        action: 'create',
        module: 'finance',
        entityType: 'budget_realization_entry',
        entityId: entryId,
        metadata: {
          budgetItemId,
          type: parsed.type,
          amount: parsed.amount,
          reference: parsed.reference,
          occurredAt: occurredAt.toISOString(),
        },
        ipAddress,
      });

      return successResponse(
        {
          entry: {
            id: entryId,
            tenantId,
            budgetItemId,
            type: parsed.type,
            amount: parsed.amount,
            description: parsed.description ?? null,
            reference: parsed.reference ?? null,
            occurredAt,
            createdBy: user.sub,
          },
          budgetItem: updatedItem,
        },
        parsed.type === 'reversal'
          ? 'Pembatalan realisasi anggaran berhasil dicatat'
          : 'Realisasi anggaran berhasil dicatat',
      );
    } catch (error) {
      if (this.isLedgerConstraintViolation(error)) {
        throw new ConflictException(
          'Transaksi realisasi tidak dapat dicatat. Pembatalan tidak boleh melebihi realisasi saat ini.',
        );
      }
      throw error;
    }
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
