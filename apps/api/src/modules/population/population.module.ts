import { Module } from '@nestjs/common';
import { AddressingModule } from '../../core/addressing/addressing.module';
import { PopulationService } from './population.service';
import { PopulationController } from './population.controller';

@Module({
  imports: [AddressingModule],
  controllers: [PopulationController],
  providers: [PopulationService],
  exports: [PopulationService],
})
export class PopulationModule {}
