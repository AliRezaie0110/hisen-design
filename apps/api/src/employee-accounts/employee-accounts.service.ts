import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  randomUUID,
} from 'node:crypto';

import {
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises';

import {
  resolve,
} from 'node:path';

import {
  ApprovalStatus,
  CompensationType,
  UserRole,
} from '../generated/prisma/enums';

import {
  PrismaService,
} from '../prisma/prisma.service';

import {
  CreateEmployeePaymentDto,
} from './dto/create-employee-payment.dto';

import {
  ListEmployeeAccountsDto,
} from './dto/list-employee-accounts.dto';

type AccountEmployee = {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  compensationType: CompensationType;
  isActive: boolean;

  defaultMonthlySalary: {
    toString(): string;
  } | null;
};

export type UploadedReceipt = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type StoredReceipt = {
  fileName: string;
  originalName: string;
  mimeType: string;
};

@Injectable()
export class EmployeeAccountsService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private toBigInt(
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

  private receiptDirectory(): string {
    const cwd =
      process.cwd();

    const normalized =
      cwd
        .replace(
          /\\/g,
          '/',
        )
        .toLowerCase();

    if (
      normalized.endsWith(
        '/apps/api',
      )
    ) {
      return resolve(
        cwd,
        'uploads',
        'payment-receipts',
      );
    }

    return resolve(
      cwd,
      'apps',
      'api',
      'uploads',
      'payment-receipts',
    );
  }

  private receiptExtension(
    mimeType: string,
  ): string {
    switch (
      mimeType
    ) {
      case 'image/jpeg':
        return '.jpg';

      case 'image/png':
        return '.png';

      case 'application/pdf':
        return '.pdf';

      default:
        throw new BadRequestException({
          code:
            'INVALID_RECEIPT_FILE_TYPE',
          message:
            'رسید فقط می‌تواند JPG، PNG یا PDF باشد.',
        });
    }
  }

  private async storeReceipt(
    receipt:
      UploadedReceipt,
  ): Promise<StoredReceipt> {
    if (
      receipt.size <= 0
    ) {
      throw new BadRequestException({
        code:
          'EMPTY_RECEIPT_FILE',
        message:
          'فایل رسید خالی است.',
      });
    }

    if (
      receipt.size >
      5 * 1024 * 1024
    ) {
      throw new BadRequestException({
        code:
          'RECEIPT_FILE_TOO_LARGE',
        message:
          'حجم رسید نباید بیشتر از ۵ مگابایت باشد.',
      });
    }

    const extension =
      this.receiptExtension(
        receipt.mimetype,
      );

    const directory =
      this.receiptDirectory();

    await mkdir(
      directory,
      {
        recursive:
          true,
      },
    );

    const fileName =
      `${randomUUID()}${extension}`;

    await writeFile(
      resolve(
        directory,
        fileName,
      ),
      receipt.buffer,
    );

    return {
      fileName,

      originalName:
        receipt.originalname
          .trim()
          .slice(
            0,
            255,
          ) ||
        `receipt${extension}`,

      mimeType:
        receipt.mimetype,
    };
  }

  private async removeReceipt(
    fileName:
      string | null | undefined,
  ): Promise<void> {
    if (!fileName) {
      return;
    }

    try {
      await unlink(
        resolve(
          this.receiptDirectory(),
          fileName,
        ),
      );
    } catch {
      // Cleanup is best-effort only.
    }
  }

  async getPaymentReceipt(
    paymentId: string,
    employeeId?: string,
  ) {
    const payment =
      await this.prisma.employeePayment.findUnique({
        where: {
          id:
            paymentId,
        },

        select: {
          employeeId:
            true,

          receiptFileName:
            true,

          receiptOriginalName:
            true,

          receiptMimeType:
            true,
        },
      });

    if (!payment) {
      throw new NotFoundException({
        code:
          'EMPLOYEE_PAYMENT_NOT_FOUND',
        message:
          'پرداخت پیدا نشد.',
      });
    }

    if (
      employeeId &&
      payment.employeeId !==
        employeeId
    ) {
      throw new ForbiddenException({
        code:
          'PAYMENT_RECEIPT_FORBIDDEN',
        message:
          'اجازه مشاهده این رسید را ندارید.',
      });
    }

    if (
      !payment.receiptFileName ||
      !payment.receiptMimeType
    ) {
      throw new NotFoundException({
        code:
          'PAYMENT_RECEIPT_NOT_FOUND',
        message:
          'برای این پرداخت رسیدی ثبت نشده است.',
      });
    }

    let buffer:
      Buffer;

    try {
      buffer =
        await readFile(
          resolve(
            this.receiptDirectory(),
            payment.receiptFileName,
          ),
        );
    } catch {
      throw new NotFoundException({
        code:
          'PAYMENT_RECEIPT_FILE_NOT_FOUND',
        message:
          'فایل رسید روی سرور پیدا نشد.',
      });
    }

    return {
      buffer,

      mimeType:
        payment.receiptMimeType,

      originalName:
        payment.receiptOriginalName ??
        'receipt',
    };
  }

  private assertEmployee(
    employee:
      AccountEmployee | null,
  ): asserts employee is AccountEmployee {
    if (!employee) {
      throw new NotFoundException({
        code:
          'EMPLOYEE_NOT_FOUND',
        message:
          'پرسنل پیدا نشد.',
      });
    }

    const pieceWorker =
      employee.role ===
        UserRole.WORKER &&
      employee.compensationType ===
        CompensationType.PIECE_RATE;

    const fixedEmployee =
      (
        employee.role ===
          UserRole.SUPERVISOR ||
        employee.role ===
          UserRole.ASSISTANT
      ) &&
      employee.compensationType ===
        CompensationType.FIXED_MONTHLY;

    if (
      !pieceWorker &&
      !fixedEmployee
    ) {
      throw new BadRequestException({
        code:
          'EMPLOYEE_ACCOUNT_NOT_SUPPORTED',
        message:
          'برای این نقش حساب کارکنان تعریف نشده است.',
      });
    }
  }

  private async totals(
    client: any,
    employee:
      AccountEmployee,
  ) {
    let earned =
      0n;

    let pending =
      0n;

    let approvedWorkEntries =
      0;

    let pendingWorkEntries =
      0;

    if (
      employee.compensationType ===
      CompensationType.PIECE_RATE
    ) {
      const [
        approvedAggregate,
        pendingAggregate,
        approvedCount,
        pendingCount,
      ] =
        await Promise.all([
          client.workEntry.aggregate({
            where: {
              workerId:
                employee.id,

              status:
                ApprovalStatus.APPROVED,
            },

            _sum: {
              totalAmount:
                true,
            },
          }),

          client.workEntry.aggregate({
            where: {
              workerId:
                employee.id,

              status:
                ApprovalStatus.PENDING,
            },

            _sum: {
              totalAmount:
                true,
            },
          }),

          client.workEntry.count({
            where: {
              workerId:
                employee.id,

              status:
                ApprovalStatus.APPROVED,
            },
          }),

          client.workEntry.count({
            where: {
              workerId:
                employee.id,

              status:
                ApprovalStatus.PENDING,
            },
          }),
        ]);

      earned =
        this.toBigInt(
          approvedAggregate
            ._sum
            .totalAmount,
        );

      pending =
        this.toBigInt(
          pendingAggregate
            ._sum
            .totalAmount,
        );

      approvedWorkEntries =
        approvedCount;

      pendingWorkEntries =
        pendingCount;
    } else {
      const salaryAggregate =
        await client.monthlySalary.aggregate({
          where: {
            userId:
              employee.id,
          },

          _sum: {
            amount:
              true,
          },
        });

      earned =
        this.toBigInt(
          salaryAggregate
            ._sum
            .amount,
        );
    }

    const paymentAggregate =
      await client.employeePayment.aggregate({
        where: {
          employeeId:
            employee.id,
        },

        _sum: {
          amount:
            true,
        },
      });

    const paid =
      this.toBigInt(
        paymentAggregate
          ._sum
          .amount,
      );

    const balance =
      earned -
      paid;

    return {
      earned,
      pending,
      paid,
      balance,
      approvedWorkEntries,
      pendingWorkEntries,
    };
  }

  private async summary(
    client: any,
    employee:
      AccountEmployee,
  ) {
    this.assertEmployee(
      employee,
    );

    const totals =
      await this.totals(
        client,
        employee,
      );

    return {
      id:
        employee.id,

      fullName:
        employee.fullName,

      phone:
        employee.phone,

      role:
        employee.role,

      compensationType:
        employee.compensationType,

      isActive:
        employee.isActive,

      defaultMonthlySalary:
        employee.defaultMonthlySalary
          ?.toString() ??
        null,

      earned:
        totals.earned.toString(),

      pending:
        totals.pending.toString(),

      paid:
        totals.paid.toString(),

      balance:
        totals.balance.toString(),

      approvedWorkEntries:
        totals.approvedWorkEntries,

      pendingWorkEntries:
        totals.pendingWorkEntries,
    };
  }

  async list(
    dto:
      ListEmployeeAccountsDto,
  ) {
    const page =
      dto.page ??
      1;

    const pageSize =
      dto.pageSize ??
      30;

    const q =
      dto.q?.trim();

    const roleFilter =
      dto.role
        ? [
            {
              role:
                dto.role,
            },
          ]
        : [];

    const where = {
      AND: [
        {
          role: {
            in: [
              UserRole.WORKER,
              UserRole.SUPERVISOR,
              UserRole.ASSISTANT,
            ],
          },
        },

        ...roleFilter,

        ...(dto.isActive
          ? [
              {
                isActive:
                  dto.isActive ===
                  'true',
              },
            ]
          : []),

        ...(q
          ? [
              {
                OR: [
                  {
                    fullName: {
                      contains:
                        q,

                      mode:
                        'insensitive' as const,
                    },
                  },

                  {
                    phone: {
                      contains:
                        q,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const [
      total,
      employees,
    ] =
      await Promise.all([
        this.prisma.user.count({
          where,
        }),

        this.prisma.user.findMany({
          where,

          orderBy: {
            fullName:
              'asc',
          },

          skip:
            (
              page -
              1
            ) *
            pageSize,

          take:
            pageSize,
        }),
      ]);

    return {
      items:
        await Promise.all(
          employees.map(
            (
              employee,
            ) =>
              this.summary(
                this.prisma,
                employee,
              ),
          ),
        ),

      pagination: {
        page,
        pageSize,
        total,

        totalPages:
          total ===
          0
            ? 0
            : Math.ceil(
                total /
                  pageSize,
              ),
      },
    };
  }

  async getAccount(
    employeeId: string,
  ) {
    const employee =
      await this.prisma.user.findUnique({
        where: {
          id:
            employeeId,
        },
      });

    this.assertEmployee(
      employee,
    );

    const [
      totals,
      payments,
      salaries,
    ] =
      await Promise.all([
        this.totals(
          this.prisma,
          employee,
        ),

        this.prisma.employeePayment.findMany({
          where: {
            employeeId:
              employee.id,
          },

          include: {
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
        }),

        employee.compensationType ===
        CompensationType.FIXED_MONTHLY
          ? this.prisma.monthlySalary.findMany({
              where: {
                userId:
                  employee.id,
              },

              orderBy: [
                {
                  year:
                    'desc',
                },

                {
                  month:
                    'desc',
                },
              ],
            })
          : Promise.resolve([]),
      ]);

    return {
      employee: {
        id:
          employee.id,

        fullName:
          employee.fullName,

        phone:
          employee.phone,

        role:
          employee.role,

        compensationType:
          employee.compensationType,

        isActive:
          employee.isActive,

        defaultMonthlySalary:
          employee.defaultMonthlySalary
            ?.toString() ??
          null,
      },

      totals: {
        earned:
          totals.earned.toString(),

        pending:
          totals.pending.toString(),

        paid:
          totals.paid.toString(),

        balance:
          totals.balance.toString(),

        approvedWorkEntries:
          totals.approvedWorkEntries,

        pendingWorkEntries:
          totals.pendingWorkEntries,
      },

      monthlySalaries:
        salaries.map(
          (
            salary: any,
          ) => ({
            id:
              salary.id,

            year:
              salary.year,

            month:
              salary.month,

            amount:
              salary.amount.toString(),

            note:
              salary.note,
          }),
        ),

      payments:
        payments.map(
          (
            payment,
          ) => ({
            id:
              payment.id,

            amount:
              payment.amount.toString(),

            paymentMethod:
              payment.paymentMethod,

            paidAt:
              payment.paidAt.toISOString(),

            note:
              payment.note,

            hasReceipt:
              Boolean(
                payment.receiptFileName,
              ),

            receiptOriginalName:
              payment.receiptOriginalName,

            recordedBy: {
              id:
                payment.recordedBy.id,

              fullName:
                payment.recordedBy.fullName,
            },

            createdAt:
              payment.createdAt
                .toISOString(),
          }),
        ),
    };
  }

  async mine(
    employeeId: string,
  ) {
    return this.getAccount(
      employeeId,
    );
  }

  async recordPayment(
    managerId: string,
    employeeId: string,
    dto:
      CreateEmployeePaymentDto,
    receipt?:
      UploadedReceipt,
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
          'تاریخ پرداخت معتبر نیست.',
      });
    }

    if (
      paidAt.getTime() >
      Date.now() +
        5 *
          60 *
          1000
    ) {
      throw new BadRequestException({
        code:
          'FUTURE_PAYMENT_NOT_ALLOWED',

        message:
          'ثبت پرداخت برای آینده مجاز نیست.',
      });
    }

    const paymentMethod =
      dto.paymentMethod ??
      'CARD_TO_CARD';

    let storedReceipt:
      StoredReceipt | null =
        null;

    if (
      receipt
    ) {
      storedReceipt =
        await this.storeReceipt(
          receipt,
        );
    }

    try {
      const result =
        await this.prisma.$transaction(
          async (
            tx,
          ) => {
            const locked =
              await tx.$queryRaw<
                Array<{
                  id: string;
                }>
              >`
                SELECT "id"
                FROM "User"
                WHERE "id" = ${employeeId}
                FOR UPDATE
              `;

            if (
              locked.length !==
              1
            ) {
              throw new NotFoundException({
                code:
                  'EMPLOYEE_NOT_FOUND',

                message:
                  'پرسنل پیدا نشد.',
              });
            }

            const employee =
              await tx.user.findUnique({
                where: {
                  id:
                    employeeId,
                },
              });

            this.assertEmployee(
              employee,
            );

            const totals =
              await this.totals(
                tx,
                employee,
              );

            if (
              totals.balance <=
              0n
            ) {
              throw new ConflictException({
                code:
                  'NO_EMPLOYEE_BALANCE',

                message:
                  'مانده قابل پرداختی برای این پرسنل وجود ندارد.',

                availableBalance:
                  totals.balance.toString(),
              });
            }

            if (
              amount >
              totals.balance
            ) {
              throw new ConflictException({
                code:
                  'PAYMENT_EXCEEDS_BALANCE',

                message:
                  'مبلغ پرداخت بیشتر از مانده حساب است.',

                availableBalance:
                  totals.balance.toString(),
              });
            }

            const payment =
              await tx.employeePayment.create({
                data: {
                  employeeId,

                  amount:
                    dto.amount,

                  paymentMethod,

                  paidAt,

                  note:
                    dto.note?.trim() ||
                    null,

                  receiptFileName:
                    storedReceipt
                      ?.fileName ??
                    null,

                  receiptOriginalName:
                    storedReceipt
                      ?.originalName ??
                    null,

                  receiptMimeType:
                    storedReceipt
                      ?.mimeType ??
                    null,

                  recordedById:
                    managerId,
                },
              });

            const balanceAfter =
              totals.balance -
              amount;

            await tx.auditLog.create({
              data: {
                actorId:
                  managerId,

                action:
                  'EMPLOYEE_PAYMENT_RECORDED',

                entityType:
                  'EmployeePayment',

                entityId:
                  payment.id,

                afterData: {
                  employeeId,

                  amount:
                    dto.amount,

                  paymentMethod,

                  paidAt:
                    payment.paidAt
                      .toISOString(),

                  note:
                    payment.note,

                  hasReceipt:
                    Boolean(
                      payment.receiptFileName,
                    ),

                  receiptOriginalName:
                    payment.receiptOriginalName,

                  balanceBefore:
                    totals.balance
                      .toString(),

                  balanceAfter:
                    balanceAfter
                      .toString(),
                },
              },
            });

            return {
              payment: {
                id:
                  payment.id,

                employeeId:
                  payment.employeeId,

                amount:
                  payment.amount.toString(),

                paymentMethod:
                  payment.paymentMethod,

                paidAt:
                  payment.paidAt
                    .toISOString(),

                note:
                  payment.note,

                hasReceipt:
                  Boolean(
                    payment.receiptFileName,
                  ),

                receiptOriginalName:
                  payment.receiptOriginalName,

                recordedById:
                  payment.recordedById,

                createdAt:
                  payment.createdAt
                    .toISOString(),
              },

              account: {
                earned:
                  totals.earned
                    .toString(),

                paidBefore:
                  totals.paid
                    .toString(),

                paidAfter:
                  (
                    totals.paid +
                    amount
                  ).toString(),

                balanceBefore:
                  totals.balance
                    .toString(),

                balanceAfter:
                  balanceAfter
                    .toString(),
              },
            };
          },
        );

      return result;
    } catch (
      error
    ) {
      await this.removeReceipt(
        storedReceipt
          ?.fileName,
      );

      throw error;
    }
  }
}