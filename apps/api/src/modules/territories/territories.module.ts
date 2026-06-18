import { Module } from '@nestjs/common';
import { TerritoriesService } from './territories.service';
import { HamletsController, NeighborhoodUnitsController } from './territories.controller';

@Module({
  controllers: [HamletsController, NeighborhoodUnitsController],
  providers: [TerritoriesService],
  exports: [TerritoriesService],
})
export class TerritoriesModule {}
