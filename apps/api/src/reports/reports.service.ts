import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import ExcelJS from 'exceljs';

import {
  ApprovalStatus,
  CompensationType,
  OwnerPricingType,
  UserRole,
} from '../generated/prisma/enums';
import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  EmployeeReportQueryDto,
} from './dto/employee-report-query.dto';
import {
  OwnerReportQueryDto,
} from './dto/owner-report-query.dto';
import {
  WorkHistoryQueryDto,
} from './dto/work-history-query.dto';

type DateRange = {
  start: Date | null;
  endExclusive: Date | null;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private jalaliExcelDate(
    value: string,
  ): string {
    const formatter =
      new Intl.DateTimeFormat(
        'fa-IR-u-ca-persian-nu-latn',
        {
          timeZone:
            'UTC',
          year:
            'numeric',
          month:
            '2-digit',
          day:
            '2-digit',
        },
      );

    return value.replace(
      /\b(\d{4})-(\d{2})-(\d{2})\b/g,
      (dateText) => {
        const date =
          new Date(
            `${dateText}T12:00:00.000Z`,
          );

        if (
          Number.isNaN(
            date.getTime(),
          )
        ) {
          return dateText;
        }

        return formatter.format(
          date,
        );
      },
    );
  }

  private localizeWorkbookDates(
    workbook:
      ExcelJS.Workbook,
  ): void {
    const formatter =
      new Intl.DateTimeFormat(
        'fa-IR-u-ca-persian-nu-latn',
        {
          timeZone:
            'UTC',
          year:
            'numeric',
          month:
            '2-digit',
          day:
            '2-digit',
        },
      );

    workbook.eachSheet(
      (worksheet) => {
        worksheet.eachRow(
          (row) => {
            row.eachCell(
              (cell) => {
                if (
                  cell.value instanceof
                  Date
                ) {
                  cell.value =
                    formatter.format(
                      cell.value,
                    );

                  return;
                }

                if (
                  typeof cell.value ===
                  'string'
                ) {
                  cell.value =
                    this.jalaliExcelDate(
                      cell.value,
                    );
                }
              },
            );
          },
        );
      },
    );
  }

  private money(
    value:
      | {
          toString(): string;
        }
      | string
      | number
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

  private parseDate(
    value: string,
  ): Date {
    const date =
      new Date(
        `${value}T00:00:00.000Z`,
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      throw new BadRequestException({
        code:
          'INVALID_REPORT_DATE',
        message:
          'تاریخ گزارش معتبر نیست.',
      });
    }

    return date;
  }

  private range(
    from?: string,
    to?: string,
  ): DateRange {
    const start =
      from
        ? this.parseDate(
            from,
          )
        : null;

    let endExclusive:
      Date | null =
        null;

    if (to) {
      const end =
        this.parseDate(
          to,
        );

      endExclusive =
        new Date(
          end.getTime() +
            24 * 60 * 60 * 1000,
        );
    }

    if (
      start &&
      endExclusive &&
      start.getTime() >=
        endExclusive.getTime()
    ) {
      throw new BadRequestException({
        code:
          'INVALID_REPORT_RANGE',
        message:
          'تاریخ شروع باید قبل از تاریخ پایان باشد.',
      });
    }

    return {
      start,
      endExclusive,
    };
  }

  private inRange(
    date: Date,
    range: DateRange,
  ): boolean {
    if (
      range.start &&
      date.getTime() <
        range.start.getTime()
    ) {
      return false;
    }

    if (
      range.endExclusive &&
      date.getTime() >=
        range.endExclusive.getTime()
    ) {
      return false;
    }

    return true;
  }

  private salaryInRange(
    year: number,
    month: number,
    range: DateRange,
  ): boolean {
    if (
      !range.start &&
      !range.endExclusive
    ) {
      return true;
    }

    const monthStart =
      new Date(
        Date.UTC(
          year,
          month - 1,
          1,
        ),
      );

    const nextMonth =
      new Date(
        Date.UTC(
          year,
          month,
          1,
        ),
      );

    if (
      range.endExclusive &&
      monthStart.getTime() >=
        range.endExclusive.getTime()
    ) {
      return false;
    }

    if (
      range.start &&
      nextMonth.getTime() <=
        range.start.getTime()
    ) {
      return false;
    }

    return true;
  }

  private roleLabel(
    role: UserRole,
  ): string {
    switch (role) {
      case UserRole.WORKER:
        return 'همکار';

      case UserRole.SUPERVISOR:
        return 'سرپرست';

      case UserRole.ASSISTANT:
        return 'وردست';

      case UserRole.MANAGER:
        return 'مدیر';
    }
  }

  private compensationLabel(
    type: CompensationType,
  ): string {
    switch (type) {
      case CompensationType.PIECE_RATE:
        return 'دانه‌ای';

      case CompensationType.FIXED_MONTHLY:
        return 'حقوق ثابت';

      case CompensationType.NONE:
        return 'بدون حقوق';
    }
  }

  private pricingLabel(
    type: OwnerPricingType,
  ): string {
    return type ===
      OwnerPricingType.PER_PIECE
        ? 'دانه‌ای'
        : 'مبلغ ثابت';
  }

  private batchDue(
    batch: {
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
    },
  ): bigint {
    if (
      batch.ownerPricingType ===
      OwnerPricingType.PER_PIECE
    ) {
      return (
        this.money(
          batch.ownerUnitPrice,
        ) *
        BigInt(
          batch.totalQuantity,
        )
      );
    }

    return this.money(
      batch.ownerFixedAmount,
    );
  }

  private excelValue(
    value:
      | bigint
      | string,
  ): number | string {
    const big =
      typeof value ===
      'bigint'
        ? value
        : BigInt(
            value,
          );

    const max =
      BigInt(
        Number.MAX_SAFE_INTEGER,
      );

    const min =
      -max;

    if (
      big <= max &&
      big >= min
    ) {
      return Number(
        big,
      );
    }

    return big.toString();
  }

  private styleHeader(
    row: ExcelJS.Row,
  ) {
    row.height =
      28;

    row.eachCell(
      (cell) => {
        cell.font = {
          bold:
            true,
          color: {
            argb:
              'FFFFFFFF',
          },
          name:
            'Vazirmatn',
          size:
            10,
        };

        cell.fill = {
          type:
            'pattern',
          pattern:
            'solid',
          fgColor: {
            argb:
              'FF1F2937',
          },
        };

        cell.alignment = {
          horizontal:
            'center',
          vertical:
            'middle',
          wrapText:
            true,
        };

        cell.border = {
          bottom: {
            style:
              'thin',
            color: {
              argb:
                'FFD1D5DB',
            },
          },
        };
      },
    );
  }

  private styleWorksheet(
    sheet: ExcelJS.Worksheet,
  ) {
    sheet.views = [
      {
        state:
          'frozen',
        ySplit:
          1,
        rightToLeft:
          true,
      },
    ];

    sheet.properties.defaultRowHeight =
      22;

    sheet.eachRow(
      {
        includeEmpty:
          false,
      },
      (row, rowNumber) => {
        row.eachCell(
          {
            includeEmpty:
              true,
          },
          (cell) => {
            cell.font = {
              ...cell.font,
              name:
                'Vazirmatn',
              size:
                rowNumber === 1
                  ? 10
                  : 9,
            };

            cell.alignment = {
              vertical:
                'middle',
              horizontal:
                'center',
              wrapText:
                true,
            };
          },
        );
      },
    );

    this.styleHeader(
      sheet.getRow(1),
    );

    sheet.autoFilter = {
      from: {
        row:
          1,
        column:
          1,
      },
      to: {
        row:
          1,
        column:
          sheet.columnCount,
      },
    };
  }

  private styleTotalRow(
    row: ExcelJS.Row,
  ) {
    row.font = {
      bold:
        true,
      name:
        'Vazirmatn',
    };

    row.fill = {
      type:
        'pattern',
      pattern:
        'solid',
      fgColor: {
        argb:
          'FFE5E7EB',
      },
    };
  }

  async employees(
    query: EmployeeReportQueryDto,
  ) {
    const range =
      this.range(
        query.from,
        query.to,
      );

    const where: any = {
      role: {
        in: [
          UserRole.WORKER,
          UserRole.SUPERVISOR,
          UserRole.ASSISTANT,
        ],
      },
    };

    if (
      query.employeeId
    ) {
      where.id =
        query.employeeId;
    }

    if (
      query.role
    ) {
      where.role =
        query.role;
    }

    if (
      query.isActive !==
      undefined
    ) {
      where.isActive =
        query.isActive ===
        'true';
    }

    if (
      query.q?.trim()
    ) {
      const q =
        query.q.trim();

      where.OR = [
        {
          fullName: {
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
      ];
    }

    const employees =
      await this.prisma.user.findMany({
        where,
        orderBy: {
          fullName:
            'asc',
        },
      });

    const items:
      Array<any> = [];

    const paymentItems:
      Array<any> = [];

    const salaryItems:
      Array<any> = [];

    let totalPeriodEarned =
      0n;

    let totalPeriodPaid =
      0n;

    let totalLifetimeEarned =
      0n;

    let totalLifetimePaid =
      0n;

    let totalCurrentBalance =
      0n;

    for (
      const employee of employees
    ) {
      const payments =
        await this.prisma.employeePayment.findMany({
          where: {
            employeeId:
              employee.id,
          },
          include: {
            recordedBy: {
              select: {
                fullName:
                  true,
              },
            },
          },
          orderBy: {
            paidAt:
              'desc',
          },
        });

      const periodPayments =
        payments.filter(
          (payment) =>
            this.inRange(
              payment.paidAt,
              range,
            ),
        );

      let lifetimeEarned =
        0n;

      let periodEarned =
        0n;

      let pendingAmount =
        0n;

      let approvedWorkEntries =
        0;

      let approvedQuantity =
        0;

      let pendingWorkEntries =
        0;

      let pendingQuantity =
        0;

      let approvedTimeEntries =
        0;

      let approvedMinutes =
        0;

      let pendingTimeEntries =
        0;

      let pendingMinutes =
        0;

      if (
        employee.compensationType ===
        CompensationType.PIECE_RATE
      ) {
        const workEntries =
          await this.prisma.workEntry.findMany({
            where: {
              workerId:
                employee.id,
            },
            orderBy: {
              createdAt:
                'desc',
            },
          });

        for (
          const entry of workEntries
        ) {
          if (
            entry.status ===
            ApprovalStatus.APPROVED
          ) {
            lifetimeEarned +=
              this.money(
                entry.totalAmount,
              );
          }

          if (
            !this.inRange(
              entry.createdAt,
              range,
            )
          ) {
            continue;
          }

          if (
            entry.status ===
            ApprovalStatus.APPROVED
          ) {
            periodEarned +=
              this.money(
                entry.totalAmount,
              );

            approvedWorkEntries +=
              1;

            approvedQuantity +=
              entry.quantity;
          }

          if (
            entry.status ===
            ApprovalStatus.PENDING
          ) {
            pendingAmount +=
              this.money(
                entry.totalAmount,
              );

            pendingWorkEntries +=
              1;

            pendingQuantity +=
              entry.quantity;
          }
        }
      } else {
        const salaries =
          await this.prisma.monthlySalary.findMany({
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
          });

        for (
          const salary of salaries
        ) {
          lifetimeEarned +=
            this.money(
              salary.amount,
            );

          if (
            this.salaryInRange(
              salary.year,
              salary.month,
              range,
            )
          ) {
            periodEarned +=
              this.money(
                salary.amount,
              );

            salaryItems.push({
              employeeId:
                employee.id,
              employeeName:
                employee.fullName,
              role:
                employee.role,
              roleLabel:
                this.roleLabel(
                  employee.role,
                ),
              year:
                salary.year,
              month:
                salary.month,
              amount:
                salary.amount
                  .toString(),
              note:
                salary.note,
            });
          }
        }

        const timeEntries =
          await this.prisma.timeEntry.findMany({
            where: {
              employeeId:
                employee.id,
            },
            orderBy: {
              workDate:
                'desc',
            },
          });

        for (
          const entry of timeEntries
        ) {
          if (
            !this.inRange(
              entry.workDate,
              range,
            )
          ) {
            continue;
          }

          if (
            entry.status ===
            ApprovalStatus.APPROVED
          ) {
            approvedTimeEntries +=
              1;

            approvedMinutes +=
              entry.minutesWorked;
          }

          if (
            entry.status ===
            ApprovalStatus.PENDING
          ) {
            pendingTimeEntries +=
              1;

            pendingMinutes +=
              entry.minutesWorked;
          }
        }
      }

      let lifetimePaid =
        0n;

      let periodPaid =
        0n;

      for (
        const payment of payments
      ) {
        lifetimePaid +=
          this.money(
            payment.amount,
          );
      }

      for (
        const payment of periodPayments
      ) {
        periodPaid +=
          this.money(
            payment.amount,
          );

        paymentItems.push({
          id:
            payment.id,
          employeeId:
            employee.id,
          employeeName:
            employee.fullName,
          role:
            employee.role,
          roleLabel:
            this.roleLabel(
              employee.role,
            ),
          amount:
            payment.amount
              .toString(),
          paidAt:
            payment.paidAt
              .toISOString(),
          note:
            payment.note,
          recordedBy:
            payment.recordedBy
              .fullName,
        });
      }

      const currentBalance =
        lifetimeEarned -
        lifetimePaid;

      totalPeriodEarned +=
        periodEarned;

      totalPeriodPaid +=
        periodPaid;

      totalLifetimeEarned +=
        lifetimeEarned;

      totalLifetimePaid +=
        lifetimePaid;

      totalCurrentBalance +=
        currentBalance;

      items.push({
        id:
          employee.id,
        fullName:
          employee.fullName,
        phone:
          employee.phone,
        role:
          employee.role,
        roleLabel:
          this.roleLabel(
            employee.role,
          ),
        compensationType:
          employee.compensationType,
        compensationLabel:
          this.compensationLabel(
            employee.compensationType,
          ),
        isActive:
          employee.isActive,
        defaultMonthlySalary:
          employee.defaultMonthlySalary
            ?.toString() ??
          null,

        periodEarned:
          periodEarned.toString(),
        periodPaid:
          periodPaid.toString(),
        pendingAmount:
          pendingAmount.toString(),

        lifetimeEarned:
          lifetimeEarned.toString(),
        lifetimePaid:
          lifetimePaid.toString(),
        currentBalance:
          currentBalance.toString(),

        approvedWorkEntries,
        approvedQuantity,
        pendingWorkEntries,
        pendingQuantity,

        approvedTimeEntries,
        approvedMinutes,
        pendingTimeEntries,
        pendingMinutes,
      });
    }

    return {
      filters: {
        employeeId:
          query.employeeId ??
          null,
        q:
          query.q ??
          null,
        role:
          query.role ??
          null,
        isActive:
          query.isActive ??
          null,
        from:
          query.from ??
          null,
        to:
          query.to ??
          null,
      },
      totals: {
        employees:
          items.length,
        periodEarned:
          totalPeriodEarned
            .toString(),
        periodPaid:
          totalPeriodPaid
            .toString(),
        lifetimeEarned:
          totalLifetimeEarned
            .toString(),
        lifetimePaid:
          totalLifetimePaid
            .toString(),
        currentBalance:
          totalCurrentBalance
            .toString(),
      },
      items,
      payments:
        paymentItems,
      monthlySalaries:
        salaryItems,
    };
  }

  async workHistory(
    query: WorkHistoryQueryDto,
  ) {
    const range =
      this.range(
        query.from,
        query.to,
      );

    const where: any = {};

    if (
      query.employeeId
    ) {
      where.workerId =
        query.employeeId;
    }

    if (
      query.workBatchSizeId
    ) {
      where.workBatchSizeId =
        query.workBatchSizeId;
    }

    if (
      query.status
    ) {
      where.status =
        query.status;
    }

    if (
      query.reviewerId
    ) {
      where.reviewedById =
        query.reviewerId;
    }

    if (
      query.workBatchId ||
      query.operationId
    ) {
      where.batchOperation = {
        ...(query.workBatchId
          ? {
              workBatchId:
                query.workBatchId,
            }
          : {}),
        ...(query.operationId
          ? {
              operationId:
                query.operationId,
            }
          : {}),
      };
    }

    if (
      range.start ||
      range.endExclusive
    ) {
      where.createdAt = {
        ...(range.start
          ? {
              gte:
                range.start,
            }
          : {}),
        ...(range.endExclusive
          ? {
              lt:
                range.endExclusive,
            }
          : {}),
      };
    }

    const entries =
      await this.prisma.workEntry.findMany({
        where,
        include: {
          worker: {
            select: {
              id:
                true,
              fullName:
                true,
              phone:
                true,
            },
          },
          reviewedBy: {
            select: {
              id:
                true,
              fullName:
                true,
            },
          },
          workBatchSize:
            true,
          batchOperation: {
            include: {
              operation:
                true,
              workBatch: {
                include: {
                  owner:
                    true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            createdAt:
              'desc',
          },
          {
            id:
              'desc',
          },
        ],
      });

    let totalQuantity =
      0;

    let totalAmount =
      0n;

    const employees =
      new Set<string>();

    const operations =
      new Set<string>();

    const batches =
      new Set<string>();

    const items =
      entries.map(
        (entry) => {
          totalQuantity +=
            entry.quantity;

          totalAmount +=
            this.money(
              entry.totalAmount,
            );

          employees.add(
            entry.workerId,
          );

          operations.add(
            entry.batchOperation
              .operationId,
          );

          batches.add(
            entry.batchOperation
              .workBatchId,
          );

          return {
            id:
              entry.id,
            employeeId:
              entry.workerId,
            employeeName:
              entry.worker.fullName,
            employeePhone:
              entry.worker.phone,
            batchId:
              entry.batchOperation
                .workBatchId,
            batchCode:
              entry.batchOperation
                .workBatch.code,
            modelName:
              entry.batchOperation
                .workBatch.modelName,
            ownerId:
              entry.batchOperation
                .workBatch.ownerId,
            ownerName:
              entry.batchOperation
                .workBatch.owner.name,
            operationId:
              entry.batchOperation
                .operationId,
            operationName:
              entry.batchOperation
                .operation.name,
            workBatchSizeId:
              entry.workBatchSizeId,
            sizeLabel:
              entry.workBatchSize.label,
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
            reviewer:
              entry.reviewedBy
                ? {
                    id:
                      entry.reviewedBy.id,
                    fullName:
                      entry.reviewedBy.fullName,
                  }
                : null,
            reviewedAt:
              entry.reviewedAt
                ?.toISOString() ??
              null,
            createdAt:
              entry.createdAt.toISOString(),
          };
        },
      );

    const employeeSummaryMap =
      new Map<
        string,
        {
          employeeId: string;
          employeeName: string;
          employeePhone: string;
          entries: number;
          quantity: number;
          amount: bigint;
        }
      >();

    for (
      const item of items
    ) {
      const current =
        employeeSummaryMap.get(
          item.employeeId,
        ) ?? {
          employeeId:
            item.employeeId,
          employeeName:
            item.employeeName,
          employeePhone:
            item.employeePhone,
          entries:
            0,
          quantity:
            0,
          amount:
            0n,
        };

      current.entries +=
        1;

      current.quantity +=
        item.quantity;

      current.amount +=
        this.money(
          item.totalAmount,
        );

      employeeSummaryMap.set(
        item.employeeId,
        current,
      );
    }

    const employeeSummary =
      Array.from(
        employeeSummaryMap.values(),
      )
        .sort(
          (a, b) =>
            b.quantity -
            a.quantity,
        )
        .map(
          (item) => ({
            employeeId:
              item.employeeId,
            employeeName:
              item.employeeName,
            employeePhone:
              item.employeePhone,
            entries:
              item.entries,
            quantity:
              item.quantity,
            amount:
              item.amount.toString(),
          }),
        );

    return {
      filters: {
        employeeId:
          query.employeeId ??
          null,
        workBatchId:
          query.workBatchId ??
          null,
        operationId:
          query.operationId ??
          null,
        workBatchSizeId:
          query.workBatchSizeId ??
          null,
        status:
          query.status ??
          null,
        reviewerId:
          query.reviewerId ??
          null,
        from:
          query.from ??
          null,
        to:
          query.to ??
          null,
      },
      totals: {
        entries:
          items.length,
        employees:
          employees.size,
        operations:
          operations.size,
        batches:
          batches.size,
        quantity:
          totalQuantity,
        amount:
          totalAmount.toString(),
      },
      employeeSummary,
      items,
    };
  }

  async workHistoryExcel(
    query: WorkHistoryQueryDto,
  ): Promise<Buffer> {
    const report =
      await this.workHistory(
        query,
      );

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      'Bagheri Production';

    workbook.created =
      new Date();

    const employeeSummarySheet =
      workbook.addWorksheet(
        'خلاصه افراد',
      );

    employeeSummarySheet.columns = [
      {
        header:
          'پرسنل',
        key:
          'employee',
        width:
          24,
      },
      {
        header:
          'موبایل',
        key:
          'phone',
        width:
          16,
      },
      {
        header:
          'تعداد ثبت',
        key:
          'entries',
        width:
          14,
      },
      {
        header:
          'تعداد قطعه',
        key:
          'quantity',
        width:
          14,
      },
      {
        header:
          'مبلغ',
        key:
          'amount',
        width:
          18,
      },
    ];

    for (
      const item of
      report.employeeSummary
    ) {
      employeeSummarySheet.addRow({
        employee:
          item.employeeName,
        phone:
          item.employeePhone,
        entries:
          item.entries,
        quantity:
          item.quantity,
        amount:
          this.excelValue(
            item.amount,
          ),
      });
    }

    employeeSummarySheet.getColumn(
      'E',
    ).numFmt =
      '#,##0';

    this.styleWorksheet(
      employeeSummarySheet,
    );

    const sheet =
      workbook.addWorksheet(
        'سوابق عملیات',
      );

    sheet.columns = [
      {
        header:
          'تاریخ ثبت',
        key:
          'createdAt',
        width:
          22,
      },
      {
        header:
          'پرسنل',
        key:
          'employee',
        width:
          24,
      },
      {
        header:
          'موبایل',
        key:
          'phone',
        width:
          16,
      },
      {
        header:
          'صاحبکار',
        key:
          'owner',
        width:
          20,
      },
      {
        header:
          'سری‌کار',
        key:
          'batch',
        width:
          16,
      },
      {
        header:
          'مدل',
        key:
          'model',
        width:
          18,
      },
      {
        header:
          'عملیات',
        key:
          'operation',
        width:
          24,
      },
      {
        header:
          'سایز',
        key:
          'size',
        width:
          12,
      },
      {
        header:
          'تعداد',
        key:
          'quantity',
        width:
          12,
      },
      {
        header:
          'نرخ واحد',
        key:
          'unitRate',
        width:
          16,
      },
      {
        header:
          'مبلغ',
        key:
          'amount',
        width:
          18,
      },
      {
        header:
          'وضعیت',
        key:
          'status',
        width:
          14,
      },
      {
        header:
          'تأییدکننده',
        key:
          'reviewer',
        width:
          22,
      },
      {
        header:
          'زمان تأیید',
        key:
          'reviewedAt',
        width:
          22,
      },
      {
        header:
          'توضیح همکار',
        key:
          'workerNote',
        width:
          28,
      },
      {
        header:
          'توضیح بررسی',
        key:
          'reviewerNote',
        width:
          28,
      },
    ];

    const statusLabel =
      (status: ApprovalStatus) => {
        switch (status) {
          case ApprovalStatus.APPROVED:
            return 'تأییدشده';
          case ApprovalStatus.PENDING:
            return 'در انتظار';
          case ApprovalStatus.REJECTED:
            return 'ردشده';
        }
      };

    for (
      const item of report.items
    ) {
      sheet.addRow({
        createdAt:
          item.createdAt,
        employee:
          item.employeeName,
        phone:
          item.employeePhone,
        owner:
          item.ownerName,
        batch:
          item.batchCode,
        model:
          item.modelName,
        operation:
          item.operationName,
        size:
          item.sizeLabel,
        quantity:
          item.quantity,
        unitRate:
          this.excelValue(
            item.unitRate,
          ),
        amount:
          this.excelValue(
            item.totalAmount,
          ),
        status:
          statusLabel(
            item.status,
          ),
        reviewer:
          item.reviewer
            ?.fullName ??
          null,
        reviewedAt:
          item.reviewedAt,
        workerNote:
          item.workerNote,
        reviewerNote:
          item.reviewerNote,
      });
    }

    const totalRow =
      sheet.addRow({
        employee:
          'جمع فیلتر',
        quantity:
          report.totals
            .quantity,
        amount:
          this.excelValue(
            report.totals
              .amount,
          ),
      });

    this.styleTotalRow(
      totalRow,
    );

    sheet.getColumn(
      'I',
    ).numFmt =
      '#,##0';

    sheet.getColumn(
      'J',
    ).numFmt =
      '#,##0';

    sheet.getColumn(
      'K',
    ).numFmt =
      '#,##0';

    this.styleWorksheet(
      sheet,
    );

    this.localizeWorkbookDates(
      workbook,
    );

    const buffer =
      await workbook.xlsx.writeBuffer();

    return Buffer.from(
      buffer,
    );
  }

  async owners(
    query: OwnerReportQueryDto,
  ) {
    const range =
      this.range(
        query.from,
        query.to,
      );

    const where: any = {};

    if (
      query.ownerId
    ) {
      where.id =
        query.ownerId;
    }

    if (
      query.isActive !==
      undefined
    ) {
      where.isActive =
        query.isActive ===
        'true';
    }

    if (
      query.q?.trim()
    ) {
      const q =
        query.q.trim();

      where.OR = [
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
      ];
    }

    const owners =
      await this.prisma.owner.findMany({
        where,
        orderBy: {
          name:
            'asc',
        },
      });

    const items:
      Array<any> = [];

    const batchItems:
      Array<any> = [];

    const paymentItems:
      Array<any> = [];

    let totalPeriodDue =
      0n;

    let totalPeriodReceived =
      0n;

    let totalLifetimeDue =
      0n;

    let totalLifetimeReceived =
      0n;

    let totalCurrentBalance =
      0n;

    const hasBatchFilter =
      Boolean(
        query.workBatchId ||
        query.modelName ||
        query.status,
      );

    for (
      const owner of owners
    ) {
      const batches =
        await this.prisma.workBatch.findMany({
          where: {
            ownerId:
              owner.id,
          },
          orderBy: {
            createdAt:
              'asc',
          },
        });

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
                fullName:
                  true,
              },
            },
          },
          orderBy: {
            paidAt:
              'desc',
          },
        });

      let lifetimeDue =
        0n;

      for (
        const batch of batches
      ) {
        lifetimeDue +=
          this.batchDue(
            batch,
          );
      }

      let lifetimeReceived =
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

        lifetimeReceived +=
          amount;

        if (
          payment.workBatchId ===
          null
        ) {
          unallocatedReceived +=
            amount;
        }
      }

      const matchingBatches =
        batches.filter(
          (batch) => {
            if (
              query.workBatchId &&
              batch.id !==
                query.workBatchId
            ) {
              return false;
            }

            if (
              query.modelName &&
              !(batch.modelName ?? "")
                .toLocaleLowerCase()
                .includes(
                  query.modelName
                    .toLocaleLowerCase(),
                )
            ) {
              return false;
            }

            if (
              query.status &&
              batch.status !==
                query.status
            ) {
              return false;
            }

            const activityDate =
              batch.startDate ??
              batch.createdAt;

            return this.inRange(
              activityDate,
              range,
            );
          },
        );

      const matchingIds =
        new Set(
          matchingBatches.map(
            (batch) =>
              batch.id,
          ),
        );

      const matchingPayments =
        payments.filter(
          (payment) => {
            if (
              !this.inRange(
                payment.paidAt,
                range,
              )
            ) {
              return false;
            }

            if (
              hasBatchFilter
            ) {
              return (
                payment.workBatchId !==
                  null &&
                matchingIds.has(
                  payment.workBatchId,
                )
              );
            }

            return true;
          },
        );

      if (
        hasBatchFilter &&
        matchingBatches.length ===
          0
      ) {
        continue;
      }

      if (
        (
          range.start ||
          range.endExclusive
        ) &&
        !hasBatchFilter &&
        matchingBatches.length ===
          0 &&
        matchingPayments.length ===
          0
      ) {
        continue;
      }

      let periodDue =
        0n;

      for (
        const batch of matchingBatches
      ) {
        periodDue +=
          this.batchDue(
            batch,
          );

        let linkedReceived =
          0n;

        for (
          const payment of payments
        ) {
          if (
            payment.workBatchId ===
            batch.id
          ) {
            linkedReceived +=
              this.money(
                payment.amount,
              );
          }
        }

        const due =
          this.batchDue(
            batch,
          );

        batchItems.push({
          id:
            batch.id,
          ownerId:
            owner.id,
          ownerName:
            owner.name,
          code:
            batch.code,
          modelName:
            batch.modelName,
          status:
            batch.status,
          totalQuantity:
            batch.totalQuantity,
          ownerPricingType:
            batch.ownerPricingType,
          ownerPricingLabel:
            this.pricingLabel(
              batch.ownerPricingType,
            ),
          ownerUnitPrice:
            batch.ownerUnitPrice
              ?.toString() ??
            null,
          ownerFixedAmount:
            batch.ownerFixedAmount
              ?.toString() ??
            null,
          due:
            due.toString(),
          linkedReceived:
            linkedReceived
              .toString(),
          linkedBalance:
            (
              due -
              linkedReceived
            ).toString(),
          startDate:
            batch.startDate
              ?.toISOString()
              .slice(0, 10) ??
            null,
          createdAt:
            batch.createdAt
              .toISOString(),
        });
      }

      let periodReceived =
        0n;

      for (
        const payment of matchingPayments
      ) {
        periodReceived +=
          this.money(
            payment.amount,
          );

        paymentItems.push({
          id:
            payment.id,
          ownerId:
            owner.id,
          ownerName:
            owner.name,
          workBatchId:
            payment.workBatchId,
          batchCode:
            payment.workBatch?.code ??
            null,
          modelName:
            payment.workBatch
              ?.modelName ??
            null,
          amount:
            payment.amount
              .toString(),
          paidAt:
            payment.paidAt
              .toISOString(),
          note:
            payment.note,
          recordedBy:
            payment.recordedBy
              .fullName,
        });
      }

      const currentBalance =
        lifetimeDue -
        lifetimeReceived;

      totalPeriodDue +=
        periodDue;

      totalPeriodReceived +=
        periodReceived;

      totalLifetimeDue +=
        lifetimeDue;

      totalLifetimeReceived +=
        lifetimeReceived;

      totalCurrentBalance +=
        currentBalance;

      items.push({
        id:
          owner.id,
        name:
          owner.name,
        phone:
          owner.phone,
        isActive:
          owner.isActive,
        matchedBatchCount:
          matchingBatches.length,

        periodDue:
          periodDue.toString(),
        periodReceived:
          periodReceived.toString(),

        lifetimeDue:
          lifetimeDue.toString(),
        lifetimeReceived:
          lifetimeReceived.toString(),
        unallocatedReceived:
          unallocatedReceived
            .toString(),
        currentBalance:
          currentBalance.toString(),
      });
    }

    return {
      filters: {
        ownerId:
          query.ownerId ??
          null,
        q:
          query.q ??
          null,
        isActive:
          query.isActive ??
          null,
        workBatchId:
          query.workBatchId ??
          null,
        modelName:
          query.modelName ??
          null,
        status:
          query.status ??
          null,
        from:
          query.from ??
          null,
        to:
          query.to ??
          null,
      },
      totals: {
        owners:
          items.length,
        periodDue:
          totalPeriodDue
            .toString(),
        periodReceived:
          totalPeriodReceived
            .toString(),
        lifetimeDue:
          totalLifetimeDue
            .toString(),
        lifetimeReceived:
          totalLifetimeReceived
            .toString(),
        currentBalance:
          totalCurrentBalance
            .toString(),
      },
      items,
      batches:
        batchItems,
      payments:
        paymentItems,
    };
  }

  async employeesExcel(
    query: EmployeeReportQueryDto,
  ): Promise<Buffer> {
    const report =
      await this.employees(
        query,
      );

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      'Bagheri Production';

    workbook.created =
      new Date();

    workbook.calcProperties.fullCalcOnLoad =
      true;

    const summary =
      workbook.addWorksheet(
        'کارکنان',
      );

    summary.columns = [
      {
        header:
          'نام',
        key:
          'name',
        width:
          24,
      },
      {
        header:
          'موبایل',
        key:
          'phone',
        width:
          16,
      },
      {
        header:
          'نقش',
        key:
          'role',
        width:
          12,
      },
      {
        header:
          'نوع حقوق',
        key:
          'compensation',
        width:
          14,
      },
      {
        header:
          'وضعیت',
        key:
          'active',
        width:
          11,
      },
      {
        header:
          'درآمد بازه',
        key:
          'periodEarned',
        width:
          18,
      },
      {
        header:
          'پرداخت بازه',
        key:
          'periodPaid',
        width:
          18,
      },
      {
        header:
          'در انتظار',
        key:
          'pendingAmount',
        width:
          18,
      },
      {
        header:
          'درآمد کل',
        key:
          'lifetimeEarned',
        width:
          18,
      },
      {
        header:
          'پرداخت کل',
        key:
          'lifetimePaid',
        width:
          18,
      },
      {
        header:
          'مانده فعلی',
        key:
          'balance',
        width:
          18,
      },
      {
        header:
          'کار تاییدشده',
        key:
          'approvedWorkEntries',
        width:
          15,
      },
      {
        header:
          'تعداد تاییدشده',
        key:
          'approvedQuantity',
        width:
          16,
      },
      {
        header:
          'کار در انتظار',
        key:
          'pendingWorkEntries',
        width:
          15,
      },
      {
        header:
          'تعداد در انتظار',
        key:
          'pendingQuantity',
        width:
          16,
      },
      {
        header:
          'روز تاییدشده',
        key:
          'approvedTimeEntries',
        width:
          15,
      },
      {
        header:
          'دقیقه تاییدشده',
        key:
          'approvedMinutes',
        width:
          16,
      },
      {
        header:
          'روز در انتظار',
        key:
          'pendingTimeEntries',
        width:
          15,
      },
      {
        header:
          'دقیقه در انتظار',
        key:
          'pendingMinutes',
        width:
          16,
      },
    ];

    for (
      const item of report.items
    ) {
      summary.addRow({
        name:
          item.fullName,
        phone:
          item.phone,
        role:
          item.roleLabel,
        compensation:
          item.compensationLabel,
        active:
          item.isActive
            ? 'فعال'
            : 'غیرفعال',
        periodEarned:
          this.excelValue(
            item.periodEarned,
          ),
        periodPaid:
          this.excelValue(
            item.periodPaid,
          ),
        pendingAmount:
          this.excelValue(
            item.pendingAmount,
          ),
        lifetimeEarned:
          this.excelValue(
            item.lifetimeEarned,
          ),
        lifetimePaid:
          this.excelValue(
            item.lifetimePaid,
          ),
        balance:
          this.excelValue(
            item.currentBalance,
          ),
        approvedWorkEntries:
          item.approvedWorkEntries,
        approvedQuantity:
          item.approvedQuantity,
        pendingWorkEntries:
          item.pendingWorkEntries,
        pendingQuantity:
          item.pendingQuantity,
        approvedTimeEntries:
          item.approvedTimeEntries,
        approvedMinutes:
          item.approvedMinutes,
        pendingTimeEntries:
          item.pendingTimeEntries,
        pendingMinutes:
          item.pendingMinutes,
      });
    }

    const totalRow =
      summary.addRow({
        name:
          'جمع کل',
        periodEarned:
          this.excelValue(
            report.totals
              .periodEarned,
          ),
        periodPaid:
          this.excelValue(
            report.totals
              .periodPaid,
          ),
        lifetimeEarned:
          this.excelValue(
            report.totals
              .lifetimeEarned,
          ),
        lifetimePaid:
          this.excelValue(
            report.totals
              .lifetimePaid,
          ),
        balance:
          this.excelValue(
            report.totals
              .currentBalance,
          ),
      });

    this.styleTotalRow(
      totalRow,
    );

    for (
      const column of [
        'F',
        'G',
        'H',
        'I',
        'J',
        'K',
      ]
    ) {
      summary.getColumn(
        column,
      ).numFmt =
        '#,##0';
    }

    this.styleWorksheet(
      summary,
    );

    const reportRange =
      this.range(
        query.from,
        query.to,
      );

    const employeeIds =
      report.items.map(
        (item) =>
          item.id,
      );

    const detailedWorkEntries =
      employeeIds.length ===
      0
        ? []
        : await this.prisma.workEntry.findMany({
            where: {
              workerId: {
                in:
                  employeeIds,
              },
              ...(reportRange.start ||
              reportRange.endExclusive
                ? {
                    createdAt: {
                      ...(reportRange.start
                        ? {
                            gte:
                              reportRange.start,
                          }
                        : {}),
                      ...(reportRange.endExclusive
                        ? {
                            lt:
                              reportRange.endExclusive,
                          }
                        : {}),
                    },
                  }
                : {}),
            },
            include: {
              worker: {
                select: {
                  fullName:
                    true,
                  phone:
                    true,
                },
              },
              reviewedBy: {
                select: {
                  fullName:
                    true,
                },
              },
              workBatchSize:
                true,
              batchOperation: {
                include: {
                  operation:
                    true,
                  workBatch: {
                    include: {
                      owner:
                        true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt:
                'desc',
            },
          });

    const operationsSheet =
      workbook.addWorksheet(
        'ریز عملیات',
      );

    operationsSheet.columns = [
      {
        header:
          'تاریخ ثبت',
        key:
          'createdAt',
        width:
          22,
      },
      {
        header:
          'پرسنل',
        key:
          'employee',
        width:
          24,
      },
      {
        header:
          'موبایل',
        key:
          'phone',
        width:
          16,
      },
      {
        header:
          'صاحبکار',
        key:
          'owner',
        width:
          20,
      },
      {
        header:
          'سری‌کار',
        key:
          'batch',
        width:
          16,
      },
      {
        header:
          'مدل',
        key:
          'model',
        width:
          18,
      },
      {
        header:
          'عملیات',
        key:
          'operation',
        width:
          24,
      },
      {
        header:
          'سایز',
        key:
          'size',
        width:
          12,
      },
      {
        header:
          'تعداد',
        key:
          'quantity',
        width:
          12,
      },
      {
        header:
          'نرخ واحد',
        key:
          'unitRate',
        width:
          16,
      },
      {
        header:
          'مبلغ',
        key:
          'amount',
        width:
          18,
      },
      {
        header:
          'وضعیت',
        key:
          'status',
        width:
          14,
      },
      {
        header:
          'تأییدکننده',
        key:
          'reviewer',
        width:
          22,
      },
      {
        header:
          'زمان تأیید',
        key:
          'reviewedAt',
        width:
          22,
      },
    ];

    for (
      const entry of
      detailedWorkEntries
    ) {
      operationsSheet.addRow({
        createdAt:
          entry.createdAt
            .toISOString(),
        employee:
          entry.worker.fullName,
        phone:
          entry.worker.phone,
        owner:
          entry.batchOperation
            .workBatch.owner.name,
        batch:
          entry.batchOperation
            .workBatch.code,
        model:
          entry.batchOperation
            .workBatch.modelName,
        operation:
          entry.batchOperation
            .operation.name,
        size:
          entry.workBatchSize.label,
        quantity:
          entry.quantity,
        unitRate:
          this.excelValue(
            entry.unitRate
              .toString(),
          ),
        amount:
          this.excelValue(
            entry.totalAmount
              .toString(),
          ),
        status:
          entry.status ===
          ApprovalStatus.APPROVED
            ? 'تأییدشده'
            : entry.status ===
                ApprovalStatus.PENDING
              ? 'در انتظار'
              : 'ردشده',
        reviewer:
          entry.reviewedBy
            ?.fullName ??
          null,
        reviewedAt:
          entry.reviewedAt
            ?.toISOString() ??
          null,
      });
    }

    operationsSheet.getColumn(
      'I',
    ).numFmt =
      '#,##0';

    operationsSheet.getColumn(
      'J',
    ).numFmt =
      '#,##0';

    operationsSheet.getColumn(
      'K',
    ).numFmt =
      '#,##0';

    this.styleWorksheet(
      operationsSheet,
    );

    const payments =
      workbook.addWorksheet(
        'پرداخت‌ها',
      );

    payments.columns = [
      {
        header:
          'پرسنل',
        key:
          'employee',
        width:
          24,
      },
      {
        header:
          'نقش',
        key:
          'role',
        width:
          14,
      },
      {
        header:
          'مبلغ',
        key:
          'amount',
        width:
          18,
      },
      {
        header:
          'تاریخ پرداخت',
        key:
          'paidAt',
        width:
          22,
      },
      {
        header:
          'توضیح',
        key:
          'note',
        width:
          32,
      },
      {
        header:
          'ثبت‌کننده',
        key:
          'recordedBy',
        width:
          22,
      },
    ];

    for (
      const payment of report.payments
    ) {
      payments.addRow({
        employee:
          payment.employeeName,
        role:
          payment.roleLabel,
        amount:
          this.excelValue(
            payment.amount,
          ),
        paidAt:
          payment.paidAt,
        note:
          payment.note,
        recordedBy:
          payment.recordedBy,
      });
    }

    payments.getColumn(
      'C',
    ).numFmt =
      '#,##0';

    this.styleWorksheet(
      payments,
    );

    const salaries =
      workbook.addWorksheet(
        'حقوق ماهانه',
      );

    salaries.columns = [
      {
        header:
          'پرسنل',
        key:
          'employee',
        width:
          24,
      },
      {
        header:
          'نقش',
        key:
          'role',
        width:
          14,
      },
      {
        header:
          'سال',
        key:
          'year',
        width:
          10,
      },
      {
        header:
          'ماه',
        key:
          'month',
        width:
          10,
      },
      {
        header:
          'مبلغ',
        key:
          'amount',
        width:
          18,
      },
      {
        header:
          'توضیح',
        key:
          'note',
        width:
          32,
      },
    ];

    for (
      const salary of
      report.monthlySalaries
    ) {
      salaries.addRow({
        employee:
          salary.employeeName,
        role:
          salary.roleLabel,
        year:
          salary.year,
        month:
          salary.month,
        amount:
          this.excelValue(
            salary.amount,
          ),
        note:
          salary.note,
      });
    }

    salaries.getColumn(
      'E',
    ).numFmt =
      '#,##0';

    this.styleWorksheet(
      salaries,
    );

    this.localizeWorkbookDates(workbook);


    const buffer =
      await workbook.xlsx.writeBuffer();

    return Buffer.from(
      buffer,
    );
  }

  async ownersExcel(
    query: OwnerReportQueryDto,
  ): Promise<Buffer> {
    const report =
      await this.owners(
        query,
      );

    const workbook =
      new ExcelJS.Workbook();

    workbook.creator =
      'Bagheri Production';

    workbook.created =
      new Date();

    const owners =
      workbook.addWorksheet(
        'صاحبکارها',
      );

    owners.columns = [
      {
        header:
          'صاحبکار',
        key:
          'name',
        width:
          25,
      },
      {
        header:
          'موبایل',
        key:
          'phone',
        width:
          16,
      },
      {
        header:
          'وضعیت',
        key:
          'active',
        width:
          11,
      },
      {
        header:
          'سری‌های فیلترشده',
        key:
          'batches',
        width:
          18,
      },
      {
        header:
          'طلب بازه',
        key:
          'periodDue',
        width:
          18,
      },
      {
        header:
          'دریافتی بازه',
        key:
          'periodReceived',
        width:
          18,
      },
      {
        header:
          'طلب کل',
        key:
          'lifetimeDue',
        width:
          18,
      },
      {
        header:
          'دریافتی کل',
        key:
          'lifetimeReceived',
        width:
          18,
      },
      {
        header:
          'دریافتی عمومی',
        key:
          'unallocated',
        width:
          18,
      },
      {
        header:
          'مانده فعلی',
        key:
          'balance',
        width:
          18,
      },
    ];

    for (
      const item of report.items
    ) {
      owners.addRow({
        name:
          item.name,
        phone:
          item.phone,
        active:
          item.isActive
            ? 'فعال'
            : 'غیرفعال',
        batches:
          item.matchedBatchCount,
        periodDue:
          this.excelValue(
            item.periodDue,
          ),
        periodReceived:
          this.excelValue(
            item.periodReceived,
          ),
        lifetimeDue:
          this.excelValue(
            item.lifetimeDue,
          ),
        lifetimeReceived:
          this.excelValue(
            item.lifetimeReceived,
          ),
        unallocated:
          this.excelValue(
            item.unallocatedReceived,
          ),
        balance:
          this.excelValue(
            item.currentBalance,
          ),
      });
    }

    const ownerTotal =
      owners.addRow({
        name:
          'جمع کل',
        periodDue:
          this.excelValue(
            report.totals
              .periodDue,
          ),
        periodReceived:
          this.excelValue(
            report.totals
              .periodReceived,
          ),
        lifetimeDue:
          this.excelValue(
            report.totals
              .lifetimeDue,
          ),
        lifetimeReceived:
          this.excelValue(
            report.totals
              .lifetimeReceived,
          ),
        balance:
          this.excelValue(
            report.totals
              .currentBalance,
          ),
      });

    this.styleTotalRow(
      ownerTotal,
    );

    for (
      const column of [
        'E',
        'F',
        'G',
        'H',
        'I',
        'J',
      ]
    ) {
      owners.getColumn(
        column,
      ).numFmt =
        '#,##0';
    }

    this.styleWorksheet(
      owners,
    );

    const batches =
      workbook.addWorksheet(
        'سری‌ها',
      );

    batches.columns = [
      {
        header:
          'صاحبکار',
        key:
          'owner',
        width:
          24,
      },
      {
        header:
          'کد سری',
        key:
          'code',
        width:
          17,
      },
      {
        header:
          'مدل',
        key:
          'model',
        width:
          22,
      },
      {
        header:
          'وضعیت',
        key:
          'status',
        width:
          14,
      },
      {
        header:
          'تعداد',
        key:
          'quantity',
        width:
          12,
      },
      {
        header:
          'نوع قیمت',
        key:
          'pricing',
        width:
          14,
      },
      {
        header:
          'قیمت دانه',
        key:
          'unitPrice',
        width:
          17,
      },
      {
        header:
          'مبلغ ثابت',
        key:
          'fixedAmount',
        width:
          17,
      },
      {
        header:
          'طلب سری',
        key:
          'due',
        width:
          18,
      },
      {
        header:
          'دریافتی متصل',
        key:
          'received',
        width:
          18,
      },
      {
        header:
          'مانده متصل',
        key:
          'balance',
        width:
          18,
      },
      {
        header:
          'تاریخ شروع',
        key:
          'startDate',
        width:
          15,
      },
    ];

    for (
      const batch of report.batches
    ) {
      batches.addRow({
        owner:
          batch.ownerName,
        code:
          batch.code,
        model:
          batch.modelName,
        status:
          batch.status,
        quantity:
          batch.totalQuantity,
        pricing:
          batch.ownerPricingLabel,
        unitPrice:
          batch.ownerUnitPrice ===
          null
            ? null
            : this.excelValue(
                batch.ownerUnitPrice,
              ),
        fixedAmount:
          batch.ownerFixedAmount ===
          null
            ? null
            : this.excelValue(
                batch.ownerFixedAmount,
              ),
        due:
          this.excelValue(
            batch.due,
          ),
        received:
          this.excelValue(
            batch.linkedReceived,
          ),
        balance:
          this.excelValue(
            batch.linkedBalance,
          ),
        startDate:
          batch.startDate,
      });
    }

    for (
      const column of [
        'G',
        'H',
        'I',
        'J',
        'K',
      ]
    ) {
      batches.getColumn(
        column,
      ).numFmt =
        '#,##0';
    }

    this.styleWorksheet(
      batches,
    );

    const payments =
      workbook.addWorksheet(
        'دریافتی‌ها',
      );

    payments.columns = [
      {
        header:
          'صاحبکار',
        key:
          'owner',
        width:
          24,
      },
      {
        header:
          'سری',
        key:
          'batch',
        width:
          17,
      },
      {
        header:
          'مدل',
        key:
          'model',
        width:
          22,
      },
      {
        header:
          'مبلغ',
        key:
          'amount',
        width:
          18,
      },
      {
        header:
          'تاریخ دریافت',
        key:
          'paidAt',
        width:
          22,
      },
      {
        header:
          'توضیح',
        key:
          'note',
        width:
          32,
      },
      {
        header:
          'ثبت‌کننده',
        key:
          'recordedBy',
        width:
          22,
      },
    ];

    for (
      const payment of report.payments
    ) {
      payments.addRow({
        owner:
          payment.ownerName,
        batch:
          payment.batchCode ??
          'عمومی',
        model:
          payment.modelName ??
          null,
        amount:
          this.excelValue(
            payment.amount,
          ),
        paidAt:
          payment.paidAt,
        note:
          payment.note,
        recordedBy:
          payment.recordedBy,
      });
    }

    payments.getColumn(
      'D',
    ).numFmt =
      '#,##0';

    this.styleWorksheet(
      payments,
    );

    this.localizeWorkbookDates(workbook);


    const buffer =
      await workbook.xlsx.writeBuffer();

    return Buffer.from(
      buffer,
    );
  }
}
