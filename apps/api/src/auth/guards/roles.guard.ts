import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';

type AuthRequest = Request & {
  authUser?: AuthenticatedUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredRoles?.length) {
      return true;
    }

    const request =
      context
        .switchToHttp()
        .getRequest<AuthRequest>();

    const user = request.authUser;

    if (
      !user ||
      !requiredRoles.includes(user.role)
    ) {
      throw new ForbiddenException({
        code: 'ROLE_FORBIDDEN',
        message:
          'به این بخش دسترسی ندارید.',
      });
    }

    return true;
  }
}