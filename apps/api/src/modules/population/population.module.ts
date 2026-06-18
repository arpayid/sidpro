import { Module } from '@nestjs/common';
import { PopulationService } from './population.service';
import { PopulationController } from './population.controller';

@Module({
  controllers: [PopulationController],
  providers: [PopulationService],
  exports: [PopulationService],
})
export class PopulationModule {}
