import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { ListPersonnelDto } from './dto/list-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { PersonnelService } from './personnel.service';

@Controller('admin/personnel')
@Roles(UserRole.MANAGER)
export class PersonnelController {
  constructor(
    private readonly personnel:
      PersonnelService,
  ) {}

  @Get()
  list(
    @Query()
    query: ListPersonnelDto,
  ) {
    return this.personnel.list(
      query,
    );
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.personnel.findOne(
      id,
    );
  }

  @Post()
  create(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Body()
    dto: CreatePersonnelDto,
  ) {
    return this.personnel.create(
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
    dto: UpdatePersonnelDto,
  ) {
    return this.personnel.update(
      actor.id,
      id,
      dto,
    );
  }

  @Post(':id/deactivate')
  deactivate(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
  ) {
    return this.personnel.deactivate(
      actor.id,
      id,
    );
  }

  @Post(':id/activate')
  activate(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
  ) {
    return this.personnel.activate(
      actor.id,
      id,
    );
  }
}