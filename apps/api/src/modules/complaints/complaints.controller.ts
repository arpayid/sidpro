import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import { ComplaintsService } from './complaints.service';
import { FilesService } from '../../core/files/files.service';
import { Public, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

const PUBLIC_UPLOAD_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const PUBLIC_UPLOAD_MAX = 5 * 1024 * 1024;

@Controller('complaints')
export class ComplaintsController {
  constructor(
    private complaintsService: ComplaintsService,
    private filesService: FilesService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: PUBLIC_UPLOAD_MAX },
      fileFilter: (_req, file, cb) => {
        if (!PUBLIC_UPLOAD_MIME.includes(file.mimetype)) {
          cb(new BadRequestException('Tipe file tidak diizinkan'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadPublic(
    @Query('tenantCode') tenantCode: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('File wajib diunggah');
    const tenantId = await this.complaintsService.resolveTenantIdForUpload(tenantCode);
    return this.filesService.uploadPublic(tenantId, file, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public')
  createPublic(@Query('tenantCode') tenantCode: string, @Body() body: unknown) {
    return this.complaintsService.createPublic(tenantCode, body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public/track')
  trackPublic(@Query('tenantCode') tenantCode: string, @Body() body: unknown) {
    return this.complaintsService.trackPublic(tenantCode, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('sla-stats')
  @RequirePermissions('complaints.read')
  getSlaStats(@CurrentUser() user: JwtPayload) {
    return this.complaintsService.getSlaStats(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('export')
  @RequirePermissions('complaints.read')
  exportCsv(@CurrentUser() user: JwtPayload, @Req() req: Request, @Res() res: Response) {
    return this.complaintsService.exportCsv(user, req.ip, res);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  @RequirePermissions('complaints.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.complaintsService.findAll(user, parseInt(page, 10), parseInt(limit, 10), {
      status,
      priority,
      search,
      dateFrom,
      dateTo,
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  @RequirePermissions('complaints.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.complaintsService.findOne(user, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  @RequirePermissions('complaints.create')
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown, @Req() req: Request) {
    return this.complaintsService.create(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/status')
  @RequirePermissions('complaints.update', 'complaints.close')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.complaintsService.updateStatus(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/assign')
  @RequirePermissions('complaints.assign')
  assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.complaintsService.assign(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/responses')
  @RequirePermissions('complaints.respond')
  addResponse(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.complaintsService.addResponse(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/respond')
  @RequirePermissions('complaints.respond')
  respond(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.complaintsService.respond(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/close')
  @RequirePermissions('complaints.close')
  close(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.complaintsService.close(user, id, body, req.ip);
  }
}
