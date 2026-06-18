import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { paginatedResponse, successResponse } from '../../common/utils/response.util';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private requireTenant(user: JwtPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant scope required');
    return user.tenantId;
  }

  async findAll(user: JwtPayload, page = 1, limit = 20, unreadOnly = false) {
    const tenantId = this.requireTenant(user);
    const where = {
      tenantId,
      userId: user.sub,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginatedResponse(data, page, limit, total);
  }

  async markRead(user: JwtPayload, id: string) {
    const tenantId = this.requireTenant(user);
    const notification = await this.prisma.notification.findFirst({
      where: { id, tenantId, userId: user.sub },
    });
    if (!notification) throw new NotFoundException('Notifikasi tidak ditemukan');

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return successResponse(updated, 'Notifikasi ditandai sudah dibaca');
  }

  async markAllRead(user: JwtPayload) {
    const tenantId = this.requireTenant(user);
    const result = await this.prisma.notification.updateMany({
      where: { tenantId, userId: user.sub, readAt: null },
      data: { readAt: new Date() },
    });

    return successResponse({ count: result.count }, 'Semua notifikasi ditandai sudah dibaca');
  }
}
