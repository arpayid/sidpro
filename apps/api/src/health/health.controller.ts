import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      success: true,
      message: 'OK',
      data: {
        status: 'healthy',
        service: 'sidpro-api',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
