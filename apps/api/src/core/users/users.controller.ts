import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { parseWithZod } from '../../common/utils/zod-validation.util';
import { userListQuerySchema, uuidSchema } from '@sidpro/validators';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('roleId') roleId?: string,
  ) {
    const query = parseWithZod(userListQuerySchema, { page, limit, search, status, roleId });
    return this.usersService.findAll(
      user,
      query.page,
      query.limit,
      query.search,
      query.status,
      query.roleId,
    );
  }

  @Get(':id')
  @RequirePermissions('users.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.findOne(user, parseWithZod(uuidSchema, id));
  }

  @Post()
  @RequirePermissions('users.create')
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Req() req: Request) {
    return this.usersService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.usersService.update(user, parseWithZod(uuidSchema, id), body, req.ip);
  }

  @Patch(':id/status')
  @RequirePermissions('users.disable', 'users.update')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.usersService.updateStatus(user, parseWithZod(uuidSchema, id), body, req.ip);
  }

  @Put(':id/roles')
  @RequirePermissions('users.update')
  assignRoles(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.usersService.assignRoles(user, parseWithZod(uuidSchema, id), body, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.usersService.remove(user, parseWithZod(uuidSchema, id), req.ip);
  }
}
