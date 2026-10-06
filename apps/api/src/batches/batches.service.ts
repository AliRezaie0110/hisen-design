import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ApprovalStatus,
  BatchStatus,
  OwnerPricingType,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeBatchStatusDto } from './dto/change-batch-status.dto';
import { CreateWorkBatchDto } from './dto/create-work-batch.dto';
import { ListWorkBatchesDto } from './dto/list-work-batches.dto';

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private decimal(
    value:
      | { toString(): string }
      | null
      | undefined,
  ): string | null {
    return value?.toString() ?? null;
  }

  private pricing(
    dto: CreateWorkBatchDto,
  ) {
    if (
      dto.ownerPricingType ===
      OwnerPricingType.PER_PIECE
    ) {
      if (!dto.ownerUnitPrice) {
        throw new BadRequestException({
          code:
            'OWNER_UNIT_PRICE_REQUIRED',
          message:
            'برای قیمت‌گذاری دانه‌ای، قیمت هر عدد الزامی است.',
        });
      }

      if (
        dto.ownerFixedAmount !==
        undefined
      ) {
        throw new BadRequestException({
          code:
            'OWNER_FIXED_AMOUNT_NOT_ALLOWED',
          message:
            'برای قیمت‌گذاری دانه‌ای مبلغ کل نباید وارد شود.',
        });
      }

      return {
        ownerUnitPrice:
          dto.ownerUnitPrice,
        ownerFixedAmount:
          null,
      };
    }

    if (!dto.ownerFixedAmount) {
      throw new BadRequestException({
        code:
          'OWNER_FIXED_AMOUNT_REQUIRED',
        message:
          'برای مبلغ ثابت، مبلغ کل الزامی است.',
      });
    }

    if (
      dto.ownerUnitPrice !==
      undefined
    ) {
      throw new BadRequestException({
        code:
          'OWNER_UNIT_PRICE_NOT_ALLOWED',
        message:
          'برای مبلغ ثابت، قیمت دانه‌ای نباید وارد شود.',
      });
    }

    return {
      ownerUnitPrice:
        null,
      ownerFixedAmount:
        dto.ownerFixedAmount,
    };
  }

  private normalizedSizes(
    dto: CreateWorkBatchDto,
  ) {
    const sizes =
      dto.sizes.map(
        (item, index) => ({
          label:
            item.label.trim(),
          quantity:
            item.quantity,
          sortOrder:
            index,
        }),
      );

    if (
      sizes.some(
        (item) =>
          !item.label,
      )
    ) {
      throw new BadRequestException({
        code:
          'BATCH_SIZE_LABEL_REQUIRED',
        message:
          'نام یا شماره سایز نمی‌تواند خالی باشد.',
      });
    }

    const normalizedLabels =
      sizes.map(
        (item) =>
          item.label
            .toLocaleLowerCase(
              'fa-IR',
            ),
      );

    if (
      new Set(
        normalizedLabels,
      ).size !==
      normalizedLabels.length
    ) {
      throw new BadRequestException({
        code:
          'DUPLICATE_BATCH_SIZE',
        message:
          'یک سایز در این سری‌کار بیشتر از یک بار وارد شده است.',
      });
    }

    const total =
      sizes.reduce(
        (
          sum,
          item,
        ) =>
          sum +
          item.quantity,
        0,
      );

    if (
      total !==
      dto.totalQuantity
    ) {
      throw new BadRequestException({
        code:
          'BATCH_SIZE_TOTAL_MISMATCH',
        message:
          'جمع تعداد سایزها باید دقیقاً با تعداد کل سری‌کار برابر باشد.',
        sizeTotal:
          total,
        batchTotal:
          dto.totalQuantity,
      });
    }

    return sizes;
  }

  private operationIds(
    dto: CreateWorkBatchDto,
  ) {
    const operationIds =
      dto.operations.map(
        (item) =>
          item.operationId,
      );

    if (
      new Set(
        operationIds,
      ).size !==
      operationIds.length
    ) {
      throw new BadRequestException({
        code:
          'DUPLICATE_BATCH_OPERATION',
        message:
          'یک عملیات در سری‌کار دوبار انتخاب شده است.',
      });
    }

    return operationIds;
  }

  private async presentBatch(
    batch: {
      id: string;
      code: string;
      ownerId: string;
      modelName: string | null;
      totalQuantity: number;
      ownerPricingType:
        OwnerPricingType;
      ownerUnitPrice:
        | { toString(): string }
        | null;
      ownerFixedAmount:
        | { toString(): string }
        | null;
      status: BatchStatus;
      startDate: Date | null;
      completedAt:
        Date | null;
      note:
        string | null;
    },
  ) {
    const [
      owner,
      batchOperations,
      sizes,
    ] =
      await Promise.all([
        this.prisma.owner.findUnique({
          where: {
            id: batch.ownerId,
          },
        }),
        this.prisma.batchOperation.findMany({
          where: {
            workBatchId:
              batch.id,
          },
          orderBy: {
            createdAt:
              'asc',
          },
        }),
        this.prisma.workBatchSize.findMany({
          where: {
            workBatchId:
              batch.id,
          },
          orderBy: [
            {
              sortOrder:
                'asc',
            },
            {
              createdAt:
                'asc',
            },
          ],
        }),
      ]);

    const operationIds =
      batchOperations.map(
        (item) =>
          item.operationId,
      );

    const operations =
      operationIds.length
        ? await this.prisma.operation.findMany({
            where: {
              id: {
                in:
                  operationIds,
              },
            },
          })
        : [];

    const operationMap =
      new Map(
        operations.map(
          (operation) => [
            operation.id,
            operation,
          ],
        ),
      );

    return {
      id:
        batch.id,
      code:
        batch.code,
      owner: owner
        ? {
            id:
              owner.id,
            name:
              owner.name,
            isActive:
              owner.isActive,
          }
        : null,
      modelName:
        batch.modelName,
      totalQuantity:
        batch.totalQuantity,
      ownerPricingType:
        batch.ownerPricingType,
      ownerUnitPrice:
        this.decimal(
          batch.ownerUnitPrice,
        ),
      ownerFixedAmount:
        this.decimal(
          batch.ownerFixedAmount,
        ),
      status:
        batch.status,
      startDate:
        batch.startDate
          ?.toISOString() ??
        null,
      completedAt:
        batch.completedAt
          ?.toISOString() ??
        null,
      note:
        batch.note,
      sizes:
        sizes.map(
          (size) => ({
            id:
              size.id,
            label:
              size.label,
            quantity:
              size.quantity,
            sortOrder:
              size.sortOrder,
            isActive:
              size.isActive,
          }),
        ),
      operations:
        batchOperations.map(
          (item) => {
            const operation =
              operationMap.get(
                item.operationId,
              );

            return {
              batchOperationId:
                item.id,
              operationId:
                item.operationId,
              name:
                operation?.name ??
                'Unknown',
              isOperationActive:
                operation?.isActive ??
                false,
              isBatchOperationActive:
                item.isActive,
              targetQuantity:
                item.targetQuantity,
              claimedQuantity:
                item.claimedQuantity,
              approvedQuantity:
                item.approvedQuantity,
              unitRate:
                item.unitRate.toString(),
              remainingQuantity:
                Math.max(
                  0,
                  item.targetQuantity -
                    item.claimedQuantity,
                ),
            };
          },
        ),
    };
  }

  async list(
    dto: ListWorkBatchesDto,
  ) {
    const page =
      dto.page ?? 1;

    const pageSize =
      dto.pageSize ?? 30;

    const q =
      dto.q?.trim();

    const where = {
      ...(dto.ownerId
        ? {
            ownerId:
              dto.ownerId,
          }
        : {}),
      ...(dto.status
        ? {
            status:
              dto.status,
          }
        : {}),
      ...(q
        ? {
            OR: [
              {
                code: {
                  contains: q,
                  mode:
                    'insensitive' as const,
                },
              },
              {
                modelName: {
                  contains: q,
                  mode:
                    'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [total, batches] =
      await Promise.all([
        this.prisma.workBatch.count({
          where,
        }),

        this.prisma.workBatch.findMany({
          where,
          orderBy: {
            startDate:
              'desc',
          },
          skip:
            (page - 1) *
            pageSize,
          take:
            pageSize,
        }),
      ]);

    return {
      items:
        await Promise.all(
          batches.map(
            (batch) =>
              this.presentBatch(
                batch,
              ),
          ),
        ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages:
          total === 0
            ? 0
            : Math.ceil(
                total /
                  pageSize,
              ),
      },
    };
  }

  async findOne(id: string) {
    const batch =
      await this.prisma.workBatch.findUnique({
        where: {
          id,
        },
      });

    if (!batch) {
      throw new NotFoundException({
        code:
          'BATCH_NOT_FOUND',
        message:
          'سری‌کار پیدا نشد.',
      });
    }

    return this.presentBatch(
      batch,
    );
  }

  async create(
    actorId: string,
    dto: CreateWorkBatchDto,
  ) {
    const pricing =
      this.pricing(dto);

    const operationIds =
      this.operationIds(dto);

    const sizes =
      this.normalizedSizes(dto);

    try {
      const batch =
        await this.prisma.$transaction(
          async (tx) => {
            const owner =
              await tx.owner.findUnique({
                where: {
                  id:
                    dto.ownerId,
                },
              });

            if (
              !owner ||
              !owner.isActive
            ) {
              throw new BadRequestException({
                code:
                  'OWNER_NOT_ACTIVE',
                message:
                  'صاحبکار فعال نیست یا پیدا نشد.',
              });
            }

            const activeOperations =
              await tx.operation.findMany({
                where: {
                  id: {
                    in:
                      operationIds,
                  },
                  isActive:
                    true,
                },
                select: {
                  id: true,
                },
              });

            if (
              activeOperations.length !==
              operationIds.length
            ) {
              throw new BadRequestException({
                code:
                  'INVALID_BATCH_OPERATIONS',
                message:
                  'یک یا چند عملیات انتخاب‌شده معتبر یا فعال نیستند.',
              });
            }

            const created =
              await tx.workBatch.create({
                data: {
                  code:
                    dto.code
                      .trim()
                      .toUpperCase(),
                  ownerId:
                    dto.ownerId,
                  modelName:
                    dto.modelName?.trim() ||
                    null,
                  totalQuantity:
                    dto.totalQuantity,
                  ownerPricingType:
                    dto.ownerPricingType,
                  ownerUnitPrice:
                    pricing.ownerUnitPrice,
                  ownerFixedAmount:
                    pricing.ownerFixedAmount,
                  status:
                    BatchStatus.ACTIVE,
                  startDate:
                    dto.startDate
                      ? new Date(
                          dto.startDate,
                        )
                      : new Date(),
                  note:
                    dto.note?.trim() ||
                    null,
                },
              });

            await Promise.all([
              tx.batchOperation.createMany({
                data:
                  dto.operations.map(
                    (item) => ({
                      workBatchId:
                        created.id,
                      operationId:
                        item.operationId,
                      targetQuantity:
                        item.targetQuantity ??
                        dto.totalQuantity,
                      claimedQuantity:
                        0,
                      approvedQuantity:
                        0,
                      unitRate:
                        item.unitRate,
                      isActive:
                        true,
                    }),
                  ),
              }),
              tx.workBatchSize.createMany({
                data:
                  sizes.map(
                    (size) => ({
                      workBatchId:
                        created.id,
                      label:
                        size.label,
                      quantity:
                        size.quantity,
                      sortOrder:
                        size.sortOrder,
                      isActive:
                        true,
                    }),
                  ),
              }),
            ]);

            await tx.auditLog.create({
              data: {
                actorId,
                action:
                  'WORK_BATCH_CREATED',
                entityType:
                  'WorkBatch',
                entityId:
                  created.id,
                afterData: {
                  code:
                    created.code,
                  ownerId:
                    created.ownerId,
                  modelName:
                    created.modelName,
                  totalQuantity:
                    created.totalQuantity,
                  ownerPricingType:
                    created.ownerPricingType,
                  ownerUnitPrice:
                    created.ownerUnitPrice
                      ?.toString() ??
                    null,
                  ownerFixedAmount:
                    created.ownerFixedAmount
                      ?.toString() ??
                    null,
                  operations:
                    dto.operations.map(
                      (item) => ({
                        operationId:
                          item.operationId,
                        targetQuantity:
                          item.targetQuantity ??
                          dto.totalQuantity,
                        unitRate:
                          item.unitRate,
                      }),
                    ),
                  sizes,
                },
              },
            });

            return created;
          },
        );

      return this.presentBatch(
        batch,
      );
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(
    actorId: string,
    id: string,
    dto: CreateWorkBatchDto,
  ) {
    const pricing =
      this.pricing(dto);

    const operationIds =
      this.operationIds(dto);

    const sizes =
      this.normalizedSizes(dto);

    try {
      const updated =
        await this.prisma.$transaction(
          async (tx) => {
            const locked =
              await tx.$queryRaw<
                Array<{
                  id: string;
                }>
              >`
                SELECT "id"
                FROM "WorkBatch"
                WHERE "id" = ${id}
                FOR UPDATE
              `;

            if (
              locked.length !==
              1
            ) {
              throw new NotFoundException({
                code:
                  'BATCH_NOT_FOUND',
                message:
                  'سری‌کار پیدا نشد.',
              });
            }

            const existing =
              await tx.workBatch.findUnique({
                where: {
                  id,
                },
              });

            if (!existing) {
              throw new NotFoundException({
                code:
                  'BATCH_NOT_FOUND',
                message:
                  'سری‌کار پیدا نشد.',
              });
            }

            if (
              existing.status ===
              BatchStatus.ARCHIVED
            ) {
              throw new ConflictException({
                code:
                  'BATCH_ARCHIVED_LOCKED',
                message:
                  'سری‌کار بایگانی‌شده قفل است. برای اصلاح ابتدا وضعیت آن را تغییر دهید.',
              });
            }

            const owner =
              await tx.owner.findUnique({
                where: {
                  id:
                    dto.ownerId,
                },
              });

            if (
              !owner ||
              (
                !owner.isActive &&
                owner.id !==
                  existing.ownerId
              )
            ) {
              throw new BadRequestException({
                code:
                  'OWNER_NOT_ACTIVE',
                message:
                  'صاحبکار فعال نیست یا پیدا نشد.',
              });
            }

            const existingOperations =
              await tx.batchOperation.findMany({
                where: {
                  workBatchId:
                    id,
                },
              });

            const existingOperationMap =
              new Map(
                existingOperations.map(
                  (item) => [
                    item.operationId,
                    item,
                  ],
                ),
              );

            const newOperationIds =
              operationIds.filter(
                (operationId) =>
                  !existingOperationMap.has(
                    operationId,
                  ),
              );

            if (
              newOperationIds.length >
              0
            ) {
              const activeNew =
                await tx.operation.findMany({
                  where: {
                    id: {
                      in:
                        newOperationIds,
                    },
                    isActive:
                      true,
                  },
                  select: {
                    id: true,
                  },
                });

              if (
                activeNew.length !==
                newOperationIds.length
              ) {
                throw new BadRequestException({
                  code:
                    'INVALID_BATCH_OPERATIONS',
                  message:
                    'عملیات جدید انتخاب‌شده معتبر یا فعال نیست.',
                });
              }
            }

            const highestClaimed =
              existingOperations.reduce(
                (
                  highest,
                  item,
                ) =>
                  Math.max(
                    highest,
                    item.claimedQuantity,
                  ),
                0,
              );

            if (
              dto.totalQuantity <
              highestClaimed
            ) {
              throw new ConflictException({
                code:
                  'BATCH_TOTAL_BELOW_CLAIMED',
                message:
                  'تعداد کل سری‌کار نمی‌تواند از کار ثبت‌شده کمتر شود.',
                minimumQuantity:
                  highestClaimed,
              });
            }

            for (
              const item of
              dto.operations
            ) {
              const target =
                item.targetQuantity ??
                dto.totalQuantity;

              const current =
                existingOperationMap.get(
                  item.operationId,
                );

              if (
                current &&
                target <
                  current.claimedQuantity
              ) {
                throw new ConflictException({
                  code:
                    'BATCH_OPERATION_TARGET_BELOW_CLAIMED',
                  message:
                    'تعداد هدف عملیات نمی‌تواند از تعداد ثبت‌شده کمتر شود.',
                  operationId:
                    item.operationId,
                  minimumQuantity:
                    current.claimedQuantity,
                });
              }

              if (current) {
                const rateChanged =
                  current.unitRate.toString() !==
                  item.unitRate;

                await tx.batchOperation.update({
                  where: {
                    id:
                      current.id,
                  },
                  data: {
                    targetQuantity:
                      target,
                    unitRate:
                      item.unitRate,
                    isActive:
                      true,
                  },
                });

                if (rateChanged) {
                  await tx.$executeRaw`
                    UPDATE "WorkEntry"
                    SET
                      "unitRate" = ${item.unitRate}::numeric,
                      "totalAmount" = "quantity" * ${item.unitRate}::numeric,
                      "updatedAt" = NOW()
                    WHERE "batchOperationId" = ${current.id}
                  `;

                  await tx.auditLog.create({
                    data: {
                      actorId,
                      action:
                        'BATCH_OPERATION_RATE_CHANGED',
                      entityType:
                        'BatchOperation',
                      entityId:
                        current.id,
                      beforeData: {
                        unitRate:
                          current.unitRate.toString(),
                      },
                      afterData: {
                        unitRate:
                          item.unitRate,
                        workBatchId:
                          id,
                        operationId:
                          item.operationId,
                      },
                    },
                  });
                }
              } else {
                await tx.batchOperation.create({
                  data: {
                    workBatchId:
                      id,
                    operationId:
                      item.operationId,
                    targetQuantity:
                      target,
                    claimedQuantity:
                      0,
                    approvedQuantity:
                      0,
                    unitRate:
                      item.unitRate,
                    isActive:
                      true,
                  },
                });
              }
            }

            const selectedOperationIds =
              new Set(
                operationIds,
              );

            for (
              const item of
              existingOperations
            ) {
              if (
                !selectedOperationIds.has(
                  item.operationId,
                ) &&
                item.isActive
              ) {
                await tx.batchOperation.update({
                  where: {
                    id:
                      item.id,
                  },
                  data: {
                    isActive:
                      false,
                  },
                });
              }
            }

            const existingSizes =
              await tx.workBatchSize.findMany({
                where: {
                  workBatchId:
                    id,
                },
              });

            const liveEntries =
              await tx.workEntry.findMany({
                where: {
                  workBatchSize: {
                    workBatchId:
                      id,
                  },
                  status: {
                    in: [
                      ApprovalStatus.PENDING,
                      ApprovalStatus.APPROVED,
                    ],
                  },
                },
                select: {
                  workBatchSizeId:
                    true,
                  batchOperationId:
                    true,
                  quantity:
                    true,
                },
              });

            const usedPerSizeOperation =
              new Map<
                string,
                number
              >();

            for (
              const entry of
              liveEntries
            ) {
              const key =
                `${entry.workBatchSizeId}:${entry.batchOperationId}`;

              usedPerSizeOperation.set(
                key,
                (
                  usedPerSizeOperation.get(
                    key,
                  ) ?? 0
                ) +
                  entry.quantity,
              );
            }

            const minimumBySize =
              new Map<
                string,
                number
              >();

            for (
              const [
                key,
                quantity,
              ] of
              usedPerSizeOperation
            ) {
              const sizeId =
                key.split(
                  ':',
                )[0];

              minimumBySize.set(
                sizeId,
                Math.max(
                  minimumBySize.get(
                    sizeId,
                  ) ?? 0,
                  quantity,
                ),
              );
            }

            const existingSizeByLabel =
              new Map(
                existingSizes.map(
                  (size) => [
                    size.label
                      .trim()
                      .toLocaleLowerCase(
                        'fa-IR',
                      ),
                    size,
                  ],
                ),
              );

            const selectedSizeIds =
              new Set<string>();

            for (
              const size of
              sizes
            ) {
              const key =
                size.label
                  .toLocaleLowerCase(
                    'fa-IR',
                  );

              const current =
                existingSizeByLabel.get(
                  key,
                );

              if (current) {
                const minimum =
                  minimumBySize.get(
                    current.id,
                  ) ?? 0;

                if (
                  size.quantity <
                  minimum
                ) {
                  throw new ConflictException({
                    code:
                      'BATCH_SIZE_QUANTITY_BELOW_CLAIMED',
                    message:
                      'تعداد این سایز نمی‌تواند از تعداد ثبت‌شده آن کمتر شود.',
                    sizeId:
                      current.id,
                    sizeLabel:
                      current.label,
                    minimumQuantity:
                      minimum,
                  });
                }

                await tx.workBatchSize.update({
                  where: {
                    id:
                      current.id,
                  },
                  data: {
                    label:
                      size.label,
                    quantity:
                      size.quantity,
                    sortOrder:
                      size.sortOrder,
                    isActive:
                      true,
                  },
                });

                selectedSizeIds.add(
                  current.id,
                );
              } else {
                const createdSize =
                  await tx.workBatchSize.create({
                    data: {
                      workBatchId:
                        id,
                      label:
                        size.label,
                      quantity:
                        size.quantity,
                      sortOrder:
                        size.sortOrder,
                      isActive:
                        true,
                    },
                  });

                selectedSizeIds.add(
                  createdSize.id,
                );
              }
            }

            for (
              const size of
              existingSizes
            ) {
              if (
                !selectedSizeIds.has(
                  size.id,
                ) &&
                size.isActive
              ) {
                await tx.workBatchSize.update({
                  where: {
                    id:
                      size.id,
                  },
                  data: {
                    isActive:
                      false,
                  },
                });
              }
            }

            const batch =
              await tx.workBatch.update({
                where: {
                  id,
                },
                data: {
                  code:
                    dto.code
                      .trim()
                      .toUpperCase(),
                  ownerId:
                    dto.ownerId,
                  modelName:
                    dto.modelName?.trim() ||
                    null,
                  totalQuantity:
                    dto.totalQuantity,
                  ownerPricingType:
                    dto.ownerPricingType,
                  ownerUnitPrice:
                    pricing.ownerUnitPrice,
                  ownerFixedAmount:
                    pricing.ownerFixedAmount,
                  startDate:
                    dto.startDate
                      ? new Date(
                          dto.startDate,
                        )
                      : existing.startDate,
                  note:
                    dto.note?.trim() ||
                    null,
                },
              });

            await tx.auditLog.create({
              data: {
                actorId,
                action:
                  'WORK_BATCH_UPDATED',
                entityType:
                  'WorkBatch',
                entityId:
                  id,
                beforeData: {
                  code:
                    existing.code,
                  ownerId:
                    existing.ownerId,
                  modelName:
                    existing.modelName,
                  totalQuantity:
                    existing.totalQuantity,
                },
                afterData: {
                  code:
                    batch.code,
                  ownerId:
                    batch.ownerId,
                  modelName:
                    batch.modelName,
                  totalQuantity:
                    batch.totalQuantity,
                  operations:
                    dto.operations.map(
                      (item) => ({
                        operationId:
                          item.operationId,
                        targetQuantity:
                          item.targetQuantity ??
                          dto.totalQuantity,
                        unitRate:
                          item.unitRate,
                      }),
                    ),
                  sizes,
                },
              },
            });

            return batch;
          },
        );

      return this.presentBatch(
        updated,
      );
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async remove(
    actorId: string,
    id: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const existing =
          await tx.workBatch.findUnique({
            where: {
              id,
            },
          });

        if (!existing) {
          throw new NotFoundException({
            code:
              'BATCH_NOT_FOUND',
            message:
              'سری‌کار پیدا نشد.',
          });
        }

        const [
          workEntryCount,
          ownerPaymentCount,
        ] =
          await Promise.all([
            tx.workEntry.count({
              where: {
                batchOperation: {
                  workBatchId:
                    id,
                },
              },
            }),
            tx.ownerPayment.count({
              where: {
                workBatchId:
                  id,
              },
            }),
          ]);

        if (
          workEntryCount > 0 ||
          ownerPaymentCount > 0
        ) {
          throw new ConflictException({
            code:
              'BATCH_DELETE_HAS_HISTORY',
            message:
              'این سری‌کار سابقه کارکرد یا حساب دارد و قابل حذف نیست؛ آن را لغو یا بایگانی کنید.',
          });
        }

        await tx.auditLog.create({
          data: {
            actorId,
            action:
              'WORK_BATCH_DELETED',
            entityType:
              'WorkBatch',
            entityId:
              id,
            beforeData: {
              code:
                existing.code,
              ownerId:
                existing.ownerId,
              modelName:
                existing.modelName,
              totalQuantity:
                existing.totalQuantity,
              status:
                existing.status,
            },
          },
        });

        await tx.workBatch.delete({
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

  private rethrowUnique(
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
          'BATCH_CODE_OR_SIZE_ALREADY_EXISTS',
        message:
          'کد سری‌کار یا نام سایز تکراری است.',
      });
    }

    throw error;
  }

  async changeStatus(
    actorId: string,
    id: string,
    dto: ChangeBatchStatusDto,
  ) {
    const batch =
      await this.prisma.$transaction(
        async (tx) => {
          const existing =
            await tx.workBatch.findUnique({
              where: {
                id,
              },
            });

          if (!existing) {
            throw new NotFoundException({
              code:
                'BATCH_NOT_FOUND',
              message:
                'سری‌کار پیدا نشد.',
            });
          }

          const updated =
            await tx.workBatch.update({
              where: {
                id,
              },
              data: {
                status:
                  dto.status,
                completedAt:
                  dto.status ===
                  BatchStatus.COMPLETED
                    ? new Date()
                    : null,
              },
            });

          await tx.auditLog.create({
            data: {
              actorId,
              action:
                'WORK_BATCH_STATUS_CHANGED',
              entityType:
                'WorkBatch',
              entityId:
                id,
              beforeData: {
                status:
                  existing.status,
                completedAt:
                  existing.completedAt
                    ?.toISOString() ??
                  null,
              },
              afterData: {
                status:
                  updated.status,
                completedAt:
                  updated.completedAt
                    ?.toISOString() ??
                  null,
              },
            },
          });

          return updated;
        },
      );

    return this.presentBatch(
      batch,
    );
  }
}
