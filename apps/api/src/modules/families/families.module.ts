import { Module } from '@nestjs/common';
import { AddressingModule } from '../../core/addressing/addressing.module';
import { FamiliesService } from './families.service';
import { FamiliesController } from './families.controller';

@Module({
  imports: [AddressingModule],
  controllers: [FamiliesController],
  providers: [FamiliesService],
  exports: [FamiliesService],
})
export class FamiliesModule {}
