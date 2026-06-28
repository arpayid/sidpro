import { Module } from '@nestjs/common';
import { AddressResolutionService } from './address-resolution.service';

@Module({
  providers: [AddressResolutionService],
  exports: [AddressResolutionService],
})
export class AddressingModule {}
