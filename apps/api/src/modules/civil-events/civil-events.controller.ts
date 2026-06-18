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
import { CivilEventsService } from './civil-events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('civil-events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CivilEventsController {
  constructor(private civilEventsService: CivilEventsService) {}

  @Get()
  @RequirePermissions('population.read')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('eventType') eventType?: string,
  ) {
    return this.civilEventsService.findAll(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
      eventType,
    );
  }

  @Get(':id')
  @RequirePermissions('population.read')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.civilEventsService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('population.create')
  create(
    @CurrentUser() user: JwtPayload,
    @Body() body: { residentId: string; eventType: string; eventDate: string; notes?: string },
    @Req() req: Request,
  ) {
    return this.civilEventsService.create(user, body, req.ip);
  }

  @Patch(':id')
  @RequirePermissions('population.update')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { eventType?: string; eventDate?: string; notes?: string },
    @Req() req: Request,
  ) {
    return this.civilEventsService.update(user, id, body, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('population.delete')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.civilEventsService.remove(user, id, req.ip);
  }
}
