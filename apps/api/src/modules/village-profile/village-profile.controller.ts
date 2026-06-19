import { Controller, Get, Patch, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { VillageProfileService } from './village-profile.service';
import { Public, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('village-profile')
export class VillageProfileController {
  constructor(private villageProfileService: VillageProfileService) {}

  @Public()
  @Get()
  getPublic(@Query('tenantCode') tenantCode: string) {
    return this.villageProfileService.getPublic(tenantCode);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('manage')
  @RequirePermissions('settings.manage')
  getForAdmin(@CurrentUser() user: JwtPayload) {
    return this.villageProfileService.getForTenant(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch()
  @RequirePermissions('settings.manage')
  update(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name?: string;
      address?: string;
      province?: string;
      regency?: string;
      district?: string;
      postalCode?: string;
      vision?: string;
      mission?: string;
      description?: string;
      contactPhone?: string;
      contactEmail?: string;
    },
    @Req() req: Request,
  ) {
    return this.villageProfileService.update(user, body, req.ip);
  }
}
