import { Module } from '@nestjs/common';
import { CivilEventsService } from './civil-events.service';
import { CivilEventsController } from './civil-events.controller';

@Module({
  controllers: [CivilEventsController],
  providers: [CivilEventsService],
  exports: [CivilEventsService],
})
export class CivilEventsModule {}
