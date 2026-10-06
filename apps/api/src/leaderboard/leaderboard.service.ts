import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function getPersianParts(date: Date) {
  const parts = new Intl.DateTimeFormat(
    'en-US-u-ca-persian',
    {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    },
  ).formatToParts(date);

  const value = (type: string) =>
    Number(
      parts.find((part) => part.type === type)?.value,
    );

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
  };
}

function findPersianMonthStart(
  year: number,
  month: number,
) {
  const approximateYear =
    2020 + (year - 1399);

  const approximate = Date.UTC(
    approximateYear,
    2,
    21,
  );

  for (
    let offset = -5;
    offset <= 370;
    offset += 1
  ) {
    const date = new Date(
      approximate +
        offset * 86400000,
    );

    const parts =
      getPersianParts(date);

    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === 1
    ) {
      return date;
    }
  }

  throw new Error(
    `Persian date not found: ${year}/${month}/1`,
  );
}

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async monthly(
    month: number,
    year: number,
  ) {
    const start =
      findPersianMonthStart(
        year,
        month,
      );

    const nextMonth =
      month === 12
        ? findPersianMonthStart(
            year + 1,
            1,
          )
        : findPersianMonthStart(
            year,
            month + 1,
          );

    const workers =
      await this.prisma.user.findMany({
        where: {
          role: 'WORKER',
        },
        select: {
          id: true,
          fullName: true,
          profilePhotoFileName: true,
        },
      });

    const entries =
      await this.prisma.workEntry.groupBy({
        by: ['workerId'],
        where: {
          status: 'APPROVED',
          reviewedAt: {
            gte: start,
            lt: nextMonth,
          },
        },
        _count: {
          _all: true,
        },
      });

    const countMap = new Map(
      entries.map((entry) => [
        entry.workerId,
        entry._count._all,
      ]),
    );

    return workers
      .map((worker) => ({
        workerId: worker.id,
        name:
          worker.fullName ||
          'بدون نام',
        approvedWorks:
          countMap.get(worker.id) ?? 0,
        photoUrl:
          worker.profilePhotoFileName
            ? `/profile/photo/${worker.id}`
            : null,
      }))
      .sort(
        (a, b) =>
          b.approvedWorks -
            a.approvedWorks ||
          a.name.localeCompare(
            b.name,
            'fa',
          ),
      )
      .map((worker, index) => ({
        rank: index + 1,
        ...worker,
      }));
  }
}
