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
  CreateTimeEntryDto,
} from './dto/create-time-entry.dto';
import {
  ReviewTimeEntryDto,
} from './dto/review-time-entry.dto';
import {
  TimeEntriesService,
} from './time-entries.service';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(
    private readonly timeEntries:
      TimeEntriesService,
  ) {}

  @Post()
  @Roles(
    UserRole.SUPERVISOR,
    UserRole.ASSISTANT,
  )
  create(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Body()
    dto: CreateTimeEntryDto,
  ) {
    return this.timeEntries.create(
      actor.id,
      dto,
    );
  }

  @Get('mine')
  @Roles(
    UserRole.SUPERVISOR,
    UserRole.ASSISTANT,
  )
  mine(
    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.timeEntries.mine(
      actor.id,
    );
  }

  @Get('pending')
  @Roles(
    UserRole.MANAGER,
    UserRole.SUPERVISOR,
  )
  pending(
    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.timeEntries.pending(
      actor.id,
      actor.role,
    );
  }

  @Post(':id/approve')
  @Roles(
    UserRole.MANAGER,
    UserRole.SUPERVISOR,
  )
  approve(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: ReviewTimeEntryDto,
  ) {
    return this.timeEntries.approve(
      actor.id,
      actor.role,
      id,
      dto,
    );
  }

  @Post(':id/reject')
  @Roles(
    UserRole.MANAGER,
    UserRole.SUPERVISOR,
  )
  reject(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: ReviewTimeEntryDto,
  ) {
    return this.timeEntries.reject(
      actor.id,
      actor.role,
      id,
      dto,
    );
  }
}