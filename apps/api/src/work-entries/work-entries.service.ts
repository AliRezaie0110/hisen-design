import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ApprovalStatus,
  BatchStatus,
  CompensationType,
  UserRole,
} from '../generated/prisma/enums';
import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  SmsService,
} from '../auth/sms.service';
import {
  CreateWorkEntryDto,
} from './dto/create-work-entry.dto';
import {
  ReviewWorkEntryDto,
} from './dto/review-work-entry.dto';

@Injectable()
export class WorkEntriesService {
  constructor(
    private readonly prisma:
      PrismaService,
    private readonly sms:
      SmsService,
  ) {}

  private today(): Date {
    const now =
      new Date();

    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
      ),
    );
  }

  private money(
    value:
      | {
          toString(): string;
        }
      | string
      | null
      | undefined,
  ): string | null {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    return value.toString();
  }

  private errorMessage(
    error: unknown,
  ): string {
    if (
      error instanceof Error
    ) {
      return error.message;
    }

    return 'SMS_SEND_FAILED';
  }

  private async safeSmsAudit(
    actorId: string,
    workEntryId: string,
    action: string,
    data: Record<
      string,
      string | number | boolean | null
    >,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          entityType:
            'WorkEntry',
          entityId:
            workEntryId,
          afterData:
            data,
        },
      });
    } catch {
      // SMS audit failure must never
      // revert an already approved job.
    }
  }

  async available(
    workerId: string,
  ) {
    const worker =
      await this.prisma.user.findUnique({
        where: {
          id:
            workerId,
        },
      });

    if (
      !worker ||
      !worker.isActive ||
      worker.role !==
        UserRole.WORKER ||
      worker.compensationType !==
        CompensationType.PIECE_RATE
    ) {
      throw new BadRequestException({
        code:
          'WORKER_NOT_ELIGIBLE',
        message:
          'کاربر امکان ثبت کار دانه‌ای را ندارد.',
      });
    }

    const batchOperations =
      await this.prisma.batchOperation.findMany({
        where: {
          isActive:
            true,
          workBatch: {
            status:
              BatchStatus.ACTIVE,
          },
        },
        include: {
          operation:
            true,
          workBatch: {
            include: {
              sizes: {
                where: {
                  isActive:
                    true,
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
              },
            },
          },
        },
        orderBy: {
          createdAt:
            'asc',
        },
      });

    const batchOperationIds =
      batchOperations.map(
        (item) =>
          item.id,
      );

    const groupedUsage =
      batchOperationIds.length >
      0
        ? await this.prisma.workEntry.groupBy({
            by: [
              'batchOperationId',
              'workBatchSizeId',
            ],
            where: {
              batchOperationId: {
                in:
                  batchOperationIds,
              },
              status: {
                in: [
                  ApprovalStatus.PENDING,
                  ApprovalStatus.APPROVED,
                ],
              },
            },
            _sum: {
              quantity:
                true,
            },
          })
        : [];

    const usageMap =
      new Map(
        groupedUsage.map(
          (item) => [
            `${item.batchOperationId}:${item.workBatchSizeId}`,
            item._sum.quantity ??
              0,
          ],
        ),
      );

    const items =
      batchOperations
        .map(
          (item) => {
            const operationRemaining =
              Math.max(
                0,
                item.targetQuantity -
                  item.claimedQuantity,
              );

            const sizes =
              item.workBatch.sizes
                .map(
                  (size) => {
                    const claimedQuantity =
                      usageMap.get(
                        `${item.id}:${size.id}`,
                      ) ?? 0;

                    return {
                      id:
                        size.id,
                      label:
                        size.label,
                      quantity:
                        size.quantity,
                      claimedQuantity,
                      remainingQuantity:
                        Math.max(
                          0,
                          Math.min(
                            operationRemaining,
                            size.quantity -
                              claimedQuantity,
                          ),
                        ),
                    };
                  },
                )
                .filter(
                  (size) =>
                    size.remainingQuantity >
                    0,
                );

            return {
              batchOperationId:
                item.id,
              batchId:
                item.workBatchId,
              batchCode:
                item.workBatch.code,
              modelName:
                item.workBatch.modelName,
              operationId:
                item.operationId,
              operationName:
                item.operation.name,
              targetQuantity:
                item.targetQuantity,
              claimedQuantity:
                item.claimedQuantity,
              approvedQuantity:
                item.approvedQuantity,
              unitRate:
                item.unitRate.toString(),
              remainingQuantity:
                operationRemaining,
              sizes,
            };
          },
        )
        .filter(
          (item) =>
            item.remainingQuantity >
              0 &&
            item.sizes.length >
              0,
        );

    return {
      items,
    };
  }

  async create(
    workerId: string,
    dto: CreateWorkEntryDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const worker =
          await tx.user.findUnique({
            where: {
              id:
                workerId,
            },
          });

        if (
          !worker ||
          !worker.isActive ||
          worker.role !==
            UserRole.WORKER ||
          worker.compensationType !==
            CompensationType.PIECE_RATE
        ) {
          throw new BadRequestException({
            code:
              'WORKER_NOT_ELIGIBLE',
            message:
              'کاربر امکان ثبت کار دانه‌ای را ندارد.',
          });
        }

        const lockedOperation =
          await tx.$queryRaw<
            Array<{
              id: string;
            }>
          >`
            SELECT "id"
            FROM "BatchOperation"
            WHERE "id" = ${dto.batchOperationId}
            FOR UPDATE
          `;

        if (
          lockedOperation.length !==
          1
        ) {
          throw new NotFoundException({
            code:
              'BATCH_OPERATION_NOT_FOUND',
            message:
              'عملیات سری‌کار پیدا نشد.',
          });
        }

        const lockedSize =
          await tx.$queryRaw<
            Array<{
              id: string;
            }>
          >`
            SELECT "id"
            FROM "WorkBatchSize"
            WHERE "id" = ${dto.workBatchSizeId}
            FOR UPDATE
          `;

        if (
          lockedSize.length !==
          1
        ) {
          throw new NotFoundException({
            code:
              'BATCH_SIZE_NOT_FOUND',
            message:
              'سایز سری‌کار پیدا نشد.',
          });
        }

        const [
          batchOperation,
          batchSize,
        ] =
          await Promise.all([
            tx.batchOperation.findUnique({
              where: {
                id:
                  dto.batchOperationId,
              },
              include: {
                operation:
                  true,
                workBatch:
                  true,
              },
            }),
            tx.workBatchSize.findUnique({
              where: {
                id:
                  dto.workBatchSizeId,
              },
            }),
          ]);

        if (!batchOperation) {
          throw new NotFoundException({
            code:
              'BATCH_OPERATION_NOT_FOUND',
            message:
              'عملیات سری‌کار پیدا نشد.',
          });
        }

        if (!batchSize) {
          throw new NotFoundException({
            code:
              'BATCH_SIZE_NOT_FOUND',
            message:
              'سایز سری‌کار پیدا نشد.',
          });
        }

        if (
          !batchOperation.isActive
        ) {
          throw new ConflictException({
            code:
              'BATCH_OPERATION_NOT_ACTIVE',
            message:
              'این عملیات برای سری‌کار غیرفعال شده است.',
          });
        }

        if (
          batchOperation.workBatch.status !==
          BatchStatus.ACTIVE
        ) {
          throw new ConflictException({
            code:
              'BATCH_NOT_ACTIVE',
            message:
              'این سری‌کار فعال نیست.',
          });
        }

        if (
          !batchSize.isActive ||
          batchSize.workBatchId !==
            batchOperation.workBatchId
        ) {
          throw new ConflictException({
            code:
              'BATCH_SIZE_NOT_ACTIVE',
            message:
              'این سایز برای سری‌کار انتخاب‌شده فعال نیست.',
          });
        }

        const operationRemaining =
          batchOperation.targetQuantity -
          batchOperation.claimedQuantity;

        const sizeUsage =
          await tx.workEntry.aggregate({
            where: {
              batchOperationId:
                batchOperation.id,
              workBatchSizeId:
                batchSize.id,
              status: {
                in: [
                  ApprovalStatus.PENDING,
                  ApprovalStatus.APPROVED,
                ],
              },
            },
            _sum: {
              quantity:
                true,
            },
          });

        const sizeClaimed =
          sizeUsage._sum.quantity ??
          0;

        const sizeRemaining =
          batchSize.quantity -
          sizeClaimed;

        const availableQuantity =
          Math.max(
            0,
            Math.min(
              operationRemaining,
              sizeRemaining,
            ),
          );

        if (
          dto.quantity >
          availableQuantity
        ) {
          throw new ConflictException({
            code:
              'WORK_SIZE_QUANTITY_EXCEEDS_REMAINING',
            message:
              'تعداد ثبت‌شده بیشتر از ظرفیت باقی‌مانده این سایز و عملیات است.',
            availableQuantity,
          });
        }

        const unitRate =
          batchOperation.unitRate.toString();

        const totalAmount =
          (
            BigInt(unitRate) *
            BigInt(
              dto.quantity,
            )
          ).toString();

        const entry =
          await tx.workEntry.create({
            data: {
              workerId,
              batchOperationId:
                batchOperation.id,
              workBatchSizeId:
                batchSize.id,
              quantity:
                dto.quantity,
              unitRate,
              totalAmount,
              status:
                ApprovalStatus.PENDING,
              workerNote:
                dto.workerNote
                  ?.trim() ||
                null,
            },
          });

        await tx.batchOperation.update({
          where: {
            id:
              batchOperation.id,
          },
          data: {
            claimedQuantity: {
              increment:
                dto.quantity,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId:
              workerId,
            action:
              'WORK_ENTRY_CREATED',
            entityType:
              'WorkEntry',
            entityId:
              entry.id,
            afterData: {
              batchOperationId:
                batchOperation.id,
              workBatchId:
                batchOperation.workBatchId,
              batchCode:
                batchOperation.workBatch.code,
              workBatchSizeId:
                batchSize.id,
              sizeLabel:
                batchSize.label,
              operationId:
                batchOperation.operationId,
              operationName:
                batchOperation.operation.name,
              quantity:
                dto.quantity,
              unitRate,
              totalAmount,
              status:
                ApprovalStatus.PENDING,
            },
          },
        });

        return {
          id:
            entry.id,
          batchOperationId:
            entry.batchOperationId,
          batchId:
            batchOperation.workBatchId,
          batchCode:
            batchOperation.workBatch.code,
          modelName:
            batchOperation.workBatch.modelName,
          workBatchSizeId:
            batchSize.id,
          sizeLabel:
            batchSize.label,
          operationId:
            batchOperation.operationId,
          operationName:
            batchOperation.operation.name,
          quantity:
            entry.quantity,
          unitRate:
            entry.unitRate.toString(),
          totalAmount:
            entry.totalAmount.toString(),
          status:
            entry.status,
          workerNote:
            entry.workerNote,
          createdAt:
            entry.createdAt.toISOString(),
          remainingQuantity:
            availableQuantity -
            dto.quantity,
        };
      },
    );
  }

  async mine(
    workerId: string,
  ) {
    const entries =
      await this.prisma.workEntry.findMany({
        where: {
          workerId,
        },
        include: {
          batchOperation: {
            include: {
              operation:
                true,
              workBatch:
                true,
            },
          },
          workBatchSize:
            true,
        },
        orderBy: {
          createdAt:
            'desc',
        },
      });

    return {
      items:
        entries.map(
          (entry) => ({
            id:
              entry.id,
            batchOperationId:
              entry.batchOperationId,
            batchId:
              entry.batchOperation
                .workBatchId,
            batchCode:
              entry.batchOperation
                .workBatch.code,
            modelName:
              entry.batchOperation
                .workBatch.modelName,
            workBatchSizeId:
              entry.workBatchSizeId,
            sizeLabel:
              entry.workBatchSize.label,
            operationId:
              entry.batchOperation
                .operationId,
            operationName:
              entry.batchOperation
                .operation.name,
            quantity:
              entry.quantity,
            unitRate:
              entry.unitRate.toString(),
            totalAmount:
              entry.totalAmount.toString(),
            status:
              entry.status,
            workerNote:
              entry.workerNote,
            reviewerNote:
              entry.reviewerNote,
            reviewedAt:
              entry.reviewedAt
                ?.toISOString() ??
              null,
            createdAt:
              entry.createdAt
                .toISOString(),
          }),
        ),
    };
  }

  async pending(
    reviewerRole: string,
  ) {
    const entries =
      await this.prisma.workEntry.findMany({
        where: {
          status:
            ApprovalStatus.PENDING,
        },
        include: {
          worker: {
            select: {
              id:
                true,
              fullName:
                true,
            },
          },
          batchOperation: {
            include: {
              operation:
                true,
              workBatch:
                true,
            },
          },
          workBatchSize:
            true,
        },
        orderBy: {
          createdAt:
            'asc',
        },
      });

    return {
      items:
        entries.map(
          (entry) => {
            const base = {
              id:
                entry.id,
              worker: {
                id:
                  entry.worker.id,
                fullName:
                  entry.worker.fullName,
              },
              batchOperationId:
                entry.batchOperationId,
              batchId:
                entry.batchOperation
                  .workBatchId,
              batchCode:
                entry.batchOperation
                  .workBatch.code,
              modelName:
                entry.batchOperation
                  .workBatch.modelName,
              workBatchSizeId:
                entry.workBatchSizeId,
              sizeLabel:
                entry.workBatchSize.label,
              operationId:
                entry.batchOperation
                  .operationId,
              operationName:
                entry.batchOperation
                  .operation.name,
              quantity:
                entry.quantity,
              workerNote:
                entry.workerNote,
              status:
                entry.status,
              createdAt:
                entry.createdAt
                  .toISOString(),
              targetQuantity:
                entry.batchOperation
                  .targetQuantity,
              claimedQuantity:
                entry.batchOperation
                  .claimedQuantity,
              approvedQuantity:
                entry.batchOperation
                  .approvedQuantity,
              remainingQuantity:
                Math.max(
                  0,
                  entry.batchOperation
                    .targetQuantity -
                    entry.batchOperation
                      .claimedQuantity,
                ),
            };

            if (
              reviewerRole ===
              UserRole.MANAGER
            ) {
              return {
                ...base,
                unitRate:
                  entry.unitRate
                    .toString(),
                totalAmount:
                  entry.totalAmount
                    .toString(),
              };
            }

            return base;
          },
        ),
    };
  }

  async approve(
    reviewerId: string,
    reviewerRole: string,
    id: string,
    dto: ReviewWorkEntryDto,
  ) {
    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const lockedEntry =
            await tx.$queryRaw<
              Array<{
                id: string;
              }>
            >`
              SELECT "id"
              FROM "WorkEntry"
              WHERE "id" = ${id}
              FOR UPDATE
            `;

          if (
            lockedEntry.length !==
            1
          ) {
            throw new NotFoundException({
              code:
                'WORK_ENTRY_NOT_FOUND',
              message:
                'ثبت کار پیدا نشد.',
            });
          }

          const entry =
            await tx.workEntry.findUnique({
              where: {
                id,
              },
              include: {
                worker:
                  true,
                batchOperation: {
                  include: {
                    operation:
                      true,
                    workBatch:
                      true,
                  },
                },
                workBatchSize:
                  true,
              },
            });

          if (!entry) {
            throw new NotFoundException({
              code:
                'WORK_ENTRY_NOT_FOUND',
              message:
                'ثبت کار پیدا نشد.',
            });
          }

          if (
            entry.status !==
            ApprovalStatus.PENDING
          ) {
            throw new ConflictException({
              code:
                'WORK_ENTRY_ALREADY_REVIEWED',
              message:
                'این ثبت کار قبلاً بررسی شده است.',
            });
          }

          await tx.$queryRaw<
            Array<{
              id: string;
            }>
          >`
            SELECT "id"
            FROM "BatchOperation"
            WHERE "id" = ${entry.batchOperationId}
            FOR UPDATE
          `;

          const updated =
            await tx.workEntry.update({
              where: {
                id,
              },
              data: {
                status:
                  ApprovalStatus.APPROVED,
                reviewerNote:
                  dto.reviewerNote
                    ?.trim() ||
                  null,
                reviewedById:
                  reviewerId,
                reviewedAt:
                  new Date(),
              },
            });

          await tx.batchOperation.update({
            where: {
              id:
                entry.batchOperationId,
            },
            data: {
              approvedQuantity: {
                increment:
                  entry.quantity,
              },
            },
          });

          await tx.auditLog.create({
            data: {
              actorId:
                reviewerId,
              action:
                'WORK_ENTRY_APPROVED',
              entityType:
                'WorkEntry',
              entityId:
                entry.id,
              beforeData: {
                status:
                  entry.status,
              },
              afterData: {
                status:
                  ApprovalStatus.APPROVED,
                quantity:
                  entry.quantity,
                reviewerNote:
                  updated.reviewerNote,
              },
            },
          });

          return {
            entryId:
              entry.id,
            workerId:
              entry.workerId,
            workerName:
              entry.worker.fullName,
            workerPhone:
              entry.worker.phone,
            batchCode:
              entry.batchOperation
                .workBatch.code,
            batchId:
              entry.batchOperation
                .workBatchId,
            workBatchSizeId:
              entry.workBatchSizeId,
            sizeLabel:
              entry.workBatchSize.label,
            batchOperationId:
              entry.batchOperationId,
            operationId:
              entry.batchOperation
                .operationId,
            operationName:
              entry.batchOperation
                .operation.name,
            quantity:
              entry.quantity,
            unitRate:
              entry.unitRate.toString(),
            totalAmount:
              entry.totalAmount.toString(),
            workerNote:
              entry.workerNote,
            reviewerNote:
              updated.reviewerNote,
            reviewedAt:
              updated.reviewedAt
                ?.toISOString() ??
              null,
          };
        },
      );

    let smsStatus:
      'sent' |
      'failed' |
      'not_applicable' =
        'not_applicable';

    if (
      reviewerRole ===
        UserRole.SUPERVISOR ||
      reviewerRole ===
        UserRole.MANAGER
    ) {
      try {
        await this.sms.sendWorkApproval(
          result.workerPhone,
          result.batchCode,
          result.totalAmount,
        );

        smsStatus =
          'sent';

        await this.safeSmsAudit(
          reviewerId,
          result.entryId,
          'WORK_APPROVAL_SMS_SENT',
          {
            batchCode:
              result.batchCode,
            templateConfigured:
              true,
          },
        );
      } catch (error) {
        smsStatus =
          'failed';

        await this.safeSmsAudit(
          reviewerId,
          result.entryId,
          'WORK_APPROVAL_SMS_FAILED',
          {
            batchCode:
              result.batchCode,
            error:
              this.errorMessage(
                error,
              ),
          },
        );
      }
    }

    const base = {
      id:
        result.entryId,
      worker: {
        id:
          result.workerId,
        fullName:
          result.workerName,
      },
      batchId:
        result.batchId,
      batchCode:
        result.batchCode,
      workBatchSizeId:
        result.workBatchSizeId,
      sizeLabel:
        result.sizeLabel,
      batchOperationId:
        result.batchOperationId,
      operationId:
        result.operationId,
      operationName:
        result.operationName,
      quantity:
        result.quantity,
      status:
        ApprovalStatus.APPROVED,
      workerNote:
        result.workerNote,
      reviewerNote:
        result.reviewerNote,
      reviewedAt:
        result.reviewedAt,
      smsStatus,
    };

    if (
      reviewerRole ===
      UserRole.MANAGER
    ) {
      return {
        ...base,
        unitRate:
          result.unitRate,
        totalAmount:
          result.totalAmount,
      };
    }

    return base;
  }

  async reject(
    reviewerId: string,
    reviewerRole: string,
    id: string,
    dto: ReviewWorkEntryDto,
  ) {
    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const lockedEntry =
            await tx.$queryRaw<
              Array<{
                id: string;
              }>
            >`
              SELECT "id"
              FROM "WorkEntry"
              WHERE "id" = ${id}
              FOR UPDATE
            `;

          if (
            lockedEntry.length !==
            1
          ) {
            throw new NotFoundException({
              code:
                'WORK_ENTRY_NOT_FOUND',
              message:
                'ثبت کار پیدا نشد.',
            });
          }

          const entry =
            await tx.workEntry.findUnique({
              where: {
                id,
              },
              include: {
                worker:
                  true,
                batchOperation: {
                  include: {
                    operation:
                      true,
                    workBatch:
                      true,
                  },
                },
                workBatchSize:
                  true,
              },
            });

          if (!entry) {
            throw new NotFoundException({
              code:
                'WORK_ENTRY_NOT_FOUND',
              message:
                'ثبت کار پیدا نشد.',
            });
          }

          if (
            entry.status !==
            ApprovalStatus.PENDING
          ) {
            throw new ConflictException({
              code:
                'WORK_ENTRY_ALREADY_REVIEWED',
              message:
                'این ثبت کار قبلاً بررسی شده است.',
            });
          }

          await tx.$queryRaw<
            Array<{
              id: string;
            }>
          >`
            SELECT "id"
            FROM "BatchOperation"
            WHERE "id" = ${entry.batchOperationId}
            FOR UPDATE
          `;

          const batchOperation =
            await tx.batchOperation.findUnique({
              where: {
                id:
                  entry.batchOperationId,
              },
            });

          if (!batchOperation) {
            throw new NotFoundException({
              code:
                'BATCH_OPERATION_NOT_FOUND',
              message:
                'عملیات سری‌کار پیدا نشد.',
            });
          }

          if (
            batchOperation.claimedQuantity <
            entry.quantity
          ) {
            throw new ConflictException({
              code:
                'CLAIMED_QUANTITY_INCONSISTENT',
              message:
                'مقدار رزرو شده با ثبت کار سازگار نیست.',
            });
          }

          const updated =
            await tx.workEntry.update({
              where: {
                id,
              },
              data: {
                status:
                  ApprovalStatus.REJECTED,
                reviewerNote:
                  dto.reviewerNote
                    ?.trim() ||
                  null,
                reviewedById:
                  reviewerId,
                reviewedAt:
                  new Date(),
              },
            });

          await tx.batchOperation.update({
            where: {
              id:
                entry.batchOperationId,
            },
            data: {
              claimedQuantity: {
                decrement:
                  entry.quantity,
              },
            },
          });

          await tx.auditLog.create({
            data: {
              actorId:
                reviewerId,
              action:
                'WORK_ENTRY_REJECTED',
              entityType:
                'WorkEntry',
              entityId:
                entry.id,
              beforeData: {
                status:
                  entry.status,
              },
              afterData: {
                status:
                  ApprovalStatus.REJECTED,
                quantity:
                  entry.quantity,
                reviewerNote:
                  updated.reviewerNote,
              },
            },
          });

          return {
            entryId:
              entry.id,
            workerId:
              entry.workerId,
            workerName:
              entry.worker.fullName,
            batchId:
              entry.batchOperation
                .workBatchId,
            batchCode:
              entry.batchOperation
                .workBatch.code,
            workBatchSizeId:
              entry.workBatchSizeId,
            sizeLabel:
              entry.workBatchSize.label,
            batchOperationId:
              entry.batchOperationId,
            operationId:
              entry.batchOperation
                .operationId,
            operationName:
              entry.batchOperation
                .operation.name,
            quantity:
              entry.quantity,
            unitRate:
              entry.unitRate.toString(),
            totalAmount:
              entry.totalAmount.toString(),
            workerNote:
              entry.workerNote,
            reviewerNote:
              updated.reviewerNote,
            reviewedAt:
              updated.reviewedAt
                ?.toISOString() ??
              null,
          };
        },
      );

    const base = {
      id:
        result.entryId,
      worker: {
        id:
          result.workerId,
        fullName:
          result.workerName,
      },
      batchId:
        result.batchId,
      batchCode:
        result.batchCode,
      workBatchSizeId:
        result.workBatchSizeId,
      sizeLabel:
        result.sizeLabel,
      batchOperationId:
        result.batchOperationId,
      operationId:
        result.operationId,
      operationName:
        result.operationName,
      quantity:
        result.quantity,
      status:
        ApprovalStatus.REJECTED,
      workerNote:
        result.workerNote,
      reviewerNote:
        result.reviewerNote,
      reviewedAt:
        result.reviewedAt,
    };

    if (
      reviewerRole ===
      UserRole.MANAGER
    ) {
      return {
        ...base,
        unitRate:
          result.unitRate,
        totalAmount:
          result.totalAmount,
      };
    }

    return base;
  }
}
