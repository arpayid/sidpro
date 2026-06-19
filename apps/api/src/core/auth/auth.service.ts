import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { successResponse } from '../../common/utils/response.util';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  buildTotpUri,
  generateTotpSecret,
  verifyTotpToken,
} from './totp.util';
import {
  SECURITY_REQUIRE_2FA_ADMIN_KEY,
  isAdminRole,
  parseRequire2FaAdminSetting,
} from './security-policy.util';

type AuthUserShape = {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  roles: string[];
  permissions: string[];
  twoFaEnabled: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private auditLogs: AuditLogsService,
  ) {}

  private mapUserRoles(
    user: {
      id: string;
      email: string;
      name: string;
      tenantId: string | null;
      twoFaEnabled: boolean;
      userRoles: {
        role: {
          code: string;
          rolePermissions: { permission: { code: string } }[];
        };
      }[];
    },
  ): AuthUserShape {
    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      roles,
      permissions,
      twoFaEnabled: user.twoFaEnabled,
    };
  }

  private buildJwtPayload(user: AuthUserShape): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions,
    };
  }

  private async isRequire2FaAdminForUser(authUser: AuthUserShape): Promise<boolean> {
    if (!isAdminRole(authUser.roles) || !authUser.tenantId) return false;

    const setting = await this.prisma.setting.findUnique({
      where: {
        tenantId_key: {
          tenantId: authUser.tenantId,
          key: SECURITY_REQUIRE_2FA_ADMIN_KEY,
        },
      },
    });

    return parseRequire2FaAdminSetting(setting?.value);
  }

  private async ensureEnrollmentSecret(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFaSecret: true },
    });
    if (!user) throw new UnauthorizedException();

    if (user.twoFaSecret) return user.twoFaSecret;

    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: secret, twoFaEnabled: false },
    });
    return secret;
  }

  private verifyEnrollmentToken(enrollmentToken: string): string {
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwt.verify(enrollmentToken);
    } catch {
      throw new UnauthorizedException('Sesi enrollment 2FA tidak valid atau kedaluwarsa');
    }

    if (payload.type !== '2fa_enroll_pending' || !payload.sub) {
      throw new UnauthorizedException('Token enrollment 2FA tidak valid');
    }

    return payload.sub;
  }

  private async issueTokens(user: AuthUserShape, ipAddress?: string) {
    const payload = this.buildJwtPayload(user);
    const accessToken = this.jwt.sign(payload);
    const refreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: user.id,
      action: 'login',
      module: 'auth',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    return successResponse(
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          roles: user.roles,
          permissions: user.permissions,
        },
      },
      'Login berhasil',
    );
  }

  private async findUserForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
  }

  async login(email: string, password: string, ipAddress?: string) {
    const user = await this.findUserForAuth(email);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Email atau password salah');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const authUser = this.mapUserRoles(user);

    if (user.twoFaEnabled && user.twoFaSecret) {
      const twoFactorToken = this.jwt.sign(
        { sub: user.id, type: '2fa_pending' },
        { expiresIn: '5m' },
      );
      return successResponse(
        { requiresTwoFactor: true as const, twoFactorToken },
        'Verifikasi 2FA diperlukan',
      );
    }

    if ((await this.isRequire2FaAdminForUser(authUser)) && !user.twoFaEnabled) {
      await this.ensureEnrollmentSecret(user.id);
      const enrollmentToken = this.jwt.sign(
        { sub: user.id, type: '2fa_enroll_pending' },
        { expiresIn: '15m' },
      );
      return successResponse(
        { requiresTwoFactorEnrollment: true as const, enrollmentToken },
        'Aktivasi 2FA wajib untuk admin',
      );
    }

    return this.issueTokens(authUser, ipAddress);
  }

  async verifyTwoFactorLogin(twoFactorToken: string, token: string, ipAddress?: string) {
    let payload: { sub?: string; type?: string };
    try {
      payload = this.jwt.verify(twoFactorToken);
    } catch {
      throw new UnauthorizedException('Sesi 2FA tidak valid atau kedaluwarsa');
    }

    if (payload.type !== '2fa_pending' || !payload.sub) {
      throw new UnauthorizedException('Token 2FA tidak valid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active' || !user.twoFaEnabled || !user.twoFaSecret) {
      throw new UnauthorizedException('Akun tidak memerlukan 2FA');
    }

    if (!(await verifyTotpToken(token, user.twoFaSecret))) {
      throw new UnauthorizedException('Kode 2FA tidak valid');
    }

    return this.issueTokens(this.mapUserRoles(user), ipAddress);
  }

  async setupEnrollLogin(enrollmentToken: string) {
    const userId = this.verifyEnrollmentToken(enrollmentToken);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active' || user.twoFaEnabled) {
      throw new UnauthorizedException('Enrollment 2FA tidak diperlukan');
    }

    const authUser = this.mapUserRoles(user);
    if (!(await this.isRequire2FaAdminForUser(authUser))) {
      throw new UnauthorizedException('Enrollment 2FA tidak diperlukan');
    }

    const secret = await this.ensureEnrollmentSecret(userId);
    return successResponse({
      secret,
      otpauthUrl: buildTotpUri(user.email, secret),
    });
  }

  async completeEnrollLogin(enrollmentToken: string, token: string, ipAddress?: string) {
    const userId = this.verifyEnrollmentToken(enrollmentToken);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active' || user.twoFaEnabled || !user.twoFaSecret) {
      throw new UnauthorizedException('Enrollment 2FA tidak diperlukan');
    }

    const authUser = this.mapUserRoles(user);
    if (!(await this.isRequire2FaAdminForUser(authUser))) {
      throw new UnauthorizedException('Enrollment 2FA tidak diperlukan');
    }

    if (!(await verifyTotpToken(token, user.twoFaSecret))) {
      throw new UnauthorizedException('Kode 2FA tidak valid');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: true },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: userId,
      action: 'enable_2fa',
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      metadata: { source: 'mandatory_enrollment' },
      ipAddress,
    });

    return this.issueTokens({ ...authUser, twoFaEnabled: true }, ipAddress);
  }

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: secret, twoFaEnabled: false },
    });

    return successResponse({
      secret,
      otpauthUrl: buildTotpUri(user.email, secret),
    });
  }

  async enableTwoFactor(userId: string, token: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFaSecret) {
      throw new BadRequestException('Jalankan setup 2FA terlebih dahulu');
    }

    if (!(await verifyTotpToken(token, user.twoFaSecret))) {
      throw new BadRequestException('Kode 2FA tidak valid');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: true },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: userId,
      action: 'enable_2fa',
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    });

    return successResponse(null, '2FA berhasil diaktifkan');
  }

  async disableTwoFactor(
    userId: string,
    token: string,
    password: string,
    ipAddress?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();

    const authUser = this.mapUserRoles(user);
    if (await this.isRequire2FaAdminForUser(authUser)) {
      throw new BadRequestException(
        '2FA wajib untuk admin sesuai kebijakan keamanan tenant',
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Password tidak valid');

    if (user.twoFaEnabled && user.twoFaSecret && !(await verifyTotpToken(token, user.twoFaSecret))) {
      throw new BadRequestException('Kode 2FA tidak valid');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: false, twoFaSecret: null },
    });

    await this.auditLogs.log({
      tenantId: user.tenantId,
      actorId: userId,
      action: 'disable_2fa',
      module: 'auth',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    });

    return successResponse(null, '2FA berhasil dinonaktifkan');
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: { include: { permission: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const user = stored.user;
    const authUser = this.mapUserRoles(user);
    const payload = this.buildJwtPayload(authUser);

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: newRefreshToken, expiresAt },
    });

    return successResponse(
      {
        accessToken: this.jwt.sign(payload),
        refreshToken: newRefreshToken,
      },
      'Token diperbarui',
    );
  }

  async logout(userId: string, refreshToken?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });

    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (user) {
      await this.auditLogs.log({
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'logout',
        module: 'auth',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
      });
    }

    return successResponse(null, 'Logout berhasil');
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException();

    const authUser = this.mapUserRoles(user);
    return successResponse({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      tenantId: authUser.tenantId,
      roles: authUser.roles,
      permissions: authUser.permissions,
      twoFaEnabled: authUser.twoFaEnabled,
    });
  }
}
