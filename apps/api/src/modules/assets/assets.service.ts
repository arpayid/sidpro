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
import { createAssetSchema, updateAssetSchema } from '@sidpro/validators';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAll(user: JwtPayload, page = 1, limit = 20, category?: string) {
    const tenantId = this.requireTenant(user);
    const where = { tenantId, ...(category ? { category } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.asset.count({ where }),
    ]);
    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const asset = await this.prisma.asset.findFirst({ where: { id, tenantId } });
    if (!asset) throw new NotFoundException('Aset tidak ditemukan');
    return successResponse(asset);
  }

  async create(
    user: JwtPayload,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const parsed = parseWithZod(createAssetSchema, body);
    const existing = await this.prisma.asset.findUnique({
      where: { tenantId_code: { tenantId, code: parsed.code } },
    });
    if (existing) throw new ConflictException('Kode aset sudah digunakan');

    const asset = await this.prisma.asset.create({
      data: {
        tenantId,
        name: parsed.name,
        code: parsed.code,
        category: parsed.category,
        condition: parsed.condition ?? 'good',
        location: parsed.location,
        value: parsed.value !== undefined ? new Prisma.Decimal(parsed.value) : null,
        description: parsed.description,
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'assets',
      entityType: 'asset',
      entityId: asset.id,
      ipAddress,
    });

    return successResponse(asset, 'Aset berhasil ditambahkan');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: unknown,
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.asset.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Aset tidak ditemukan');

    const data: Record<string, unknown> = { ...parseWithZod(updateAssetSchema, body) };
    if (typeof data.value === 'number') data.value = new Prisma.Decimal(data.value);

    const asset = await this.prisma.asset.update({ where: { id }, data });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'assets',
      entityType: 'asset',
      entityId: id,
      ipAddress,
    });

    return successResponse(asset, 'Aset berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.asset.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Aset tidak ditemukan');

    await this.prisma.asset.delete({ where: { id } });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'assets',
      entityType: 'asset',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'Aset berhasil dihapus');
  }
}
