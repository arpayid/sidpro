import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { auditReportQuerySchema, financeReportQuerySchema } from '@sidpro/validators';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequireAllPermissions, RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { parseWithZod } from '../../common/utils/zod-validation.util';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions('reports.read')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getDashboard(user);
  }

  @Get('population/export')
  @RequireAllPermissions('reports.export', 'reports.population')
  exportPopulationReport(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.reportsService.exportPopulationReport(user, req.ip, res);
  }

  @Get('letters/export')
  @RequireAllPermissions('reports.export', 'reports.letters')
  exportLettersReport(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.reportsService.exportLettersReport(user, req.ip, res);
  }

  @Get('finance/export')
  @RequireAllPermissions('reports.export', 'reports.finance')
  exportFinanceReport(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res() res: Response,
    @Query('year') year?: string,
  ) {
    const query = parseWithZod(financeReportQuerySchema, { year });
    return this.reportsService.exportFinanceReport(user, req.ip, res, query.year);
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
    const query = parseWithZod(financeReportQuerySchema, { year });
    return this.reportsService.getFinanceReport(user, query.year);
  }

  @Get('audit')
  @RequirePermissions('audit.read')
  getAuditReport(@CurrentUser() user: JwtPayload, @Query('days') days?: string) {
    const query = parseWithZod(auditReportQuerySchema, { days });
    return this.reportsService.getAuditReport(user, query.days);
  }
}
