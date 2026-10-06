import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { ListOwnersDto } from './dto/list-owners.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

@Injectable()
export class OwnersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private present(owner: {
    id: string;
    name: string;
    phone: string | null;
    note: string | null;
    isActive: boolean;
  }) {
    return {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      note: owner.note,
      isActive: owner.isActive,
    };
  }

  async list(dto: ListOwnersDto) {
    const q = dto.q?.trim();

    const owners =
      await this.prisma.owner.findMany({
        where: {
          ...(dto.isActive
            ? {
                isActive:
                  dto.isActive === 'true',
              }
            : {}),
          ...(q
            ? {
                OR: [
                  {
                    name: {
                      contains: q,
                      mode:
                        'insensitive' as const,
                    },
                  },
                  {
                    phone: {
                      contains: q,
                    },
                  },
                ],
              }
            : {}),
        },
        orderBy: {
          name: 'asc',
        },
      });

    return {
      items:
        owners.map((owner) =>
          this.present(owner),
        ),
    };
  }

  async findOne(id: string) {
    const owner =
      await this.prisma.owner.findUnique({
        where: {
          id,
        },
      });

    if (!owner) {
      throw new NotFoundException({
        code: 'OWNER_NOT_FOUND',
        message:
          'صاحبکار پیدا نشد.',
      });
    }

    return this.present(owner);
  }

  async create(
    actorId: string,
    dto: CreateOwnerDto,
  ) {
    const owner =
      await this.prisma.$transaction(
        async (tx) => {
          const created =
            await tx.owner.create({
              data: {
                name: dto.name.trim(),
                phone:
                  dto.phone?.trim() ||
                  null,
                note:
                  dto.note?.trim() ||
                  null,
                isActive: true,
              },
            });

          await tx.auditLog.create({
            data: {
              actorId,
              action:
                'OWNER_CREATED',
              entityType:
                'Owner',
              entityId:
                created.id,
              afterData: {
                name:
                  created.name,
                phone:
                  created.phone,
                note:
                  created.note,
                isActive:
                  created.isActive,
              },
            },
          });

          return created;
        },
      );

    return this.present(owner);
  }

  async update(
    actorId: string,
    id: string,
    dto: UpdateOwnerDto,
  ) {
    const owner =
      await this.prisma.$transaction(
        async (tx) => {
          const existing =
            await tx.owner.findUnique({
              where: {
                id,
              },
            });

          if (!existing) {
            throw new NotFoundException({
              code:
                'OWNER_NOT_FOUND',
              message:
                'صاحبکار پیدا نشد.',
            });
          }

          const updated =
            await tx.owner.update({
              where: {
                id,
              },
              data: {
                ...(dto.name !==
                undefined
                  ? {
                      name:
                        dto.name.trim(),
                    }
                  : {}),
                ...(dto.phone !==
                undefined
                  ? {
                      phone:
                        dto.phone.trim() ||
                        null,
                    }
                  : {}),
                ...(dto.note !==
                undefined
                  ? {
                      note:
                        dto.note.trim() ||
                        null,
                    }
                  : {}),
              },
            });

          await tx.auditLog.create({
            data: {
              actorId,
              action:
                'OWNER_UPDATED',
              entityType:
                'Owner',
              entityId:
                id,
              beforeData: {
                name:
                  existing.name,
                phone:
                  existing.phone,
                note:
                  existing.note,
                isActive:
                  existing.isActive,
              },
              afterData: {
                name:
                  updated.name,
                phone:
                  updated.phone,
                note:
                  updated.note,
                isActive:
                  updated.isActive,
              },
            },
          });

          return updated;
        },
      );

    return this.present(owner);
  }

  async setActive(
    actorId: string,
    id: string,
    isActive: boolean,
  ) {
    const owner =
      await this.prisma.$transaction(
        async (tx) => {
          const existing =
            await tx.owner.findUnique({
              where: {
                id,
              },
            });

          if (!existing) {
            throw new NotFoundException({
              code:
                'OWNER_NOT_FOUND',
              message:
                'صاحبکار پیدا نشد.',
            });
          }

          if (
            existing.isActive ===
            isActive
          ) {
            return existing;
          }

          const updated =
            await tx.owner.update({
              where: {
                id,
              },
              data: {
                isActive,
              },
            });

          await tx.auditLog.create({
            data: {
              actorId,
              action:
                isActive
                  ? 'OWNER_ACTIVATED'
                  : 'OWNER_DEACTIVATED',
              entityType:
                'Owner',
              entityId:
                id,
              beforeData: {
                isActive:
                  existing.isActive,
              },
              afterData: {
                isActive:
                  updated.isActive,
              },
            },
          });

          return updated;
        },
      );

    return this.present(owner);
  }
}