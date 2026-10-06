import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
  CreateWorkEntryDto,
} from './dto/create-work-entry.dto';
import {
  ReviewWorkEntryDto,
} from './dto/review-work-entry.dto';
import {
  WorkEntriesService,
} from './work-entries.service';

@Controller('work-entries')
export class WorkEntriesController {
  constructor(
    private readonly workEntries:
      WorkEntriesService,
  ) {}

  @Get('available')
  @Roles(UserRole.WORKER)
  available(
    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.workEntries.available(
      actor.id,
    );
  }

  @Get('mine')
  @Roles(UserRole.WORKER)
  mine(
    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.workEntries.mine(
      actor.id,
    );
  }

  @Get('pending')
  @Roles(
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
  )
  pending(
    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.workEntries.pending(
      actor.role,
    );
  }

  @Post()
  @Roles(UserRole.WORKER)
  create(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Body()
    dto: CreateWorkEntryDto,
  ) {
    return this.workEntries.create(
      actor.id,
      dto,
    );
  }

  @Post(':id/approve')
  @Roles(
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
  )
  approve(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: ReviewWorkEntryDto,
  ) {
    return this.workEntries.approve(
      actor.id,
      actor.role,
      id,
      dto,
    );
  }

  @Post(':id/reject')
  @Roles(
    UserRole.SUPERVISOR,
    UserRole.MANAGER,
  )
  reject(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: ReviewWorkEntryDto,
  ) {
    return this.workEntries.reject(
      actor.id,
      actor.role,
      id,
      dto,
    );
  }
}