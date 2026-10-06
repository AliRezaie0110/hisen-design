import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ConfigService,
} from '@nestjs/config';
import {
  Reflector,
} from '@nestjs/core';
import type {
  Request,
} from 'express';

import {
  AuthService,
} from '../auth.service';
import type {
  AuthenticatedUser,
} from '../auth.types';
import {
  IS_PUBLIC_KEY,
} from '../decorators/public.decorator';

type AuthRequest =
  Request & {
    authUser?: AuthenticatedUser;
  };

@Injectable()
export class SessionAuthGuard
  implements CanActivate
{
  constructor(
    private readonly reflector:
      Reflector,
    private readonly auth:
      AuthService,
    private readonly config:
      ConfigService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const isPublic =
      this.reflector
        .getAllAndOverride<boolean>(
          IS_PUBLIC_KEY,
          [
            context.getHandler(),
            context.getClass(),
          ],
        );

    if (isPublic) {
      return true;
    }

    const request =
      context
        .switchToHttp()
        .getRequest<AuthRequest>();

    const cookieName =
      this.config.get<string>(
        'AUTH_COOKIE_NAME',
      ) ??
      'bagheri_session';

    const token =
      request.cookies?.[
        cookieName
      ];

    if (
      typeof token !==
        'string' ||
      !token
    ) {
      throw new UnauthorizedException({
        code:
          'AUTH_REQUIRED',
        message:
          'ابتدا وارد حساب شوید.',
      });
    }

    const user =
      await this.auth
        .sessionUser(
          token,
        );

    if (!user) {
      throw new UnauthorizedException({
        code:
          'SESSION_INVALID',
        message:
          'نشست معتبر نیست.',
      });
    }

    request.authUser =
      user;

    return true;
  }
}