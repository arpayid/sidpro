import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { roleListQuerySchema, uuidSchema } from '@sidpro/validators';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const query = parseWithZod(roleListQuerySchema, { page, limit });
    return this.rolesService.findAll(user, query.page, query.limit);
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.rolesService.findOne(user, parseWithZod(uuidSchema, id));
  }

  @Post()
  @RequirePermissions('roles.create')
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Req() req: Request) {
    return this.rolesService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.rolesService.update(user, parseWithZod(uuidSchema, id), body, req.ip);
  }

  @Put(':id/permissions')
  @RequirePermissions('roles.assign_permissions')
  assignPermissions(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.rolesService.assignPermissions(user, parseWithZod(uuidSchema, id), body, req.ip);
  }
}
