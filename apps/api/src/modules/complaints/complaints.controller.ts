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
import { ComplaintsService } from './complaints.service';
import { Public, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('complaints')
export class ComplaintsController {
  constructor(private complaintsService: ComplaintsService) {}

  @Public()
  @Post('public')
  createPublic(
    @Query('tenantCode') tenantCode: string,
    @Body()
    body: {
      title: string;
      description: string;
      category: string;
      priority?: string;
      location?: string;
      reporterName?: string;
      reporterPhone?: string;
      reporterEmail?: string;
    },
  ) {
    return this.complaintsService.createPublic(tenantCode, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @RequirePermissions('complaints.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.complaintsService.findAll(user, parseInt(page, 10), parseInt(limit, 10), status);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  @RequirePermissions('complaints.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.complaintsService.findOne(user, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @RequirePermissions('complaints.create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      title: string;
      description: string;
      category: string;
      priority?: string;
      location?: string;
    },
    @Req() req: Request,
  ) {
    return this.complaintsService.create(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/assign')
  @RequirePermissions('complaints.assign')
  assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { assigneeId: string },
    @Req() req: Request,
  ) {
    return this.complaintsService.assign(user, id, body.assigneeId, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/respond')
  @RequirePermissions('complaints.respond')
  respond(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { response: string; status?: string },
    @Req() req: Request,
  ) {
    return this.complaintsService.respond(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/close')
  @RequirePermissions('complaints.close')
  close(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.complaintsService.close(user, id, req.ip);
  }
}
