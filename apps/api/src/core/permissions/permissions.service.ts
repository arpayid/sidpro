import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { successResponse } from '../../common/utils/response.util';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(module?: string) {
    const data = await this.prisma.permission.findMany({
      where: module ? { module } : undefined,
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
    return successResponse(data);
  }
}
