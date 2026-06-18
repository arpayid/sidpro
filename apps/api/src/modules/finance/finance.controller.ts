import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { FinanceService } from './finance.service';
import { Public, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Public()
  @Get('transparency')
  getTransparency(@Query('tenantCode') tenantCode: string, @Query('year') year?: string) {
    return this.financeService.getTransparency(
      tenantCode,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('budget-years')
  @RequirePermissions('finance.read')
  findBudgetYears(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.financeService.findBudgetYears(user, parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('budget-years')
  @RequirePermissions('finance.manage')
  createBudgetYear(
    @CurrentUser() user: JwtPayload,
    @Body() body: { year: number; totalBudget: number; status?: string },
    @Req() req: Request,
  ) {
    return this.financeService.createBudgetYear(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('budget-years/:budgetYearId/items')
  @RequirePermissions('finance.manage')
  createBudgetItem(
    @CurrentUser() user: JwtPayload,
    @Param('budgetYearId') budgetYearId: string,
    @Body() body: { category: string; name: string; planned: number; realized?: number },
    @Req() req: Request,
  ) {
    return this.financeService.createBudgetItem(user, budgetYearId, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('budget-items/:id')
  @RequirePermissions('finance.manage')
  updateBudgetItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { category?: string; name?: string; planned?: number; realized?: number },
    @Req() req: Request,
  ) {
    return this.financeService.updateBudgetItem(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('documents')
  @RequirePermissions('finance.read')
  findDocuments(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('year') year?: string,
  ) {
    return this.financeService.findDocuments(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
      year ? parseInt(year, 10) : undefined,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('documents')
  @RequirePermissions('finance.manage')
  createDocument(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { title: string; type: string; year?: number; fileId?: string; isPublic?: boolean },
    @Req() req: Request,
  ) {
    return this.financeService.createDocument(user, body, req.ip);
  }
}
