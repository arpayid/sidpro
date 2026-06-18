import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(private auditLogs: AuditLogsService) {}

  @Get()
  @RequirePermissions('audit.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.auditLogs.findAll(user, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      module,
      action,
      actorId,
      entityType,
      entityId,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get(':id')
  @RequirePermissions('audit.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.auditLogs.findOne(user, id);
  }
}
