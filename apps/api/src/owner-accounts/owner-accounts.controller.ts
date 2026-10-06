import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import type {
  AuthenticatedUser,
} from '../auth/auth.types';
import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import {
  Roles,
} from '../auth/decorators/roles.decorator';
import {
  UserRole,
} from '../generated/prisma/enums';
import {
  CreateOwnerPaymentDto,
} from './dto/create-owner-payment.dto';
import {
  ListOwnerAccountsDto,
} from './dto/list-owner-accounts.dto';
import {
  OwnerAccountsService,
} from './owner-accounts.service';

@Controller('admin/owner-accounts')
@Roles(UserRole.MANAGER)
export class OwnerAccountsController {
  constructor(
    private readonly accounts:
      OwnerAccountsService,
  ) {}

  @Get()
  list(
    @Query()
    query: ListOwnerAccountsDto,
  ) {
    return this.accounts.list(
      query,
    );
  }

  @Get(':id')
  getAccount(
    @Param('id')
    id: string,
  ) {
    return this.accounts.getAccount(
      id,
    );
  }

  @Post(':id/payments')
  recordPayment(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: CreateOwnerPaymentDto,
  ) {
    return this.accounts.recordPayment(
      actor.id,
      id,
      dto,
    );
  }
}