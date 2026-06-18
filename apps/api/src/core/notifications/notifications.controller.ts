import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findAll(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
      unreadOnly === 'true',
    );
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user, id);
  }
}
