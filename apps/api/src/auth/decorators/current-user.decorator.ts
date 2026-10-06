import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type {
  Request,
} from 'express';

import type {
  AuthenticatedUser,
} from '../auth.types';

type AuthRequest =
  Request & {
    authUser?: AuthenticatedUser;
  };

export const CurrentUser =
  createParamDecorator(
    (
      _data: unknown,
      context: ExecutionContext,
    ) => {
      const request =
        context
          .switchToHttp()
          .getRequest<AuthRequest>();

      return request.authUser;
    },
  );