import { Controller, Post, Get, Body, UseGuards, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { ApiResponse } from '@sidpro/types';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CompleteTwoFactorEnrollmentDto,
  DisableTwoFactorDto,
  EnableTwoFactorDto,
  LoginDto,
  SetupTwoFactorEnrollmentDto,
  VerifyTwoFactorLoginDto,
} from './dto/auth.dto';
import { successResponse } from '../../common/utils/response.util';
import {
  assertAllowedSessionOrigin,
  clearRefreshSessionCookie,
  readRefreshSessionCookie,
  readRequestCookie,
  REFRESH_SESSION_COOKIE,
  setRefreshSessionCookie,
} from './session-cookie.util';

type SessionTransportPayload = {
  accessToken: string;
  refreshToken: string;
  user?: unknown;
};

function isSessionTransportPayload(value: unknown): value is SessionTransportPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    'refreshToken' in value &&
    typeof value.refreshToken === 'string'
  );
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private sessionEnvironment() {
    return {
      nodeEnv: process.env.NODE_ENV,
      corsOrigin: process.env.CORS_ORIGIN,
    };
  }

  private assertBrowserSessionOrigin(request: Request) {
    assertAllowedSessionOrigin(request, this.sessionEnvironment());
  }

  private setSessionCookieAndStripRefreshToken(
    response: Response,
    result: ApiResponse<unknown>,
  ): ApiResponse<unknown> {
    if (!isSessionTransportPayload(result.data)) return result;

    setRefreshSessionCookie(response, result.data.refreshToken, this.sessionEnvironment());
    const { refreshToken: _refreshToken, ...publicPayload } = result.data;
    return successResponse(publicPayload, result.message, result.meta);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertBrowserSessionOrigin(req);
    const result = await this.authService.login(body.email, body.password, req.ip);
    return this.setSessionCookieAndStripRefreshToken(response, result);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/verify-login')
  async verifyTwoFactorLogin(
    @Body() body: VerifyTwoFactorLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertBrowserSessionOrigin(req);
    const result = await this.authService.verifyTwoFactorLogin(body.twoFactorToken, body.token, req.ip);
    return this.setSessionCookieAndStripRefreshToken(response, result);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/enroll-login/setup')
  setupEnrollLogin(@Body() body: SetupTwoFactorEnrollmentDto) {
    return this.authService.setupEnrollLogin(body.enrollmentToken);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/enroll-login/complete')
  async completeEnrollLogin(
    @Body() body: CompleteTwoFactorEnrollmentDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertBrowserSessionOrigin(req);
    const result = await this.authService.completeEnrollLogin(body.enrollmentToken, body.token, req.ip);
    return this.setSessionCookieAndStripRefreshToken(response, result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser('sub') userId: string) {
    return this.authService.setupTwoFactor(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  enableTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() body: EnableTwoFactorDto,
    @Req() req: Request,
  ) {
    return this.authService.enableTwoFactor(userId, body.token, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disableTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() body: DisableTwoFactorDto,
    @Req() req: Request,
  ) {
    return this.authService.disableTwoFactor(userId, body.token, body.password, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) response: Response) {
    this.assertBrowserSessionOrigin(req);
    const result = await this.authService.refresh(readRefreshSessionCookie(req), req.ip);
    return this.setSessionCookieAndStripRefreshToken(response, result);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.assertBrowserSessionOrigin(req);
    const refreshToken = readRequestCookie(req, REFRESH_SESSION_COOKIE) ?? undefined;
    const result = await this.authService.logout(userId, refreshToken, req.ip);
    clearRefreshSessionCookie(response, this.sessionEnvironment());
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.authService.me(userId);
  }
}
