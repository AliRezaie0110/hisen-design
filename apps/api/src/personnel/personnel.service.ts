import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CompensationType,
  UserRole,
} from '../generated/prisma/enums';
import { normalizeIranianMobile } from '../auth/utils/phone.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { ListPersonnelDto } from './dto/list-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';

@Injectable()
export class PersonnelService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private compensationFor(
    role: UserRole,
  ): CompensationType {
    switch (role) {
      case UserRole.WORKER:
        return CompensationType.PIECE_RATE;

      case UserRole.SUPERVISOR:
      case UserRole.ASSISTANT:
        return CompensationType.FIXED_MONTHLY;

      case UserRole.MANAGER:
        return CompensationType.NONE;

      default:
        throw new BadRequestException({
          code: 'INVALID_ROLE',
          message: 'Ã™â€ Ã™â€šÃ˜Â´ Ã™â€¦Ã˜Â¹Ã˜ÂªÃ˜Â¨Ã˜Â± Ã™â€ Ã›Å’Ã˜Â³Ã˜Âª.',
        });
    }
  }

  private ensureManageableRole(
    role: UserRole,
  ): void {
    if (role === UserRole.MANAGER) {
      throw new ForbiddenException({
        code: 'MANAGER_ROLE_PROTECTED',
        message:
          'Ã˜Â§Ã›Å’Ã˜Â¬Ã˜Â§Ã˜Â¯ Ã›Å’Ã˜Â§ Ã˜ÂªÃ˜ÂºÃ›Å’Ã›Å’Ã˜Â± Ã™â€ Ã™â€šÃ˜Â´ Ã™â€¦Ã˜Â¯Ã›Å’Ã˜Â± Ã˜Â§Ã˜Â² Ã˜Â§Ã›Å’Ã™â€  Ã˜Â¨Ã˜Â®Ã˜Â´ Ã™â€¦Ã˜Â¬Ã˜Â§Ã˜Â² Ã™â€ Ã›Å’Ã˜Â³Ã˜Âª.',
      });
    }
  }

  private normalizeSalary(
    role: UserRole,
    salary: string | null | undefined,
  ): string | null {
    const compensation =
      this.compensationFor(role);

    if (
      compensation ===
      CompensationType.FIXED_MONTHLY
    ) {
      if (!salary) {
        throw new BadRequestException({
          code: 'MONTHLY_SALARY_REQUIRED',
          message:
            'Ã˜Â¨Ã˜Â±Ã˜Â§Ã›Å’ Ã˜Â³Ã˜Â±Ã™Â¾Ã˜Â±Ã˜Â³Ã˜Âª Ã™Ë† Ã™Ë†Ã˜Â±Ã˜Â¯Ã˜Â³Ã˜Âª Ã˜Â­Ã™â€šÃ™Ë†Ã™â€š Ã™â€¦Ã˜Â§Ã™â€¡Ã˜Â§Ã™â€ Ã™â€¡ Ã˜Â§Ã™â€žÃ˜Â²Ã˜Â§Ã™â€¦Ã›Å’ Ã˜Â§Ã˜Â³Ã˜Âª.',
        });
      }

      return salary;
    }

    return null;
  }

  private present(user: {
    id: string;
    phone: string;
    fullName: string;
    role: UserRole;
    compensationType: CompensationType;
    isActive: boolean;
    defaultMonthlySalary:
      | { toString(): string }
      | null;
    phoneVerifiedAt: Date | null;
    profileTitle: string | null;
    profileBio: string | null;
    profilePhotoFileName: string | null;
    updatedAt: Date;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      compensationType:
        user.compensationType,
      isActive: user.isActive,
      defaultMonthlySalary:
        user.defaultMonthlySalary
          ?.toString() ?? null,
      phoneVerifiedAt:
        user.phoneVerifiedAt
          ?.toISOString() ?? null,
      profileTitle:
        user.profileTitle,
      profileBio:
        user.profileBio,
      hasProfilePhoto:
        Boolean(
          user.profilePhotoFileName,
        ),
      profilePhotoVersion:
        user.updatedAt.toISOString(),
      createdAt:
        user.createdAt.toISOString(),
      updatedAt:
        user.updatedAt.toISOString(),
    };
  }

  private handleDatabaseError(
    error: unknown,
  ): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (
        error as {
          code?: string;
        }
      ).code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'PHONE_ALREADY_EXISTS',
        message:
          'Ã˜Â§Ã›Å’Ã™â€  Ã˜Â´Ã™â€¦Ã˜Â§Ã˜Â±Ã™â€¡ Ã™â€¦Ã™Ë†Ã˜Â¨Ã˜Â§Ã›Å’Ã™â€ž Ã™â€šÃ˜Â¨Ã™â€žÃ˜Â§Ã™â€¹ Ã˜Â«Ã˜Â¨Ã˜Âª Ã˜Â´Ã˜Â¯Ã™â€¡ Ã˜Â§Ã˜Â³Ã˜Âª.',
      });
    }

    throw error;
  }

  async list(
    dto: ListPersonnelDto,
  ) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 30;
    const q = dto.q?.trim();

    const where = {
      ...(dto.role
        ? {
            role: dto.role,
          }
        : {}),
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
                fullName: {
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
    };

    const [total, users] =
      await Promise.all([
        this.prisma.user.count({
          where,
        }),
        this.prisma.user.findMany({
          where,
          orderBy: [
            {
              isActive: 'desc',
            },
            {
              createdAt: 'asc',
            },
          ],
          skip:
            (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

    return {
      items:
        users.map((user) =>
          this.present(user),
        ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages:
          total === 0
            ? 0
            : Math.ceil(
                total / pageSize,
              ),
      },
    };
  }

  async findOne(id: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },
      });

    if (!user) {
      throw new NotFoundException({
        code: 'PERSONNEL_NOT_FOUND',
        message:
          'Ã™Â¾Ã˜Â±Ã˜Â³Ã™â€ Ã™â€ž Ã™Â¾Ã›Å’Ã˜Â¯Ã˜Â§ Ã™â€ Ã˜Â´Ã˜Â¯.',
      });
    }

    return this.present(user);
  }

  async create(
    actorId: string,
    dto: CreatePersonnelDto,
  ) {
    const phone =
      normalizeIranianMobile(
        dto.phone,
      );

    const compensationType =
      this.compensationFor(
        dto.role,
      );

    const monthlySalary =
      this.normalizeSalary(
        dto.role,
        dto.defaultMonthlySalary,
      );

    try {
      const created =
        await this.prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw<Array<{ id: string }>>`
              SELECT "id"
              FROM "User"
              WHERE "id" = ${actorId}
              FOR UPDATE
            `;

            const user =
              await tx.user.create({
                data: {
                  phone,
                  fullName:
                    dto.fullName.trim(),
                  role: dto.role,
                  compensationType,
                  isActive: true,
                  defaultMonthlySalary:
                    monthlySalary,
                },
              });

            await tx.auditLog.create({
              data: {
                actorId,
                action:
                  'PERSONNEL_CREATED',
                entityType:
                  'User',
                entityId:
                  user.id,
                afterData:
                  this.present(user),
              },
            });

            return user;
          },
        );

      return this.present(created);
    } catch (error) {
      this.handleDatabaseError(
        error,
      );
    }
  }

  async update(
    actorId: string,
    id: string,
    dto: UpdatePersonnelDto,
  ) {
    try {
      const updated =
        await this.prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw<Array<{ id: string }>>`
              SELECT "id"
              FROM "User"
              WHERE "id" = ${actorId}
              FOR UPDATE
            `;

            const existing =
              await tx.user.findUnique({
                where: {
                  id,
                },
              });

            if (!existing) {
              throw new NotFoundException({
                code:
                  'PERSONNEL_NOT_FOUND',
                message:
                  'Ã™Â¾Ã˜Â±Ã˜Â³Ã™â€ Ã™â€ž Ã™Â¾Ã›Å’Ã˜Â¯Ã˜Â§ Ã™â€ Ã˜Â´Ã˜Â¯.',
              });
            }

            if (
              existing.role ===
              UserRole.MANAGER
            ) {
              throw new ForbiddenException({
                code:
                  'MANAGER_PROTECTED',
                message:
                  'Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã™â€¦Ã˜Â¯Ã›Å’Ã˜Â± Ã˜Â§Ã˜Â² Ã˜Â§Ã›Å’Ã™â€  Ã˜Â¨Ã˜Â®Ã˜Â´ Ã™â€šÃ˜Â§Ã˜Â¨Ã™â€ž Ã˜ÂªÃ˜ÂºÃ›Å’Ã›Å’Ã˜Â± Ã™â€ Ã›Å’Ã˜Â³Ã˜Âª.',
              });
            }

            const nextRole =
              dto.role ??
              existing.role;

            this.ensureManageableRole(
              nextRole,
            );

            const nextPhone =
              dto.phone
                ? normalizeIranianMobile(
                    dto.phone,
                  )
                : existing.phone;

            const nextCompensation =
              this.compensationFor(
                nextRole,
              );

            let nextSalary:
              | string
              | null = null;

            if (
              nextCompensation ===
              CompensationType.FIXED_MONTHLY
            ) {
              nextSalary =
                dto.defaultMonthlySalary ??
                existing
                  .defaultMonthlySalary
                  ?.toString() ??
                null;

              if (!nextSalary) {
                throw new BadRequestException({
                  code:
                    'MONTHLY_SALARY_REQUIRED',
                  message:
                    'Ã˜Â¨Ã˜Â±Ã˜Â§Ã›Å’ Ã˜Â³Ã˜Â±Ã™Â¾Ã˜Â±Ã˜Â³Ã˜Âª Ã™Ë† Ã™Ë†Ã˜Â±Ã˜Â¯Ã˜Â³Ã˜Âª Ã˜Â­Ã™â€šÃ™Ë†Ã™â€š Ã™â€¦Ã˜Â§Ã™â€¡Ã˜Â§Ã™â€ Ã™â€¡ Ã˜Â§Ã™â€žÃ˜Â²Ã˜Â§Ã™â€¦Ã›Å’ Ã˜Â§Ã˜Â³Ã˜Âª.',
                });
              }
            }

            const phoneChanged =
              nextPhone !==
              existing.phone;

            const user =
              await tx.user.update({
                where: {
                  id,
                },
                data: {
                  fullName:
                    dto.fullName
                      ?.trim() ??
                    existing.fullName,
                  phone:
                    nextPhone,
                  role:
                    nextRole,
                  compensationType:
                    nextCompensation,
                  defaultMonthlySalary:
                    nextSalary,
                  ...(phoneChanged
                    ? {
                        phoneVerifiedAt:
                          null,
                      }
                    : {}),
                },
              });

            if (phoneChanged) {
              await tx.authSession.updateMany({
                where: {
                  userId:
                    user.id,
                  revokedAt:
                    null,
                },
                data: {
                  revokedAt:
                    new Date(),
                },
              });
            }

            await tx.auditLog.create({
              data: {
                actorId,
                action:
                  'PERSONNEL_UPDATED',
                entityType:
                  'User',
                entityId:
                  user.id,
                beforeData:
                  this.present(existing),
                afterData:
                  this.present(user),
              },
            });

            return user;
          },
        );

      return this.present(updated);
    } catch (error) {
      this.handleDatabaseError(
        error,
      );
    }
  }

  async deactivate(
    actorId: string,
    id: string,
  ) {
    const changed =
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw<Array<{ id: string }>>`
              SELECT "id"
              FROM "User"
              WHERE "id" = ${actorId}
              FOR UPDATE
            `;

          const existing =
            await tx.user.findUnique({
              where: {
                id,
              },
            });

          if (!existing) {
            throw new NotFoundException({
              code:
                'PERSONNEL_NOT_FOUND',
              message:
                'Ã™Â¾Ã˜Â±Ã˜Â³Ã™â€ Ã™â€ž Ã™Â¾Ã›Å’Ã˜Â¯Ã˜Â§ Ã™â€ Ã˜Â´Ã˜Â¯.',
            });
          }

          if (
            existing.role ===
            UserRole.MANAGER
          ) {
            throw new ForbiddenException({
              code:
                'MANAGER_PROTECTED',
              message:
                'Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã™â€¦Ã˜Â¯Ã›Å’Ã˜Â± Ã™â€šÃ˜Â§Ã˜Â¨Ã™â€ž Ã˜ÂºÃ›Å’Ã˜Â±Ã™ÂÃ˜Â¹Ã˜Â§Ã™â€žÃ¢â‚¬Å’Ã˜Â³Ã˜Â§Ã˜Â²Ã›Å’ Ã™â€ Ã›Å’Ã˜Â³Ã˜Âª.',
            });
          }

          if (!existing.isActive) {
            return existing;
          }

          const user =
            await tx.user.update({
              where: {
                id,
              },
              data: {
                isActive: false,
              },
            });

          await tx.authSession.updateMany({
            where: {
              userId: id,
              revokedAt: null,
            },
            data: {
              revokedAt:
                new Date(),
            },
          });

          await tx.auditLog.create({
            data: {
              actorId,
              action:
                'PERSONNEL_DEACTIVATED',
              entityType:
                'User',
              entityId:
                id,
              beforeData:
                this.present(existing),
              afterData:
                this.present(user),
            },
          });

          return user;
        },
      );

    return this.present(changed);
  }

  async activate(
    actorId: string,
    id: string,
  ) {
    const changed =
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw<Array<{ id: string }>>`
              SELECT "id"
              FROM "User"
              WHERE "id" = ${actorId}
              FOR UPDATE
            `;

          const existing =
            await tx.user.findUnique({
              where: {
                id,
              },
            });

          if (!existing) {
            throw new NotFoundException({
              code:
                'PERSONNEL_NOT_FOUND',
              message:
                'Ã™Â¾Ã˜Â±Ã˜Â³Ã™â€ Ã™â€ž Ã™Â¾Ã›Å’Ã˜Â¯Ã˜Â§ Ã™â€ Ã˜Â´Ã˜Â¯.',
            });
          }

          if (
            existing.role ===
            UserRole.MANAGER
          ) {
            throw new ForbiddenException({
              code:
                'MANAGER_PROTECTED',
              message:
                'Ã˜Â­Ã˜Â³Ã˜Â§Ã˜Â¨ Ã™â€¦Ã˜Â¯Ã›Å’Ã˜Â± Ã˜Â§Ã˜Â² Ã˜Â§Ã›Å’Ã™â€  Ã˜Â¨Ã˜Â®Ã˜Â´ Ã™â€¦Ã˜Â¯Ã›Å’Ã˜Â±Ã›Å’Ã˜Âª Ã™â€ Ã™â€¦Ã›Å’Ã¢â‚¬Å’Ã˜Â´Ã™Ë†Ã˜Â¯.',
            });
          }

          if (existing.isActive) {
            return existing;
          }

          const user =
            await tx.user.update({
              where: {
                id,
              },
              data: {
                isActive: true,
              },
            });

          await tx.auditLog.create({
            data: {
              actorId,
              action:
                'PERSONNEL_ACTIVATED',
              entityType:
                'User',
              entityId:
                id,
              beforeData:
                this.present(existing),
              afterData:
                this.present(user),
            },
          });

          return user;
        },
      );

    return this.present(changed);
  }
}