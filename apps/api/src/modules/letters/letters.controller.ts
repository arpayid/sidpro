import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { LettersService } from './letters.service';
import { Public, RequirePermissions } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller()
export class LettersController {
  constructor(private lettersService: LettersService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('letters/settings')
  @RequirePermissions('letters.manage')
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.lettersService.getSettings(user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Put('letters/settings')
  @RequirePermissions('letters.manage')
  updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      signatory: { name: string; title: string };
      pdf: { maskNik: boolean };
      header: {
        useCustom: boolean;
        name?: string;
        address?: string;
        province?: string;
        regency?: string;
        district?: string;
      };
    },
    @Req() req: Request,
  ) {
    return this.lettersService.updateSettings(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('letter-templates/:id')
  @RequirePermissions('letters.manage')
  updateTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; content?: string; isActive?: boolean },
    @Req() req: Request,
  ) {
    return this.lettersService.updateTemplate(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('letter-types')
  @RequirePermissions('letters.read', 'letters.create')
  findLetterTypes(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.lettersService.findLetterTypes(user, parseInt(page, 10), parseInt(limit, 10));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('letter-types')
  @RequirePermissions('letters.manage')
  createLetterType(
    @CurrentUser() user: JwtPayload,
    @Body() body: { code: string; name: string; requiredFields?: object; requiredFiles?: object },
    @Req() req: Request,
  ) {
    return this.lettersService.createLetterType(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('letter-templates')
  @RequirePermissions('letters.read')
  findTemplates(
    @CurrentUser() user: JwtPayload,
    @Query('letterTypeId') letterTypeId?: string,
  ) {
    return this.lettersService.findTemplates(user, letterTypeId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('letter-templates')
  @RequirePermissions('letters.manage')
  createTemplate(
    @CurrentUser() user: JwtPayload,
    @Body() body: { letterTypeId: string; name: string; content: string },
    @Req() req: Request,
  ) {
    return this.lettersService.createTemplate(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('letter-requests')
  @RequirePermissions('letters.read')
  findRequests(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.lettersService.findRequests(user, parseInt(page, 10), parseInt(limit, 10), status);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('letter-requests/:id')
  @RequirePermissions('letters.read')
  findRequest(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.lettersService.findRequest(user, id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('letter-requests')
  @RequirePermissions('letters.create')
  createRequest(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      letterTypeId: string;
      residentId?: string;
      applicantNik?: string;
      purpose: string;
      formData?: Record<string, unknown>;
    },
    @Req() req: Request,
  ) {
    return this.lettersService.createRequest(user, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('letter-requests/:id/verify')
  @RequirePermissions('letters.verify')
  verify(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { notes?: string; approved: boolean },
    @Req() req: Request,
  ) {
    return this.lettersService.verify(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('letter-requests/:id/approve')
  @RequirePermissions('letters.approve')
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { notes?: string; approved: boolean },
    @Req() req: Request,
  ) {
    return this.lettersService.approve(user, id, body, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('letter-requests/:id/reject')
  @RequirePermissions('letters.reject')
  reject(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { notes?: string },
    @Req() req: Request,
  ) {
    return this.lettersService.reject(user, id, body.notes, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('letter-requests/:id/generate-pdf')
  @RequirePermissions('letters.generate')
  generatePdf(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.lettersService.generatePdf(user, id, req.ip);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('letter-requests/:id/download')
  @RequirePermissions('letters.download')
  download(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.lettersService.download(user, id, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('letters/verify/:qrCode')
  verifyByQr(@Param('qrCode') qrCode: string, @Req() req: Request) {
    return this.lettersService.verifyByQr(qrCode, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('letters/public/track')
  trackPublic(@Query('tenantCode') tenantCode: string, @Body() body: unknown) {
    return this.lettersService.trackPublic(tenantCode, body);
  }
}
