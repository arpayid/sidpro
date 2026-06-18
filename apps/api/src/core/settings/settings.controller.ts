import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.manage')
  findAll(@CurrentUser() user: JwtPayload) {
    return this.settingsService.findAll(user);
  }

  @Get(':key')
  @RequirePermissions('settings.manage')
  findOne(@CurrentUser() user: JwtPayload, @Param('key') key: string) {
    return this.settingsService.findOne(user, key);
  }

  @Put(':key')
  @RequirePermissions('settings.manage')
  upsert(
    @CurrentUser() user: JwtPayload,
    @Param('key') key: string,
    @Body() body: { value: unknown },
    @Req() req: Request,
  ) {
    return this.settingsService.upsert(user, key, body.value, req.ip);
  }

  @Delete(':key')
  @RequirePermissions('settings.manage')
  remove(@CurrentUser() user: JwtPayload, @Param('key') key: string, @Req() req: Request) {
    return this.settingsService.remove(user, key, req.ip);
  }
}
