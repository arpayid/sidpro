import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { BumdesService } from './bumdes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('bumdes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BumdesController {
  constructor(private bumdesService: BumdesService) {}

  @Get('units')
  @RequirePermissions('bumdes.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.bumdesService.findAll(user, parseInt(page, 10), parseInt(limit, 10));
  }

  @Post('units')
  @RequirePermissions('bumdes.manage')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { name: string; code: string; businessType?: string; description?: string },
    @Req() req: Request,
  ) {
    return this.bumdesService.create(user, body, req.ip);
  }

  @Patch('units/:id')
  @RequirePermissions('bumdes.manage')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; businessType?: string; status?: string; description?: string },
    @Req() req: Request,
  ) {
    return this.bumdesService.update(user, id, body, req.ip);
  }

  @Delete('units/:id')
  @RequirePermissions('bumdes.manage')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.bumdesService.remove(user, id, req.ip);
  }

  @Get('financial-records')
  @RequirePermissions('bumdes.read')
  findAllFinancialRecords(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.bumdesService.findAllFinancialRecords(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post('financial-records')
  @RequirePermissions('bumdes.manage')
  createFinancialRecord(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      unitId: string;
      type: 'revenue' | 'expense';
      amount: number;
      description?: string;
      recordDate: string;
    },
    @Req() req: Request,
  ) {
    return this.bumdesService.createFinancialRecord(user, body, req.ip);
  }
}
