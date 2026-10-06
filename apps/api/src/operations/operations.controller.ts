import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  ChangeOperationRateDto,
} from './dto/change-operation-rate.dto';
import {
  CreateOperationDto,
} from './dto/create-operation.dto';
import {
  UpdateOperationDto,
} from './dto/update-operation.dto';
import {
  OperationsService,
} from './operations.service';

@Controller('admin/operations')
@Roles(UserRole.MANAGER)
export class OperationsController {
  constructor(
    private readonly operations:
      OperationsService,
  ) {}

  @Get()
  list(
    @Query('includeInactive')
    includeInactive?: string,
  ) {
    return this.operations.list(
      includeInactive === 'true',
    );
  }

  @Get('checklist')
  checklist() {
    return this.operations.checklist();
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.operations.findOne(
      id,
    );
  }

  @Post()
  create(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Body()
    dto: CreateOperationDto,
  ) {
    return this.operations.create(
      actor.id,
      dto,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: UpdateOperationDto,
  ) {
    return this.operations.update(
      actor.id,
      id,
      dto,
    );
  }


  @Delete(':id')
  remove(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
  ) {
    return this.operations.remove(
      actor.id,
      id,
    );
  }

  @Post(':id/rates')
  changeRate(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: ChangeOperationRateDto,
  ) {
    return this.operations.changeRate(
      actor.id,
      id,
      dto,
    );
  }
}
