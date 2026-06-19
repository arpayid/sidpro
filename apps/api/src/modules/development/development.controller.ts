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
import { DevelopmentService } from './development.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions, Public } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('development')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DevelopmentController {
  constructor(private developmentService: DevelopmentService) {}

  @Public()
  @Get('public/projects')
  findPublicProjects(
    @Query('tenantCode') tenantCode: string,
    @Query('limit') limit = '20',
  ) {
    return this.developmentService.findPublicProjects(tenantCode, parseInt(limit, 10));
  }

  @Get('projects')
  @RequirePermissions('development.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.developmentService.findAll(user, parseInt(page, 10), parseInt(limit, 10), status);
  }

  @Get('projects/:id')
  @RequirePermissions('development.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.developmentService.findOne(user, id);
  }

  @Post('projects')
  @RequirePermissions('development.manage')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      location?: string;
      budget?: number;
      fundingSource?: string;
      status?: string;
      progress?: number;
      startDate?: string;
      endDate?: string;
    },
    @Req() req: Request,
  ) {
    return this.developmentService.create(user, body, req.ip);
  }

  @Patch('projects/:id')
  @RequirePermissions('development.manage')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.developmentService.update(user, id, body, req.ip);
  }

  @Delete('projects/:id')
  @RequirePermissions('development.manage')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.developmentService.remove(user, id, req.ip);
  }
}
