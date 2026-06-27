import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';
import {
  CompleteTwoFactorEnrollmentDto,
  DisableTwoFactorDto,
  EnableTwoFactorDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  SetupTwoFactorEnrollmentDto,
  VerifyTwoFactorLoginDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body.email, body.password, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('2fa/verify-login')
  verifyTwoFactorLogin(
    @Body() body: VerifyTwoFactorLoginDto,
    @Req() req: Request,
  ) {
    return this.authService.verifyTwoFactorLogin(body.twoFactorToken, body.token, req.ip);
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
  completeEnrollLogin(
    @Body() body: CompleteTwoFactorEnrollmentDto,
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
  refresh(@Body() body: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(body.refreshToken, req.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser('sub') userId: string,
    @Body() body: LogoutDto,
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
