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
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  @RequirePermissions('assets.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('category') category?: string,
  ) {
    return this.assetsService.findAll(user, parseInt(page, 10), parseInt(limit, 10), category);
  }

  @Get(':id')
  @RequirePermissions('assets.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.assetsService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('assets.manage')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      code: string;
      category: string;
      condition?: string;
      location?: string;
      value?: number;
      description?: string;
    },
    @Req() req: Request,
  ) {
    return this.assetsService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('assets.manage')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.assetsService.update(user, id, body, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('assets.manage')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.assetsService.remove(user, id, req.ip);
  }
}
