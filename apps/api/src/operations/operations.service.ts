import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  ChangeOperationRateDto,
} from './dto/change-operation-rate.dto';
import {
  CreateOperationDto,
} from './dto/create-operation.dto';
import {
  UpdateOperationDto,
} from './dto/update-operation.dto';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private today(): Date {
    const now = new Date();

    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      ),
    );
  }

  private previousDay(
    date: Date,
  ): Date {
    return new Date(
      date.getTime() -
        24 * 60 * 60 * 1000,
    );
  }

  private rateValue(
    value:
      | { toString(): string }
      | null
      | undefined,
  ): string | null {
    return value?.toString() ?? null;
  }

  private async currentRate(
    operationId: string,
  ) {
    const today =
      this.today();

    return this.prisma.operationRate.findFirst({
      where: {
        operationId,
        effectiveFrom: {
          lte: today,
        },
        OR: [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: {
              gte: today,
            },
          },
        ],
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });
  }

  private async present(
    operation: {
      id: string;
      name: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    const rate =
      await this.currentRate(
        operation.id,
      );

    return {
      id:
        operation.id,
      name:
        operation.name,
      isActive:
        operation.isActive,
      currentRate:
        this.rateValue(
          rate?.amount,
        ),
      currentRateEffectiveFrom:
        rate?.effectiveFrom
          .toISOString()
          .slice(0, 10) ??
        null,
      createdAt:
        operation.createdAt
          .toISOString(),
      updatedAt:
        operation.updatedAt
          .toISOString(),
    };
  }

  private handleUnique(
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
        code:
          'OPERATION_ALREADY_EXISTS',
        message:
          'عملیاتی با این نام قبلاً ثبت شده است.',
      });
    }

    throw error;
  }

  async list(
    includeInactive = false,
  ) {
    const operations =
      await this.prisma.operation.findMany({
        where:
          includeInactive
            ? undefined
            : {
                isActive: true,
              },
        orderBy: [
          {
            isActive:
              'desc',
          },
          {
            createdAt:
              'asc',
          },
        ],
      });

    return {
      items:
        await Promise.all(
          operations.map(
            (operation) =>
              this.present(
                operation,
              ),
          ),
        ),
    };
  }

  async checklist() {
    const operations =
      await this.prisma.operation.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

    const items =
      await Promise.all(
        operations.map(
          async (operation) => {
            const presented =
              await this.present(
                operation,
              );

            return {
              ...presented,

              // Front-end will render
              // these as unchecked options
              // for every new batch.
              selected: false,
            };
          },
        ),
      );

    return {
      items,
    };
  }

  async findOne(
    id: string,
  ) {
    const operation =
      await this.prisma.operation.findUnique({
        where: {
          id,
        },
      });

    if (!operation) {
      throw new NotFoundException({
        code:
          'OPERATION_NOT_FOUND',
        message:
          'عملیات پیدا نشد.',
      });
    }

    const history =
      await this.prisma.operationRate.findMany({
        where: {
          operationId:
            operation.id,
        },
        orderBy: {
          effectiveFrom:
            'desc',
        },
      });

    return {
      ...(await this.present(
        operation,
      )),
      rateHistory:
        history.map(
          (rate) => ({
            id:
              rate.id,
            amount:
              rate.amount.toString(),
            effectiveFrom:
              rate.effectiveFrom
                .toISOString()
                .slice(0, 10),
            effectiveTo:
              rate.effectiveTo
                ?.toISOString()
                .slice(0, 10) ??
              null,
          }),
        ),
    };
  }

  async create(
    actorId: string,
    dto: CreateOperationDto,
  ) {
    try {
      const result =
        await this.prisma.$transaction(
          async (tx) => {
            const name =
              dto.name.trim();

            const operation =
              await tx.operation.create({
                data: {
                  name,
                  isActive: true,
                },
              });

            const rate =
              await tx.operationRate.create({
                data: {
                  operationId:
                    operation.id,
                  amount:
                    dto.initialRate,
                  effectiveFrom:
                    this.today(),
                },
              });

            await tx.auditLog.create({
              data: {
                actorId,
                action:
                  'OPERATION_CREATED',
                entityType:
                  'Operation',
                entityId:
                  operation.id,
                afterData: {
                  name:
                    operation.name,
                  isActive:
                    operation.isActive,
                  initialRate:
                    rate.amount.toString(),
                },
              },
            });

            return operation;
          },
        );

      return this.present(
        result,
      );
    } catch (error) {
      this.handleUnique(
        error,
      );
    }
  }

  async update(
    actorId: string,
    id: string,
    dto: UpdateOperationDto,
  ) {
    try {
      const operation =
        await this.prisma.$transaction(
          async (tx) => {
            const existing =
              await tx.operation.findUnique({
                where: {
                  id,
                },
              });

            if (!existing) {
              throw new NotFoundException({
                code:
                  'OPERATION_NOT_FOUND',
                message:
                  'عملیات پیدا نشد.',
              });
            }

            const updated =
              await tx.operation.update({
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
                  ...(dto.isActive !==
                  undefined
                    ? {
                        isActive:
                          dto.isActive,
                      }
                    : {}),
                },
              });

            await tx.auditLog.create({
              data: {
                actorId,
                action:
                  'OPERATION_UPDATED',
                entityType:
                  'Operation',
                entityId:
                  id,
                beforeData: {
                  name:
                    existing.name,
                  isActive:
                    existing.isActive,
                },
                afterData: {
                  name:
                    updated.name,
                  isActive:
                    updated.isActive,
                },
              },
            });

            return updated;
          },
        );

      return this.present(
        operation,
      );
    } catch (error) {
      this.handleUnique(
        error,
      );
    }
  }

  async changeRate(
    actorId: string,
    id: string,
    dto: ChangeOperationRateDto,
  ) {
    const today =
      this.today();

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const locked =
            await tx.$queryRaw<
              Array<{
                id: string;
              }>
            >`
              SELECT "id"
              FROM "Operation"
              WHERE "id" = ${id}
              FOR UPDATE
            `;

          if (
            locked.length !== 1
          ) {
            throw new NotFoundException({
              code:
                'OPERATION_NOT_FOUND',
              message:
                'عملیات پیدا نشد.',
            });
          }

          const sameDayRate =
            await tx.operationRate.findUnique({
              where: {
                operationId_effectiveFrom: {
                  operationId:
                    id,
                  effectiveFrom:
                    today,
                },
              },
            });

          if (sameDayRate) {
            const updated =
              await tx.operationRate.update({
                where: {
                  id:
                    sameDayRate.id,
                },
                data: {
                  amount:
                    dto.amount,
                },
              });

            await tx.auditLog.create({
              data: {
                actorId,
                action:
                  'OPERATION_RATE_UPDATED',
                entityType:
                  'Operation',
                entityId:
                  id,
                beforeData: {
                  amount:
                    sameDayRate
                      .amount
                      .toString(),
                },
                afterData: {
                  amount:
                    updated
                      .amount
                      .toString(),
                },
              },
            });

            return updated;
          }

          const openRate =
            await tx.operationRate.findFirst({
              where: {
                operationId:
                  id,
                effectiveTo:
                  null,
                effectiveFrom: {
                  lt: today,
                },
              },
              orderBy: {
                effectiveFrom:
                  'desc',
              },
            });

          if (openRate) {
            await tx.operationRate.update({
              where: {
                id:
                  openRate.id,
              },
              data: {
                effectiveTo:
                  this.previousDay(
                    today,
                  ),
              },
            });
          }

          const created =
            await tx.operationRate.create({
              data: {
                operationId:
                  id,
                amount:
                  dto.amount,
                effectiveFrom:
                  today,
              },
            });

          await tx.auditLog.create({
            data: {
              actorId,
              action:
                'OPERATION_RATE_CHANGED',
              entityType:
                'Operation',
              entityId:
                id,
              beforeData: {
                amount:
                  openRate
                    ?.amount
                    .toString() ??
                  null,
              },
              afterData: {
                amount:
                  created
                    .amount
                    .toString(),
                effectiveFrom:
                  today
                    .toISOString()
                    .slice(0, 10),
              },
            },
          });

          return created;
        },
      );

    return {
      operationId:
        id,
      amount:
        result.amount.toString(),
      effectiveFrom:
        result.effectiveFrom
          .toISOString()
          .slice(0, 10),
    };
  }

  async remove(
    actorId: string,
    id: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const operation =
          await tx.operation.findUnique({
            where: {
              id,
            },
          });

        if (!operation) {
          throw new NotFoundException({
            code:
              'OPERATION_NOT_FOUND',
            message:
              'عملیات پیدا نشد.',
          });
        }

        const usageCount =
          await tx.batchOperation.count({
            where: {
              operationId:
                id,
            },
          });

        if (usageCount > 0) {
          const updated =
            await tx.operation.update({
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
              actorId,
              action:
                'OPERATION_DELETE_CONVERTED_TO_DEACTIVATE',
              entityType:
                'Operation',
              entityId:
                id,
              beforeData: {
                name:
                  operation.name,
                isActive:
                  operation.isActive,
              },
              afterData: {
                isActive:
                  updated.isActive,
                usageCount,
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
            actorId,
            action:
              'OPERATION_DELETED',
            entityType:
              'Operation',
            entityId:
              id,
            beforeData: {
              name:
                operation.name,
              isActive:
                operation.isActive,
            },
          },
        });

        await tx.operationRate.deleteMany({
          where: {
            operationId:
              id,
          },
        });

        await tx.operation.delete({
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

}
