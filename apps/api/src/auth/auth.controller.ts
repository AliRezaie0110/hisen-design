import {
  Body,
  Controller,
  Get,
  Post,
  Res,
} from '@nestjs/common';
import {
  ConfigService,
} from '@nestjs/config';
import type {
  Response,
} from 'express';

import {
  AuthService,
} from './auth.service';
import type {
  AuthenticatedUser,
} from './auth.types';
import {
  CurrentUser,
} from './decorators/current-user.decorator';
import {
  Public,
} from './decorators/public.decorator';
import {
  RequestOtpDto,
} from './dto/request-otp.dto';
import {
  VerifyOtpDto,
} from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth:
      AuthService,
    private readonly config:
      ConfigService,
  ) {}

  @Public()
  @Post('request-otp')
  requestOtp(
    @Body()
    dto: RequestOtpDto,
  ) {
    return this.auth
      .requestOtp(
        dto.phone,
      );
  }

  @Public()
  @Post('verify-otp')
  async verifyOtp(
    @Body()
    dto: VerifyOtpDto,
    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const result =
      await this.auth
        .verifyOtp(
          dto.phone,
          dto.code,
        );

    const cookieName =
      this.config.get<string>(
        'AUTH_COOKIE_NAME',
      ) ??
      'bagheri_session';

    response.cookie(
      cookieName,
      result.token,
      {
        httpOnly: true,
        secure:
          this.config
            .get<string>(
              'COOKIE_SECURE',
            ) === 'true',
        sameSite: 'lax',
        expires:
          result.expiresAt,
        path: '/',
      },
    );

    return {
      authenticated: true,
      user: result.user,
    };
  }

  @Get('me')
  me(
    @CurrentUser()
    user:
      AuthenticatedUser,
  ) {
    return {
      user,
    };
  }

  @Post('logout')
  async logout(
    @CurrentUser()
    user:
      AuthenticatedUser,
    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    await this.auth.logout(
      user.sessionId,
    );

    const cookieName =
      this.config.get<string>(
        'AUTH_COOKIE_NAME',
      ) ??
      'bagheri_session';

    response.clearCookie(
      cookieName,
      {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      },
    );

    return {
      loggedOut: true,
    };
  }
}