import { Module } from '@nestjs/common';
import { BumdesService } from './bumdes.service';
import { BumdesController } from './bumdes.controller';

@Module({
  controllers: [BumdesController],
  providers: [BumdesService],
  exports: [BumdesService],
})
export class BumdesModule {}
