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
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Get()
  @RequirePermissions('settings.manage')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('ownerType') ownerType?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.filesService.findAll(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
      ownerType,
      ownerId,
    );
  }

  @Get(':id')
  @RequirePermissions('settings.manage')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.filesService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('settings.manage')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      ownerType: string;
      ownerId?: string;
      path: string;
      mimeType: string;
      size: number;
      checksum?: string;
    },
    @Req() req: Request,
  ) {
    return this.filesService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('settings.manage')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { ownerType?: string; ownerId?: string; path?: string },
    @Req() req: Request,
  ) {
    return this.filesService.update(user, id, body, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('settings.manage')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.filesService.remove(user, id, req.ip);
  }
}
