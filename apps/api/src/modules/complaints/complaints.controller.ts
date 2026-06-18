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
  createPublic(@Query('tenantCode') tenantCode: string, @Body() body: unknown) {
    return this.complaintsService.createPublic(tenantCode, body);
  }

  @Public()
  @Post('public/track')
  trackPublic(@Query('tenantCode') tenantCode: string, @Body() body: unknown) {
    return this.complaintsService.trackPublic(tenantCode, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @RequirePermissions('complaints.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.complaintsService.findAll(user, parseInt(page, 10), parseInt(limit, 10), {
      status,
      priority,
      search,
      dateFrom,
      dateTo,
    });
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
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Req() req: Request) {
    return this.complaintsService.create(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/status')
  @RequirePermissions('complaints.update', 'complaints.close')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.complaintsService.updateStatus(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/assign')
  @RequirePermissions('complaints.assign')
  assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.complaintsService.assign(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/responses')
  @RequirePermissions('complaints.respond')
  addResponse(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.complaintsService.addResponse(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/respond')
  @RequirePermissions('complaints.respond')
  respond(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
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
