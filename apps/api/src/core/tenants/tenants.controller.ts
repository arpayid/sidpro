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
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { tenantListQuerySchema, uuidSchema } from '@sidpro/validators';

@Controller('tenants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('regency/overview')
  @RequirePermissions('tenants.regency_overview')
  getRegencyOverview(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getRegencyOverview(user);
  }

  @Get('district/overview')
  @RequirePermissions('tenants.district_overview')
  getDistrictOverview(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getDistrictOverview(user);
  }

  @Get('villages/:id/summary')
  @RequirePermissions('tenants.regency_overview')
  getVillageSummary(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tenantsService.getVillageSummary(user, parseWithZod(uuidSchema, id));
  }

  @Get('provision/parents')
  getProvisionParents(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getProvisionParents(user);
  }

  @Post('provision/village')
  provisionVillage(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      code: string;
      parentId: string;
      villageCode?: string;
      adminEmail?: string;
      adminName?: string;
    },
    @Req() req: Request,
  ) {
    return this.tenantsService.provisionVillage(user, body, req.ip);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    this.tenantsService.assertAccess(user);
    const query = parseWithZod(tenantListQuerySchema, { page, limit, search });
    return this.tenantsService.findAll(query.page, query.limit, query.search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.tenantsService.assertAccess(user);
    return this.tenantsService.findOne(parseWithZod(uuidSchema, id));
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name: string; code: string; status?: string },
    @Req() req: Request,
  ) {
    return this.tenantsService.create(user, body, req.ip);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; status?: string },
    @Req() req: Request,
  ) {
    return this.tenantsService.update(user, parseWithZod(uuidSchema, id), body, req.ip);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.tenantsService.remove(user, parseWithZod(uuidSchema, id), req.ip);
  }
}
