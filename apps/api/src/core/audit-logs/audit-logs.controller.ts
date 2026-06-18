import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { paginatedResponse } from '../../common/utils/response.util';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(
    private auditLogs: AuditLogsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @RequirePermissions('audit.read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('module') module?: string,
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const where = {
      ...(user.tenantId ? { tenantId: user.tenantId } : {}),
      ...(module ? { module } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginatedResponse(data, pageNum, limitNum, total);
  }
}
