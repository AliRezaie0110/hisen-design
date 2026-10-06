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
  BatchesService,
} from './batches.service';
import {
  ChangeBatchStatusDto,
} from './dto/change-batch-status.dto';
import {
  CreateWorkBatchDto,
} from './dto/create-work-batch.dto';
import {
  ListWorkBatchesDto,
} from './dto/list-work-batches.dto';

@Controller('admin/batches')
@Roles(UserRole.MANAGER)
export class BatchesController {
  constructor(
    private readonly batches:
      BatchesService,
  ) {}

  @Get()
  list(
    @Query()
    query: ListWorkBatchesDto,
  ) {
    return this.batches.list(
      query,
    );
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.batches.findOne(
      id,
    );
  }

  @Post()
  create(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Body()
    dto: CreateWorkBatchDto,
  ) {
    return this.batches.create(
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
    dto: CreateWorkBatchDto,
  ) {
    return this.batches.update(
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
    return this.batches.remove(
      actor.id,
      id,
    );
  }

  @Patch(':id/status')
  changeStatus(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: ChangeBatchStatusDto,
  ) {
    return this.batches.changeStatus(
      actor.id,
      id,
      dto,
    );
  }
}
