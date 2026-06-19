import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() body: { email: string; password: string }, @Req() req: Request) {
    return this.authService.login(body.email, body.password, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/verify-login')
  verifyTwoFactorLogin(
    @Body() body: { twoFactorToken: string; token: string },
    @Req() req: Request,
  ) {
    return this.authService.verifyTwoFactorLogin(body.twoFactorToken, body.token, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/enroll-login/setup')
  setupEnrollLogin(@Body() body: { enrollmentToken: string }) {
    return this.authService.setupEnrollLogin(body.enrollmentToken);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/enroll-login/complete')
  completeEnrollLogin(
    @Body() body: { enrollmentToken: string; token: string },
    @Req() req: Request,
  ) {
    return this.authService.completeEnrollLogin(body.enrollmentToken, body.token, req.ip);
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
    @Body() body: { token: string },
    @Req() req: Request,
  ) {
    return this.authService.enableTwoFactor(userId, body.token, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disableTwoFactor(
    @CurrentUser('sub') userId: string,
    @Body() body: { token: string; password: string },
    @Req() req: Request,
  ) {
    return this.authService.disableTwoFactor(userId, body.token, body.password, req.ip);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser('sub') userId: string,
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
  ) {
    return this.authService.logout(userId, body.refreshToken, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.authService.me(userId);
  }
}
