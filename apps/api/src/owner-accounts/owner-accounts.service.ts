import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  OwnerPricingType,
} from '../generated/prisma/enums';
import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  CreateOwnerPaymentDto,
} from './dto/create-owner-payment.dto';
import {
  ListOwnerAccountsDto,
} from './dto/list-owner-accounts.dto';

type OwnerRecord = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  isActive: boolean;
};

type BatchRecord = {
  id: string;
  code: string;
  ownerId: string;
  modelName: string | null;
  totalQuantity: number;
  ownerPricingType:
    OwnerPricingType;
  ownerUnitPrice:
    {
      toString(): string;
    } | null;
  ownerFixedAmount:
    {
      toString(): string;
    } | null;
  status: string;
  startDate: Date | null;
  completedAt: Date | null;
};

@Injectable()
export class OwnerAccountsService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private money(
    value:
      | {
          toString(): string;
        }
      | string
      | null
      | undefined,
  ): bigint {
    if (
      value === null ||
      value === undefined
    ) {
      return 0n;
    }

    return BigInt(
      value.toString(),
    );
  }

  private batchDue(
    batch: BatchRecord,
  ): bigint {
    if (
      batch.ownerPricingType ===
      OwnerPricingType.PER_PIECE
    ) {
      if (
        batch.ownerUnitPrice ===
        null
      ) {
        throw new BadRequestException({
          code:
            'BATCH_PRICE_INVALID',
          message:
            'قیمت دانه‌ای این سری معتبر نیست.',
        });
      }

      return (
        this.money(
          batch.ownerUnitPrice,
        ) *
        BigInt(
          batch.totalQuantity,
        )
      );
    }

    if (
      batch.ownerFixedAmount ===
      null
    ) {
      throw new BadRequestException({
        code:
          'BATCH_PRICE_INVALID',
        message:
          'مبلغ ثابت این سری معتبر نیست.',
      });
    }

    return this.money(
      batch.ownerFixedAmount,
    );
  }

  private assertOwner(
    owner:
      OwnerRecord | null,
  ): asserts owner is OwnerRecord {
    if (!owner) {
      throw new NotFoundException({
        code:
          'OWNER_NOT_FOUND',
        message:
          'صاحبکار پیدا نشد.',
      });
    }
  }

  private async totals(
    client: any,
    ownerId: string,
  ) {
    const batches:
      BatchRecord[] =
        await client.workBatch.findMany({
          where: {
            ownerId,
          },
          orderBy: {
            createdAt:
              'asc',
          },
        });

    const payments =
      await client.ownerPayment.findMany({
        where: {
          ownerId,
        },
      });

    let due =
      0n;

    for (
      const batch of batches
    ) {
      due +=
        this.batchDue(
          batch,
        );
    }

    let received =
      0n;

    let unallocatedReceived =
      0n;

    for (
      const payment of payments
    ) {
      const amount =
        this.money(
          payment.amount,
        );

      received +=
        amount;

      if (
        payment.workBatchId ===
        null
      ) {
        unallocatedReceived +=
          amount;
      }
    }

    return {
      batches,
      payments,
      due,
      received,
      unallocatedReceived,
      balance:
        due - received,
    };
  }

  private async batchFinancials(
    client: any,
    batch: BatchRecord,
  ) {
    const payments =
      await client.ownerPayment.findMany({
        where: {
          ownerId:
            batch.ownerId,
          workBatchId:
            batch.id,
        },
      });

    let received =
      0n;

    for (
      const payment of payments
    ) {
      received +=
        this.money(
          payment.amount,
        );
    }

    const due =
      this.batchDue(
        batch,
      );

    return {
      due,
      received,
      balance:
        due - received,
    };
  }

  private async summary(
    client: any,
    owner: OwnerRecord,
  ) {
    const totals =
      await this.totals(
        client,
        owner.id,
      );

    return {
      id:
        owner.id,
      name:
        owner.name,
      phone:
        owner.phone,
      isActive:
        owner.isActive,
      batchCount:
        totals.batches.length,
      due:
        totals.due.toString(),
      received:
        totals.received.toString(),
      unallocatedReceived:
        totals.unallocatedReceived
          .toString(),
      balance:
        totals.balance.toString(),
    };
  }

  async list(
    dto: ListOwnerAccountsDto,
  ) {
    const page =
      dto.page ?? 1;

    const pageSize =
      dto.pageSize ?? 30;

    const q =
      dto.q?.trim();

    const where: any = {
      ...(dto.isActive
        ? {
            isActive:
              dto.isActive ===
              'true',
          }
        : {}),
      ...(q
        ? {
            OR: [
              {
                name: {
                  contains:
                    q,
                  mode:
                    'insensitive',
                },
              },
              {
                phone: {
                  contains:
                    q,
                },
              },
            ],
          }
        : {}),
    };

    const [
      total,
      owners,
    ] =
      await Promise.all([
        this.prisma.owner.count({
          where,
        }),

        this.prisma.owner.findMany({
          where,
          orderBy: {
            name:
              'asc',
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
          owners.map(
            (owner) =>
              this.summary(
                this.prisma,
                owner,
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

  async getAccount(
    ownerId: string,
  ) {
    const owner =
      await this.prisma.owner.findUnique({
        where: {
          id:
            ownerId,
        },
      });

    this.assertOwner(
      owner,
    );

    const totals =
      await this.totals(
        this.prisma,
        owner.id,
      );

    const batches =
      await Promise.all(
        totals.batches.map(
          async (batch) => {
            const financial =
              await this.batchFinancials(
                this.prisma,
                batch,
              );

            return {
              id:
                batch.id,
              code:
                batch.code,
              modelName:
                batch.modelName,
              totalQuantity:
                batch.totalQuantity,
              status:
                batch.status,
              ownerPricingType:
                batch.ownerPricingType,
              ownerUnitPrice:
                batch.ownerUnitPrice
                  ?.toString() ??
                null,
              ownerFixedAmount:
                batch.ownerFixedAmount
                  ?.toString() ??
                null,
              due:
                financial.due
                  .toString(),
              received:
                financial.received
                  .toString(),
              balance:
                financial.balance
                  .toString(),
              startDate:
                batch.startDate
                  ?.toISOString()
                  .slice(0, 10) ??
                null,
              completedAt:
                batch.completedAt
                  ?.toISOString() ??
                null,
            };
          },
        ),
      );

    const payments =
      await this.prisma.ownerPayment.findMany({
        where: {
          ownerId:
            owner.id,
        },
        include: {
          workBatch: {
            select: {
              id:
                true,
              code:
                true,
              modelName:
                true,
            },
          },
          recordedBy: {
            select: {
              id:
                true,
              fullName:
                true,
            },
          },
        },
        orderBy: [
          {
            paidAt:
              'desc',
          },
          {
            createdAt:
              'desc',
          },
        ],
      });

    return {
      owner: {
        id:
          owner.id,
        name:
          owner.name,
        phone:
          owner.phone,
        note:
          owner.note,
        isActive:
          owner.isActive,
      },
      totals: {
        due:
          totals.due.toString(),
        received:
          totals.received.toString(),
        unallocatedReceived:
          totals.unallocatedReceived
            .toString(),
        balance:
          totals.balance.toString(),
      },
      batches,
      payments:
        payments.map(
          (payment) => ({
            id:
              payment.id,
            amount:
              payment.amount
                .toString(),
            paidAt:
              payment.paidAt
                .toISOString(),
            note:
              payment.note,
            batch:
              payment.workBatch
                ? {
                    id:
                      payment.workBatch.id,
                    code:
                      payment.workBatch.code,
                    modelName:
                      payment.workBatch
                        .modelName,
                  }
                : null,
            recordedBy: {
              id:
                payment.recordedBy.id,
              fullName:
                payment.recordedBy
                  .fullName,
            },
            createdAt:
              payment.createdAt
                .toISOString(),
          }),
        ),
    };
  }

  async recordPayment(
    managerId: string,
    ownerId: string,
    dto: CreateOwnerPaymentDto,
  ) {
    const amount =
      BigInt(
        dto.amount,
      );

    let paidAt =
      new Date();

    if (
      dto.paidAt
    ) {
      paidAt =
        new Date(
          dto.paidAt,
        );
    }

    if (
      Number.isNaN(
        paidAt.getTime(),
      )
    ) {
      throw new BadRequestException({
        code:
          'INVALID_PAYMENT_DATE',
        message:
          'تاریخ دریافت معتبر نیست.',
      });
    }

    if (
      paidAt.getTime() >
      Date.now() +
        5 * 60 * 1000
    ) {
      throw new BadRequestException({
        code:
          'FUTURE_PAYMENT_NOT_ALLOWED',
        message:
          'ثبت دریافت برای آینده مجاز نیست.',
      });
    }

    return this.prisma.$transaction(
      async (tx) => {
        const ownerLock =
          await tx.$queryRaw<
            Array<{
              id: string;
            }>
          >`
            SELECT "id"
            FROM "Owner"
            WHERE "id" = ${ownerId}
            FOR UPDATE
          `;

        if (
          ownerLock.length !== 1
        ) {
          throw new NotFoundException({
            code:
              'OWNER_NOT_FOUND',
            message:
              'صاحبکار پیدا نشد.',
          });
        }

        const owner =
          await tx.owner.findUnique({
            where: {
              id:
                ownerId,
            },
          });

        this.assertOwner(
          owner,
        );

        const ownerTotals =
          await this.totals(
            tx,
            ownerId,
          );

        if (
          ownerTotals.balance <=
          0n
        ) {
          throw new ConflictException({
            code:
              'NO_OWNER_BALANCE',
            message:
              'مانده قابل دریافت از این صاحبکار وجود ندارد.',
            availableBalance:
              ownerTotals.balance
                .toString(),
          });
        }

        if (
          amount >
          ownerTotals.balance
        ) {
          throw new ConflictException({
            code:
              'OWNER_PAYMENT_EXCEEDS_BALANCE',
            message:
              'مبلغ دریافتی بیشتر از مانده حساب صاحبکار است.',
            availableBalance:
              ownerTotals.balance
                .toString(),
          });
        }

        let batch:
          BatchRecord | null =
            null;

        let batchBalanceBefore:
          bigint | null =
            null;

        if (
          dto.workBatchId
        ) {
          const batchLock =
            await tx.$queryRaw<
              Array<{
                id: string;
              }>
            >`
              SELECT "id"
              FROM "WorkBatch"
              WHERE "id" = ${dto.workBatchId}
              FOR UPDATE
            `;

          if (
            batchLock.length !== 1
          ) {
            throw new NotFoundException({
              code:
                'WORK_BATCH_NOT_FOUND',
              message:
                'سری‌کار پیدا نشد.',
            });
          }

          batch =
            await tx.workBatch.findUnique({
              where: {
                id:
                  dto.workBatchId,
              },
            });

          if (
            !batch ||
            batch.ownerId !==
              ownerId
          ) {
            throw new BadRequestException({
              code:
                'WORK_BATCH_OWNER_MISMATCH',
              message:
                'این سری‌کار متعلق به صاحبکار انتخاب‌شده نیست.',
            });
          }

          const financial =
            await this.batchFinancials(
              tx,
              batch,
            );

          batchBalanceBefore =
            financial.balance;

          if (
            batchBalanceBefore <=
            0n
          ) {
            throw new ConflictException({
              code:
                'NO_BATCH_BALANCE',
              message:
                'مانده قابل دریافت برای این سری وجود ندارد.',
              availableBalance:
                batchBalanceBefore
                  .toString(),
            });
          }

          if (
            amount >
            batchBalanceBefore
          ) {
            throw new ConflictException({
              code:
                'OWNER_PAYMENT_EXCEEDS_BATCH_BALANCE',
              message:
                'مبلغ دریافتی بیشتر از مانده این سری است.',
              availableBalance:
                batchBalanceBefore
                  .toString(),
            });
          }
        }

        const payment =
          await tx.ownerPayment.create({
            data: {
              ownerId,
              workBatchId:
                batch?.id ??
                null,
              amount:
                dto.amount,
              paidAt,
              note:
                dto.note?.trim() ||
                null,
              recordedById:
                managerId,
            },
          });

        const ownerBalanceAfter =
          ownerTotals.balance -
          amount;

        const batchBalanceAfter =
          batchBalanceBefore ===
          null
            ? null
            : batchBalanceBefore -
              amount;

        await tx.auditLog.create({
          data: {
            actorId:
              managerId,
            action:
              'OWNER_PAYMENT_RECORDED',
            entityType:
              'OwnerPayment',
            entityId:
              payment.id,
            afterData: {
              ownerId,
              workBatchId:
                payment.workBatchId,
              amount:
                payment.amount
                  .toString(),
              paidAt:
                payment.paidAt
                  .toISOString(),
              note:
                payment.note,
              ownerBalanceBefore:
                ownerTotals.balance
                  .toString(),
              ownerBalanceAfter:
                ownerBalanceAfter
                  .toString(),
              batchBalanceBefore:
                batchBalanceBefore
                  ?.toString() ??
                null,
              batchBalanceAfter:
                batchBalanceAfter
                  ?.toString() ??
                null,
            },
          },
        });

        return {
          payment: {
            id:
              payment.id,
            ownerId:
              payment.ownerId,
            workBatchId:
              payment.workBatchId,
            amount:
              payment.amount
                .toString(),
            paidAt:
              payment.paidAt
                .toISOString(),
            note:
              payment.note,
            recordedById:
              payment.recordedById,
            createdAt:
              payment.createdAt
                .toISOString(),
          },
          account: {
            due:
              ownerTotals.due
                .toString(),
            receivedBefore:
              ownerTotals.received
                .toString(),
            receivedAfter:
              (
                ownerTotals.received +
                amount
              ).toString(),
            balanceBefore:
              ownerTotals.balance
                .toString(),
            balanceAfter:
              ownerBalanceAfter
                .toString(),
            batchBalanceBefore:
              batchBalanceBefore
                ?.toString() ??
              null,
            batchBalanceAfter:
              batchBalanceAfter
                ?.toString() ??
              null,
          },
        };
      },
    );
  }
}