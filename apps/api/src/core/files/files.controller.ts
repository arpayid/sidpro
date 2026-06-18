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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Get()
  @RequirePermissions('settings.manage', 'complaints.read')
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

  @Post('upload')
  @RequirePermissions(
    'settings.manage',
    'complaints.create',
    'complaints.update',
    'letters.create',
    'population.import',
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Tipe file tidak diizinkan'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Body() body: { ownerType?: string; ownerId?: string },
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('File wajib diunggah');
    }
    return this.filesService.upload(user, file, body, req.ip);
  }

  @Get(':id/download')
  @RequirePermissions(
    'settings.manage',
    'complaints.read',
    'complaints.create',
    'letters.create',
    'population.import',
  )
  download(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.filesService.getDownloadUrl(user, id);
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
