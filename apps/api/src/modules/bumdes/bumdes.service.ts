import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { createBumdesBusinessSchema, createBumdesFinancialRecordSchema, updateBumdesBusinessSchema } from '@sidpro/validators';

@Injectable()
export class BumdesService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAll(user: JwtPayload, page = 1, limit = 20) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.bumdesUnit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.bumdesUnit.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async create(
    user: JwtPayload,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createBumdesBusinessSchema, body);
    const existing = await this.prisma.bumdesUnit.findUnique({
      where: { tenantId_code: { tenantId, code: parsed.code } },
    });
    if (existing) throw new ConflictException('Kode unit BUMDes sudah digunakan');

    const unit = await this.prisma.bumdesUnit.create({
      data: {
        tenantId,
        name: parsed.name,
        code: parsed.code,
        businessType: parsed.businessType,
        description: parsed.description,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'bumdes',
      entityType: 'bumdes_unit',
      entityId: unit.id,
      ipAddress,
    });

    return successResponse(unit, 'Unit BUMDes berhasil ditambahkan');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(updateBumdesBusinessSchema, body);
    const existing = await this.prisma.bumdesUnit.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Unit BUMDes tidak ditemukan');

    const unit = await this.prisma.bumdesUnit.update({ where: { id }, data: parsed });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'bumdes',
      entityType: 'bumdes_unit',
      entityId: id,
      ipAddress,
    });

    return successResponse(unit, 'Unit BUMDes berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.bumdesUnit.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Unit BUMDes tidak ditemukan');

    await this.prisma.bumdesUnit.delete({ where: { id } });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'bumdes',
      entityType: 'bumdes_unit',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'Unit BUMDes berhasil dihapus');
  }

  async findAllFinancialRecords(user: JwtPayload, page = 1, limit = 20) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId };
    const [data, total] = await Promise.all([
      this.prisma.bumdesFinancialRecord.findMany({
        where,
        include: { unit: { select: { id: true, name: true, code: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { recordDate: 'desc' },
      }),
      this.prisma.bumdesFinancialRecord.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async createFinancialRecord(
    user: JwtPayload,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createBumdesFinancialRecordSchema, body);
    const unit = await this.prisma.bumdesUnit.findFirst({
      where: { id: parsed.unitId, tenantId },
    });
    if (!unit) throw new NotFoundException('Unit BUMDes tidak ditemukan');
    if (!['revenue', 'expense'].includes(parsed.type)) {
      throw new ConflictException('Tipe transaksi harus revenue atau expense');
    }

    const record = await this.prisma.bumdesFinancialRecord.create({
      data: {
        tenantId,
        unitId: parsed.unitId,
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        recordDate: new Date(parsed.recordDate),
      },
      include: { unit: { select: { id: true, name: true, code: true } } },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'bumdes',
      entityType: 'bumdes_financial_record',
      entityId: record.id,
      ipAddress,
    });

    return successResponse(record, 'Transaksi BUMDes berhasil dicatat');
  }
}
