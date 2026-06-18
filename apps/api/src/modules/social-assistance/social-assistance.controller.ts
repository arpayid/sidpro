import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SocialAssistanceService } from './social-assistance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('social-assistance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SocialAssistanceController {
  constructor(private socialAssistanceService: SocialAssistanceService) {}

  @Get('programs')
  @RequirePermissions('aid.read')
  findPrograms(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.socialAssistanceService.findPrograms(user, parseInt(page, 10), parseInt(limit, 10));
  }

  @Post('programs')
  @RequirePermissions('aid.manage')
  createProgram(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      code: string;
      description?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    @Req() req: Request,
  ) {
    return this.socialAssistanceService.createProgram(user, body, req.ip);
  }

  @Patch('programs/:id')
  @RequirePermissions('aid.manage')
  updateProgram(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.socialAssistanceService.updateProgram(user, id, body, req.ip);
  }

  @Get('programs/:programId/recipients')
  @RequirePermissions('aid.read')
  findRecipients(
    @CurrentUser() user: JwtPayload,
    @Param('programId') programId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.socialAssistanceService.findRecipients(
      user,
      programId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post('programs/:programId/recipients')
  @RequirePermissions('aid.manage')
  addRecipient(
    @CurrentUser() user: JwtPayload,
    @Param('programId') programId: string,
    @Body()
    body: {
      residentId?: string;
      familyId?: string;
      status?: string;
      amount?: number;
      notes?: string;
    },
    @Req() req: Request,
  ) {
    return this.socialAssistanceService.addRecipient(user, programId, body, req.ip);
  }

  @Patch('recipients/:id')
  @RequirePermissions('aid.manage')
  updateRecipient(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { status?: string; amount?: number; notes?: string },
    @Req() req: Request,
  ) {
    return this.socialAssistanceService.updateRecipient(user, id, body, req.ip);
  }
}
