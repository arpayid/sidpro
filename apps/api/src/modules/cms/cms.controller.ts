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
import { CmsService } from './cms.service';
import { Public, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('cms')
export class CmsController {
  constructor(private cmsService: CmsService) {}

  @Public()
  @Get('posts')
  findPublicPosts(
    @Query('tenantCode') tenantCode: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.cmsService.findPublicPosts(tenantCode, parseInt(page, 10), parseInt(limit, 10));
  }

  @Public()
  @Get('agendas')
  findPublicAgendas(
    @Query('tenantCode') tenantCode: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.cmsService.findPublicAgendas(tenantCode, parseInt(page, 10), parseInt(limit, 10));
  }

  @Public()
  @Get('gallery')
  findPublicGallery(
    @Query('tenantCode') tenantCode: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.cmsService.findPublicGallery(tenantCode, parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('admin/posts')
  @RequirePermissions('cms.read')
  findPosts(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.cmsService.findPosts(user, parseInt(page, 10), parseInt(limit, 10), status);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('admin/posts')
  @RequirePermissions('cms.manage')
  createPost(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      title: string;
      slug: string;
      content: string;
      excerpt?: string;
      category?: string;
      status?: string;
    },
    @Req() req: Request,
  ) {
    return this.cmsService.createPost(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('admin/posts/:id')
  @RequirePermissions('cms.manage')
  updatePost(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.cmsService.updatePost(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('admin/posts/:id')
  @RequirePermissions('cms.manage')
  removePost(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.cmsService.removePost(user, id, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('admin/agendas')
  @RequirePermissions('cms.read')
  findAgendas(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.cmsService.findAgendas(user, parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('admin/agendas')
  @RequirePermissions('cms.manage')
  createAgenda(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      title: string;
      description?: string;
      location?: string;
      startAt: string;
      endAt?: string;
      status?: string;
    },
    @Req() req: Request,
  ) {
    return this.cmsService.createAgenda(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('admin/agendas/:id')
  @RequirePermissions('cms.manage')
  updateAgenda(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.cmsService.updateAgenda(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('admin/agendas/:id')
  @RequirePermissions('cms.manage')
  removeAgenda(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.cmsService.removeAgenda(user, id, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('admin/gallery')
  @RequirePermissions('cms.read')
  findGallery(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.cmsService.findGallery(user, parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('admin/gallery')
  @RequirePermissions('cms.manage')
  createGalleryItem(
    @CurrentUser() user: JwtPayload,
    @Body() body: { title: string; description?: string; fileId?: string; type?: string },
    @Req() req: Request,
  ) {
    return this.cmsService.createGalleryItem(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('admin/gallery/:id')
  @RequirePermissions('cms.manage')
  removeGalleryItem(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.cmsService.removeGalleryItem(user, id, req.ip);
  }
}
