import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators';
import { JwtPayload } from '../decorators/current-user.decorator';

/**
 * Enforces server-side account and tenant state for every authenticated request.
 * JWT expiry alone is insufficient when an account is disabled or moved to a
 * different tenant before its access token expires.
 */
@Injectable()
export class ActiveSessionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const session = request.user as JwtPayload | undefined;
    if (!session) throw new UnauthorizedException('Sesi tidak valid');

    const user = await this.prisma.user.findUnique({
      where: { id: session.sub },
      select: { status: true, deletedAt: true, tenantId: true },
    });

    if (!user || user.status !== 'active' || user.deletedAt) {
      throw new UnauthorizedException('Sesi akun tidak aktif');
    }

    if (user.tenantId !== session.tenantId) {
      throw new UnauthorizedException('Sesi tenant tidak valid');
    }

    return true;
  }
}
