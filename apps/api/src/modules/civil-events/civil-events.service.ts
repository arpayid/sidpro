import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../../core/audit-logs/audit-logs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

@Injectable()
export class CivilEventsService {
  constructor(
    private prisma: PrismaService,
    private auditLogs: AuditLogsService,
  ) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAll(user: JwtPayload, page = 1, limit = 20, eventType?: string) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      ...(eventType ? { eventType } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.civilEvent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { eventDate: 'desc' },
        include: { resident: { select: { id: true, fullName: true, nik: true } } },
      }),
      this.prisma.civilEvent.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async findOne(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const event = await this.prisma.civilEvent.findFirst({
      where: { id, tenantId },
      include: { resident: true },
    });
    if (!event) throw new NotFoundException('Peristiwa sipil tidak ditemukan');
    return successResponse(event);
  }

  async create(
    user: JwtPayload,
    body: { residentId: string; eventType: string; eventDate: string; notes?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);

    const event = await this.prisma.civilEvent.create({
      data: {
        tenantId,
        residentId: body.residentId,
        eventType: body.eventType,
        eventDate: new Date(body.eventDate),
        notes: body.notes,
      },
      include: { resident: { select: { id: true, fullName: true } } },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'create',
      module: 'civil-events',
      entityType: 'civil_event',
      entityId: event.id,
      ipAddress,
    });

    return successResponse(event, 'Peristiwa sipil berhasil dicatat');
  }

  async update(
    user: JwtPayload,
    id: string,
    body: { eventType?: string; eventDate?: string; notes?: string },
    ipAddress?: string,
  ) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.civilEvent.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Peristiwa sipil tidak ditemukan');

    const event = await this.prisma.civilEvent.update({
      where: { id },
      data: {
        ...(body.eventType ? { eventType: body.eventType } : {}),
        ...(body.eventDate ? { eventDate: new Date(body.eventDate) } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'update',
      module: 'civil-events',
      entityType: 'civil_event',
      entityId: id,
      ipAddress,
    });

    return successResponse(event, 'Peristiwa sipil berhasil diperbarui');
  }

  async remove(user: JwtPayload, id: string, ipAddress?: string) {
    const tenantId = this.requireTenant(user);
    const existing = await this.prisma.civilEvent.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Peristiwa sipil tidak ditemukan');

    await this.prisma.civilEvent.delete({ where: { id } });

    await this.auditLogs.log({
      tenantId,
      actorId: user.sub,
      action: 'delete',
      module: 'civil-events',
      entityType: 'civil_event',
      entityId: id,
      ipAddress,
    });

    return successResponse(null, 'Peristiwa sipil berhasil dihapus');
  }
}
