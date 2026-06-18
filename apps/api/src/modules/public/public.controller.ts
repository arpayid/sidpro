import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Public()
  @Get('stats')
  getStats(@Query('tenantCode') tenantCode: string) {
    return this.publicService.getStats(tenantCode);
  }
}
