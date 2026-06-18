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
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.rolesService.findAll(user, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.rolesService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('roles.create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: { name: string; code: string; scope?: string; permissionIds?: string[] },
    @Req() req: Request,
  ) {
    return this.rolesService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; permissionIds?: string[] },
    @Req() req: Request,
  ) {
    return this.rolesService.update(user, id, body, req.ip);
  }
}
