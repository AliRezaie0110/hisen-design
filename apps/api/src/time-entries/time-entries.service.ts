import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ApprovalStatus,
  CompensationType,
  UserRole,
} from '../generated/prisma/enums';
import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  CreateTimeEntryDto,
} from './dto/create-time-entry.dto';
import {
  ReviewTimeEntryDto,
} from './dto/review-time-entry.dto';

@Injectable()
export class TimeEntriesService {
  constructor(
    private readonly prisma:
      PrismaService,
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

  private parseWorkDate(
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
          'INVALID_WORK_DATE',
        message:
          'ØªØ§Ø±ÛŒØ® Ú©Ø§Ø±ÛŒ Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª.',
      });
    }

    if (
      date.getTime() >
      this.today().getTime()
    ) {
      throw new BadRequestException({
        code:
          'FUTURE_WORK_DATE_NOT_ALLOWED',
        message:
          'Ø«Ø¨Øª Ø³Ø§Ø¹Øª Ø¨Ø±Ø§ÛŒ Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø¢ÛŒÙ†Ø¯Ù‡ Ù…Ø¬Ø§Ø² Ù†ÛŒØ³Øª.',
      });
    }

    return date;
  }

  private resolveTime(
    dto: CreateTimeEntryDto,
  ) {
    const hasStart =
      dto.startedAt !== undefined;

    const hasEnd =
      dto.endedAt !== undefined;

    if (
      hasStart !== hasEnd
    ) {
      throw new BadRequestException({
        code:
          'TIME_RANGE_INCOMPLETE',
        message:
          'Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ùˆ Ù¾Ø§ÛŒØ§Ù† Ø¨Ø§ÛŒØ¯ Ø¨Ø§ Ù‡Ù… ÙˆØ§Ø±Ø¯ Ø´ÙˆÙ†Ø¯.',
      });
    }

    let startedAt:
      Date | null = null;

    let endedAt:
      Date | null = null;

    let calculatedMinutes:
      number | null = null;

    if (
      dto.startedAt &&
      dto.endedAt
    ) {
      startedAt =
        new Date(
          dto.startedAt,
        );

      endedAt =
        new Date(
          dto.endedAt,
        );

      const difference =
        endedAt.getTime() -
        startedAt.getTime();

      if (
        difference <= 0
      ) {
        throw new BadRequestException({
          code:
            'INVALID_TIME_RANGE',
          message:
            'Ø³Ø§Ø¹Øª Ù¾Ø§ÛŒØ§Ù† Ø¨Ø§ÛŒØ¯ Ø¨Ø¹Ø¯ Ø§Ø² Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ø¨Ø§Ø´Ø¯.',
        });
      }

      calculatedMinutes =
        Math.round(
          difference /
            60000,
        );

      if (
        calculatedMinutes < 1 ||
        calculatedMinutes > 1440
      ) {
        throw new BadRequestException({
          code:
            'INVALID_WORK_MINUTES',
          message:
            'Ù…Ø¯Øª Ú©Ø§Ø± Ø¨Ø§ÛŒØ¯ Ø¨ÛŒÙ† Û± Ø¯Ù‚ÛŒÙ‚Ù‡ ØªØ§ Û²Û´ Ø³Ø§Ø¹Øª Ø¨Ø§Ø´Ø¯.',
        });
      }
    }

    if (
      dto.minutesWorked ===
        undefined &&
      calculatedMinutes ===
        null
    ) {
      throw new BadRequestException({
        code:
          'WORK_DURATION_REQUIRED',
        message:
          'Ù…Ø¯Øª Ú©Ø§Ø± ÛŒØ§ Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ùˆ Ù¾Ø§ÛŒØ§Ù† Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.',
      });
    }

    if (
      dto.minutesWorked !==
        undefined &&
      calculatedMinutes !==
        null &&
      dto.minutesWorked !==
        calculatedMinutes
    ) {
      throw new BadRequestException({
        code:
          'WORK_DURATION_MISMATCH',
        message:
          'Ù…Ø¯Øª ÙˆØ§Ø±Ø¯Ø´Ø¯Ù‡ Ø¨Ø§ Ø³Ø§Ø¹Øª Ø´Ø±ÙˆØ¹ Ùˆ Ù¾Ø§ÛŒØ§Ù† Ù…Ø·Ø§Ø¨Ù‚Øª Ù†Ø¯Ø§Ø±Ø¯.',
      });
    }

    return {
      startedAt,
      endedAt,
      minutesWorked:
        dto.minutesWorked ??
        calculatedMinutes!,
    };
  }

  private ensureEmployee(
    employee: {
      isActive: boolean;
      role: UserRole;
      compensationType:
        CompensationType;
      defaultMonthlySalary:
        {
          toString(): string;
        } | null;
    } | null,
  ) {
    if (
      !employee ||
      !employee.isActive ||
      employee.role !== UserRole.SUPERVISOR && employee.role !== UserRole.ASSISTANT ||
      employee.compensationType !==
        CompensationType.FIXED_MONTHLY
    ) {
      throw new BadRequestException({
        code:
          'FIXED_SALARY_EMPLOYEE_REQUIRED',
        message:
          'Ø§ÛŒÙ† Ø­Ø³Ø§Ø¨ Ø§Ù…Ú©Ø§Ù† Ø«Ø¨Øª Ø³Ø§Ø¹Øª Ú©Ø§Ø±ÛŒ Ø­Ù‚ÙˆÙ‚ Ø«Ø§Ø¨Øª Ø±Ø§ Ù†Ø¯Ø§Ø±Ø¯.',
      });
    }

    if (
      !employee.defaultMonthlySalary
    ) {
      throw new BadRequestException({
        code:
          'MONTHLY_SALARY_NOT_CONFIGURED',
        message:
          'Ø­Ù‚ÙˆÙ‚ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ú©Ø§Ø±Ø¨Ø± ØªÙ†Ø¸ÛŒÙ… Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.',
      });
    }
  }

  private ensureReviewer(
    reviewerId: string,
    reviewerRole: UserRole,
    employee: {
      id: string;
      role: UserRole;
    },
  ) {
    if (
      reviewerId ===
      employee.id
    ) {
      throw new ForbiddenException({
        code:
          'SELF_REVIEW_NOT_ALLOWED',
        message:
          'ØªØ£ÛŒÛŒØ¯ Ø³Ø§Ø¹Øª Ú©Ø§Ø±ÛŒ Ø®ÙˆØ¯ØªØ§Ù† Ù…Ø¬Ø§Ø² Ù†ÛŒØ³Øª.',
      });
    }

    if (
      reviewerRole ===
      UserRole.MANAGER
    ) {
      if ( (employee.role === UserRole.SUPERVISOR || employee.role === UserRole.ASSISTANT)
      ) {
        return;
      }
    }

    if (
      reviewerRole ===
        UserRole.SUPERVISOR &&
      employee.role ===
        UserRole.ASSISTANT
    ) {
      return;
    }

    throw new ForbiddenException({
      code:
        'TIME_ENTRY_REVIEW_FORBIDDEN',
      message:
        'Ø§Ø¬Ø§Ø²Ù‡ Ø¨Ø±Ø±Ø³ÛŒ Ø§ÛŒÙ† Ø³Ø§Ø¹Øª Ú©Ø§Ø±ÛŒ Ø±Ø§ Ù†Ø¯Ø§Ø±ÛŒØ¯.',
    });
  }

  private async ensureSalarySnapshot(
    tx: any,
    employeeId: string,
    workDate: Date,
  ) {
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

    const employee =
      await tx.user.findUnique({
        where: {
          id:
            employeeId,
        },
      });

    this.ensureEmployee(
      employee,
    );

    const year =
      workDate.getUTCFullYear();

    const month =
      workDate.getUTCMonth() +
      1;

    const existing =
      await tx.monthlySalary.findUnique({
        where: {
          userId_year_month: {
            userId:
              employeeId,
            year,
            month,
          },
        },
      });

    if (existing) {
      return existing;
    }

    const created =
      await tx.monthlySalary.create({
        data: {
          userId:
            employeeId,
          year,
          month,
          amount:
            employee!
              .defaultMonthlySalary!,
        },
      });

    await tx.auditLog.create({
      data: {
        actorId:
          null,
        action:
          'MONTHLY_SALARY_SNAPSHOT_CREATED',
        entityType:
          'MonthlySalary',
        entityId:
          created.id,
        afterData: {
          userId:
            employeeId,
          year,
          month,
          amount:
            created.amount.toString(),
        },
      },
    });

    return created;
  }

  async create(
    employeeId: string,
    dto: CreateTimeEntryDto,
  ) {
    const workDate =
      this.parseWorkDate(
        dto.workDate,
      );

    const time =
      this.resolveTime(
        dto,
      );

    return this.prisma.$transaction(
      async (tx) => {
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

        const employee =
          await tx.user.findUnique({
            where: {
              id:
                employeeId,
            },
          });

        this.ensureEmployee(
          employee,
        );

        const duplicate =
          await tx.timeEntry.findFirst({
            where: {
              employeeId,
              workDate,
              status: {
                in: [
                  ApprovalStatus.PENDING,
                  ApprovalStatus.APPROVED,
                ],
              },
            },
          });

        if (duplicate) {
          throw new ConflictException({
            code:
              'TIME_ENTRY_ALREADY_EXISTS',
            message:
              'Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ø±ÙˆØ² Ù‚Ø¨Ù„Ø§Ù‹ Ø³Ø§Ø¹Øª Ú©Ø§Ø±ÛŒ Ø«Ø¨Øª Ø´Ø¯Ù‡ Ø§Ø³Øª.',
          });
        }

        const entry =
          await tx.timeEntry.create({
            data: {
              employeeId,
              workDate,
              startedAt:
                time.startedAt,
              endedAt:
                time.endedAt,
              minutesWorked:
                time.minutesWorked,
              note:
                dto.note?.trim() ||
                null,
              status:
                ApprovalStatus.PENDING,
            },
          });

        await tx.auditLog.create({
          data: {
            actorId:
              employeeId,
            action:
              'TIME_ENTRY_CREATED',
            entityType:
              'TimeEntry',
            entityId:
              entry.id,
            afterData: {
              workDate:
                entry.workDate
                  .toISOString()
                  .slice(0, 10),
              startedAt:
                entry.startedAt
                  ?.toISOString() ??
                null,
              endedAt:
                entry.endedAt
                  ?.toISOString() ??
                null,
              minutesWorked:
                entry.minutesWorked,
              status:
                entry.status,
            },
          },
        });

        return {
          id:
            entry.id,
          workDate:
            entry.workDate
              .toISOString()
              .slice(0, 10),
          startedAt:
            entry.startedAt
              ?.toISOString() ??
            null,
          endedAt:
            entry.endedAt
              ?.toISOString() ??
            null,
          minutesWorked:
            entry.minutesWorked,
          note:
            entry.note,
          status:
            entry.status,
          createdAt:
            entry.createdAt
              .toISOString(),
        };
      },
    );
  }

  async mine(
    employeeId: string,
  ) {
    const employee =
      await this.prisma.user.findUnique({
        where: {
          id:
            employeeId,
        },
      });

    this.ensureEmployee(
      employee,
    );

    const entries =
      await this.prisma.timeEntry.findMany({
        where: {
          employeeId,
        },
        orderBy: [
          {
            workDate:
              'desc',
          },
          {
            createdAt:
              'desc',
          },
        ],
      });

    const snapshots =
      await this.prisma.monthlySalary.findMany({
        where: {
          userId:
            employeeId,
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

    return {
      entries:
        entries.map(
          (entry) => ({
            id:
              entry.id,
            workDate:
              entry.workDate
                .toISOString()
                .slice(0, 10),
            startedAt:
              entry.startedAt
                ?.toISOString() ??
              null,
            endedAt:
              entry.endedAt
                ?.toISOString() ??
              null,
            minutesWorked:
              entry.minutesWorked,
            note:
              entry.note,
            status:
              entry.status,
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
      monthlySalaries:
        snapshots.map(
          (salary) => ({
            id:
              salary.id,
            year:
              salary.year,
            month:
              salary.month,
            amount:
              salary.amount
                .toString(),
            note:
              salary.note,
          }),
        ),
      currentDefaultMonthlySalary:
        employee!
          .defaultMonthlySalary!
          .toString(),
    };
  }

  async pending(
    reviewerId: string,
    reviewerRole: UserRole,
  ) {
    if (
      reviewerRole !== UserRole.MANAGER && reviewerRole !== UserRole.SUPERVISOR
    ) {
      throw new ForbiddenException();
    }

    const roles =
      reviewerRole ===
      UserRole.MANAGER
        ? [
            UserRole.SUPERVISOR,
            UserRole.ASSISTANT,
          ]
        : [
            UserRole.ASSISTANT,
          ];

    const entries =
      await this.prisma.timeEntry.findMany({
        where: {
          status:
            ApprovalStatus.PENDING,
          employee: {
            role: {
              in:
                roles,
            },
          },
        },
        include: {
          employee: {
            select: {
              id:
                true,
              fullName:
                true,
              role:
                true,
              defaultMonthlySalary:
                true,
            },
          },
        },
        orderBy: [
          {
            workDate:
              'asc',
          },
          {
            createdAt:
              'asc',
          },
        ],
      });

    return {
      items:
        entries
          .filter(
            (entry) =>
              entry.employeeId !==
              reviewerId,
          )
          .map(
            (entry) => {
              const base = {
                id:
                  entry.id,
                employee: {
                  id:
                    entry.employee.id,
                  fullName:
                    entry.employee
                      .fullName,
                  role:
                    entry.employee.role,
                },
                workDate:
                  entry.workDate
                    .toISOString()
                    .slice(0, 10),
                startedAt:
                  entry.startedAt
                    ?.toISOString() ??
                  null,
                endedAt:
                  entry.endedAt
                    ?.toISOString() ??
                  null,
                minutesWorked:
                  entry.minutesWorked,
                note:
                  entry.note,
                status:
                  entry.status,
                createdAt:
                  entry.createdAt
                    .toISOString(),
              };

              if (
                reviewerRole ===
                UserRole.MANAGER
              ) {
                return {
                  ...base,
                  defaultMonthlySalary:
                    entry.employee
                      .defaultMonthlySalary
                      ?.toString() ??
                    null,
                };
              }

              return base;
            },
          ),
    };
  }

  private async review(
    reviewerId: string,
    reviewerRole: UserRole,
    id: string,
    status: ApprovalStatus,
    dto: ReviewTimeEntryDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const locked =
          await tx.$queryRaw<
            Array<{
              id: string;
            }>
          >`
            SELECT "id"
            FROM "TimeEntry"
            WHERE "id" = ${id}
            FOR UPDATE
          `;

        if (
          locked.length !== 1
        ) {
          throw new NotFoundException({
            code:
              'TIME_ENTRY_NOT_FOUND',
            message:
              'Ø«Ø¨Øª Ø³Ø§Ø¹Øª Ú©Ø§Ø±ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.',
          });
        }

        const entry =
          await tx.timeEntry.findUnique({
            where: {
              id,
            },
            include: {
              employee:
                true,
            },
          });

        if (!entry) {
          throw new NotFoundException({
            code:
              'TIME_ENTRY_NOT_FOUND',
            message:
              'Ø«Ø¨Øª Ø³Ø§Ø¹Øª Ú©Ø§Ø±ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.',
          });
        }

        this.ensureReviewer(
          reviewerId,
          reviewerRole,
          entry.employee,
        );

        if (
          entry.status !==
          ApprovalStatus.PENDING
        ) {
          throw new ConflictException({
            code:
              'TIME_ENTRY_ALREADY_REVIEWED',
            message:
              'Ø§ÛŒÙ† Ø³Ø§Ø¹Øª Ú©Ø§Ø±ÛŒ Ù‚Ø¨Ù„Ø§Ù‹ Ø¨Ø±Ø±Ø³ÛŒ Ø´Ø¯Ù‡ Ø§Ø³Øª.',
          });
        }

        let salary:
          {
            amount: {
              toString(): string;
            };
            year: number;
            month: number;
          } | null =
            null;

        if (
          status ===
          ApprovalStatus.APPROVED
        ) {
          salary =
            await this.ensureSalarySnapshot(
              tx,
              entry.employeeId,
              entry.workDate,
            );
        }

        const updated =
          await tx.timeEntry.update({
            where: {
              id,
            },
            data: {
              status,
              reviewedById:
                reviewerId,
              reviewerNote:
                dto.reviewerNote
                  ?.trim() ||
                null,
              reviewedAt:
                new Date(),
            },
          });

        await tx.auditLog.create({
          data: {
            actorId:
              reviewerId,
            action:
              status ===
              ApprovalStatus.APPROVED
                ? 'TIME_ENTRY_APPROVED'
                : 'TIME_ENTRY_REJECTED',
            entityType:
              'TimeEntry',
            entityId:
              entry.id,
            beforeData: {
              status:
                entry.status,
            },
            afterData: {
              status,
              employeeId:
                entry.employeeId,
              workDate:
                entry.workDate
                  .toISOString()
                  .slice(0, 10),
              minutesWorked:
                entry.minutesWorked,
              reviewerNote:
                updated.reviewerNote,
            },
          },
        });

        const base = {
          id:
            updated.id,
          employee: {
            id:
              entry.employee.id,
            fullName:
              entry.employee.fullName,
            role:
              entry.employee.role,
          },
          workDate:
            entry.workDate
              .toISOString()
              .slice(0, 10),
          startedAt:
            entry.startedAt
              ?.toISOString() ??
            null,
          endedAt:
            entry.endedAt
              ?.toISOString() ??
            null,
          minutesWorked:
            entry.minutesWorked,
          note:
            entry.note,
          status:
            updated.status,
          reviewerNote:
            updated.reviewerNote,
          reviewedAt:
            updated.reviewedAt
              ?.toISOString() ??
            null,
        };

        if (
          reviewerRole ===
          UserRole.MANAGER
        ) {
          return {
            ...base,
            monthlySalary:
              salary
                ? {
                    year:
                      salary.year,
                    month:
                      salary.month,
                    amount:
                      salary.amount
                        .toString(),
                  }
                : null,
          };
        }

        return base;
      },
    );
  }

  approve(
    reviewerId: string,
    reviewerRole: UserRole,
    id: string,
    dto: ReviewTimeEntryDto,
  ) {
    return this.review(
      reviewerId,
      reviewerRole,
      id,
      ApprovalStatus.APPROVED,
      dto,
    );
  }

  reject(
    reviewerId: string,
    reviewerRole: UserRole,
    id: string,
    dto: ReviewTimeEntryDto,
  ) {
    return this.review(
      reviewerId,
      reviewerRole,
      id,
      ApprovalStatus.REJECTED,
      dto,
    );
  }
}