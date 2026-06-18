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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

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
  ) {
    return this.usersService.findAll(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
    );
  }

  @Get(':id')
  @RequirePermissions('users.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('users.create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      email: string;
      name: string;
      password: string;
      phone?: string;
      roleIds?: string[];
    },
    @Req() req: Request,
  ) {
    return this.usersService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      phone?: string;
      status?: string;
      password?: string;
      roleIds?: string[];
    },
    @Req() req: Request,
  ) {
    return this.usersService.update(user, id, body, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.usersService.remove(user, id, req.ip);
  }
}
