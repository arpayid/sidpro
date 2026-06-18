import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('reports.read')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getDashboard(user);
  }

  @Get('population')
  @RequirePermissions('reports.population')
  getPopulationReport(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getPopulationReport(user);
  }

  @Get('letters')
  @RequirePermissions('reports.letters')
  getLettersReport(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getLettersReport(user);
  }

  @Get('finance')
  @RequirePermissions('reports.finance')
  getFinanceReport(@CurrentUser() user: JwtPayload, @Query('year') year?: string) {
    return this.reportsService.getFinanceReport(
      user,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get('audit')
  @RequirePermissions('audit.read')
  getAuditReport(@CurrentUser() user: JwtPayload, @Query('days') days = '30') {
    return this.reportsService.getAuditReport(user, parseInt(days, 10));
  }
}
