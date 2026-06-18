import { Module } from '@nestjs/common';
import { SocialAssistanceService } from './social-assistance.service';
import { SocialAssistanceController } from './social-assistance.controller';

@Module({
  controllers: [SocialAssistanceController],
  providers: [SocialAssistanceService],
  exports: [SocialAssistanceService],
})
export class SocialAssistanceModule {}
