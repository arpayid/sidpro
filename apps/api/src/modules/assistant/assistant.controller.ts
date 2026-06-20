import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators';
import { AssistantService } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private assistantService: AssistantService) {}

  @Public()
  @Get('public/faq')
  getFaq() {
    return this.assistantService.getFaq();
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('public/ask')
  ask(@Query('tenantCode') _tenantCode: string, @Body() body: { question?: string }) {
    return this.assistantService.ask(body.question ?? '');
  }
}
