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
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    this.tenantsService.assertAccess(user);
    return this.tenantsService.findAll(parseInt(page, 10), parseInt(limit, 10), search);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    this.tenantsService.assertAccess(user);
    return this.tenantsService.findOne(id);
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
    return this.tenantsService.update(user, id, body, req.ip);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.tenantsService.remove(user, id, req.ip);
  }
}
