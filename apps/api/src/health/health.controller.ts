import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
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
