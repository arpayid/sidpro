import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ResidentAddressInput } from '@sidpro/validators';
import { PrismaService } from '../../database/prisma.service';

/**
 * Resolves and creates a tenant-scoped address from a hamlet, RT/RW unit, and
 * street input. This capability is shared by resident and family workflows,
 * so it belongs to core addressing rather than either business module.
 */
@Injectable()
export class AddressResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAddress(tenantId: string, input: ResidentAddressInput): Promise<string> {
    const { hamletId, neighborhoodUnitId, street } = input;

    if (neighborhoodUnitId) {
      const unit = await this.prisma.neighborhoodUnit.findFirst({
        where: { id: neighborhoodUnitId, tenantId },
      });
      if (!unit) throw new NotFoundException('RT/RW tidak ditemukan');

      if (hamletId && hamletId !== unit.hamletId) {
        throw new ConflictException('RT/RW tidak sesuai dengan dusun yang dipilih');
      }

      const address = await this.prisma.address.create({
        data: {
          tenantId,
          hamletId: hamletId ?? unit.hamletId,
          neighborhoodUnitId: unit.id,
          rt: unit.rt,
          rw: unit.rw,
          street,
        },
      });
      return address.id;
    }

    if (hamletId) {
      const hamlet = await this.prisma.hamlet.findFirst({
        where: { id: hamletId, tenantId },
      });
      if (!hamlet) throw new NotFoundException('Dusun tidak ditemukan');

      const address = await this.prisma.address.create({
        data: { tenantId, hamletId, street },
      });
      return address.id;
    }

    const address = await this.prisma.address.create({
      data: { tenantId, street },
    });
    return address.id;
  }
}
