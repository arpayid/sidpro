import { Module } from '@nestjs/common';
import { VillageProfileService } from './village-profile.service';
import { VillageProfileController } from './village-profile.controller';

@Module({
  controllers: [VillageProfileController],
  providers: [VillageProfileService],
  exports: [VillageProfileService],
})
export class VillageProfileModule {}
