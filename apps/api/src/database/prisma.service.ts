import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

type RefreshTokenRecord = {
  id: string;
  userId: string;
  revokedAt: Date | null;
  user?: {
    tenantId: string | null;
    status: string;
    deletedAt: Date | null;
  } | null;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async invalidateRefreshTokenSession(
    token: RefreshTokenRecord,
    reason: 'reused_revoked_token' | 'concurrent_rotation',
  ) {
    const revokedAt = new Date();
    await this.refreshToken.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt },
    });

    const tenantId = token.user?.tenantId ?? (
      await this.user.findUnique({
        where: { id: token.userId },
        select: { tenantId: true },
      })
    )?.tenantId ?? null;

    await this.auditLog.create({
      data: {
        tenantId,
        actorId: token.userId,
        action: 'refresh_token_reuse_detected',
        module: 'auth',
        entityType: 'refresh_token',
        entityId: token.id,
        metadata: { reason },
      },
    });
  }

  async onModuleInit() {
    this.$use(async (params: Prisma.MiddlewareParams, next) => {
      if (params.model !== 'RefreshToken') return next(params);

      const originalAction = params.action;
      const args = (params.args ?? {}) as {
        data?: Record<string, unknown>;
        where?: Record<string, unknown>;
      };
      const lookupToken = typeof args.where?.token === 'string' ? args.where.token : null;

      if (params.action === 'create' && typeof args.data?.token === 'string') {
        args.data.token = this.hashRefreshToken(args.data.token);
      }

      if (params.action === 'findUnique' && lookupToken) {
        const { token, ...restWhere } = args.where ?? {};
        params.action = 'findFirst';
        params.args = {
          ...args,
          where: {
            ...restWhere,
            OR: [
              { token: this.hashRefreshToken(lookupToken) },
              { token: lookupToken },
            ],
          },
        };
      }

      if (params.action === 'updateMany' && lookupToken) {
        params.args = {
          ...args,
          where: {
            ...args.where,
            token: { in: [this.hashRefreshToken(lookupToken), lookupToken] },
          },
        };
      }

      if (
        params.action === 'update' &&
        typeof args.where?.id === 'string' &&
        args.data?.revokedAt instanceof Date
      ) {
        const token = await this.refreshToken.findUnique({
          where: { id: args.where.id },
          select: {
            id: true,
            userId: true,
            revokedAt: true,
            user: { select: { tenantId: true, status: true, deletedAt: true } },
          },
        });

        params.action = 'updateMany';
        params.args = {
          ...args,
          where: {
            ...args.where,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        };

        const result = await next(params) as { count: number };
        if (result.count !== 1) {
          if (token) {
            await this.invalidateRefreshTokenSession(token, 'concurrent_rotation');
          }
          throw new UnauthorizedException('Refresh token tidak valid');
        }
        return result;
      }

      const result = await next(params);
      if (originalAction === 'findUnique' && lookupToken) {
        const token = result as RefreshTokenRecord | null;
        if (token?.revokedAt) {
          await this.invalidateRefreshTokenSession(token, 'reused_revoked_token');
        }
      }

      return result;
    });

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
