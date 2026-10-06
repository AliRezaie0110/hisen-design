import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { ListOwnersDto } from './dto/list-owners.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { OwnersService } from './owners.service';

@Controller('admin/owners')
@Roles(UserRole.MANAGER)
export class OwnersController {
  constructor(
    private readonly owners:
      OwnersService,
    private readonly prisma:
      PrismaService,
  ) {}

  @Get()
  list(
    @Query()
    query: ListOwnersDto,
  ) {
    return this.owners.list(query);
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.owners.findOne(id);
  }

  @Post()
  create(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Body()
    dto: CreateOwnerDto,
  ) {
    return this.owners.create(
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
    dto: UpdateOwnerDto,
  ) {
    return this.owners.update(
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
    return this.prisma.$transaction(
      async (tx) => {
        const owner =
          await tx.owner.findUnique({
            where: {
              id,
            },
          });

        if (!owner) {
          throw new NotFoundException({
            code:
              'OWNER_NOT_FOUND',
            message:
              'صاحبکار پیدا نشد.',
          });
        }

        const [
          batchCount,
          paymentCount,
        ] =
          await Promise.all([
            tx.workBatch.count({
              where: {
                ownerId:
                  id,
              },
            }),
            tx.ownerPayment.count({
              where: {
                ownerId:
                  id,
              },
            }),
          ]);

        if (
          batchCount > 0 ||
          paymentCount > 0
        ) {
          const updated =
            await tx.owner.update({
              where: {
                id,
              },
              data: {
                isActive:
                  false,
              },
            });

          await tx.auditLog.create({
            data: {
              actorId:
                actor.id,
              action:
                'OWNER_DELETE_CONVERTED_TO_DEACTIVATE',
              entityType:
                'Owner',
              entityId:
                id,
              beforeData: {
                name:
                  owner.name,
                isActive:
                  owner.isActive,
              },
              afterData: {
                isActive:
                  updated.isActive,
                batchCount,
                paymentCount,
              },
            },
          });

          return {
            mode:
              'DEACTIVATED' as const,
            id,
          };
        }

        await tx.auditLog.create({
          data: {
            actorId:
              actor.id,
            action:
              'OWNER_DELETED',
            entityType:
              'Owner',
            entityId:
              id,
            beforeData: {
              name:
                owner.name,
              phone:
                owner.phone,
              isActive:
                owner.isActive,
            },
          },
        });

        await tx.owner.delete({
          where: {
            id,
          },
        });

        return {
          mode:
            'DELETED' as const,
          id,
        };
      },
    );
  }

  @Post(':id/deactivate')
  deactivate(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
  ) {
    return this.owners.setActive(
      actor.id,
      id,
      false,
    );
  }

  @Post(':id/activate')
  activate(
    @CurrentUser()
    actor: AuthenticatedUser,
    @Param('id')
    id: string,
  ) {
    return this.owners.setActive(
      actor.id,
      id,
      true,
    );
  }
}
