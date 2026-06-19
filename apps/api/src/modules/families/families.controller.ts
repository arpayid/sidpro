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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FamiliesService } from './families.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('families')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FamiliesController {
  constructor(private familiesService: FamiliesService) {}

  @Get()
  @RequirePermissions('families.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.familiesService.findAll(user, parseInt(page, 10), parseInt(limit, 10), search);
  }

  @Get('export')
  @RequirePermissions('families.export')
  exportFamilies(@CurrentUser() user: JwtPayload, @Req() req: Request, @Res() res: Response) {
    return this.familiesService.exportFamilies(user, req.ip, res);
  }

  @Get(':id')
  @RequirePermissions('families.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.familiesService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('families.create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      kkNumber: string;
      headResidentId?: string;
      addressId?: string;
      economicStatus?: string;
      houseStatus?: string;
      waterSource?: string;
      electricity?: string;
      sanitation?: string;
    },
    @Req() req: Request,
  ) {
    return this.familiesService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('families.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.familiesService.update(user, id, body, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('families.delete')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.familiesService.remove(user, id, req.ip);
  }

  @Post(':id/members')
  @RequirePermissions('families.update')
  addMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { residentId: string; relationship: string; isHead?: boolean },
    @Req() req: Request,
  ) {
    return this.familiesService.addMember(user, id, body, req.ip);
  }

  @Delete(':id/members/:memberId')
  @RequirePermissions('families.update')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Req() req: Request,
  ) {
    return this.familiesService.removeMember(user, id, memberId, req.ip);
  }
}
