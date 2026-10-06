import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import type {
  Response,
} from 'express';

import {
  Roles,
} from '../auth/decorators/roles.decorator';
import {
  UserRole,
} from '../generated/prisma/enums';
import {
  EmployeeReportQueryDto,
} from './dto/employee-report-query.dto';
import {
  OwnerReportQueryDto,
} from './dto/owner-report-query.dto';
import {
  WorkHistoryQueryDto,
} from './dto/work-history-query.dto';
import {
  ReportsService,
} from './reports.service';

@Controller('admin/reports')
@Roles(UserRole.MANAGER)
export class ReportsController {
  constructor(
    private readonly reports:
      ReportsService,
  ) {}

  @Get('employees')
  employees(
    @Query()
    query: EmployeeReportQueryDto,
  ) {
    return this.reports.employees(
      query,
    );
  }

  @Get('employees.xlsx')
  async employeesExcel(
    @Query()
    query: EmployeeReportQueryDto,
    @Res()
    response: Response,
  ): Promise<void> {
    const buffer =
      await this.reports.employeesExcel(
        query,
      );

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="bagheri-employees-report.xlsx"',
    );

    response.setHeader(
      'Content-Length',
      buffer.length,
    );

    response.end(
      buffer,
    );
  }

  @Get('work-history')
  workHistory(
    @Query()
    query: WorkHistoryQueryDto,
  ) {
    return this.reports.workHistory(
      query,
    );
  }

  @Get('work-history.xlsx')
  async workHistoryExcel(
    @Query()
    query: WorkHistoryQueryDto,
    @Res()
    response: Response,
  ): Promise<void> {
    const buffer =
      await this.reports.workHistoryExcel(
        query,
      );

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="bagheri-work-history.xlsx"',
    );

    response.setHeader(
      'Content-Length',
      buffer.length,
    );

    response.end(
      buffer,
    );
  }

  @Get('owners')
  owners(
    @Query()
    query: OwnerReportQueryDto,
  ) {
    return this.reports.owners(
      query,
    );
  }

  @Get('owners.xlsx')
  async ownersExcel(
    @Query()
    query: OwnerReportQueryDto,
    @Res()
    response: Response,
  ): Promise<void> {
    const buffer =
      await this.reports.ownersExcel(
        query,
      );

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="bagheri-owners-report.xlsx"',
    );

    response.setHeader(
      'Content-Length',
      buffer.length,
    );

    response.end(
      buffer,
    );
  }
}