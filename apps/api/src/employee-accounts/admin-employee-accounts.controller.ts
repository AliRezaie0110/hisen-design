import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

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
  CreateEmployeePaymentDto,
} from './dto/create-employee-payment.dto';

import {
  ListEmployeeAccountsDto,
} from './dto/list-employee-accounts.dto';

import {
  EmployeeAccountsService,
  type UploadedReceipt,
} from './employee-accounts.service';

@Controller('admin/employee-accounts')
@Roles(UserRole.MANAGER)
export class AdminEmployeeAccountsController {
  constructor(
    private readonly accounts:
      EmployeeAccountsService,
  ) {}

  @Get()
  list(
    @Query()
    query:
      ListEmployeeAccountsDto,
  ) {
    return this.accounts.list(
      query,
    );
  }

  @Get('payments/:paymentId/receipt')
  async receipt(
    @Param('paymentId')
    paymentId: string,
  ) {
    const receipt =
      await this.accounts.getPaymentReceipt(
        paymentId,
      );

    return new StreamableFile(
      receipt.buffer,
      {
        type:
          receipt.mimeType,

        disposition:
          `attachment; filename*=UTF-8''${encodeURIComponent(
            receipt.originalName,
          )}`,
      },
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
  @UseInterceptors(
    FileInterceptor(
      'receipt',
      {
        limits: {
          fileSize:
            5 *
            1024 *
            1024,
        },
      },
    ),
  )
  recordPayment(
    @CurrentUser()
    actor:
      AuthenticatedUser,

    @Param('id')
    id: string,

    @Body()
    dto:
      CreateEmployeePaymentDto,

    @UploadedFile()
    receipt?:
      UploadedReceipt,
  ) {
    return this.accounts.recordPayment(
      actor.id,
      id,
      dto,
      receipt,
    );
  }
}