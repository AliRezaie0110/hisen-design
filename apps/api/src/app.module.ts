import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { resolve } from 'node:path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RolesGuard } from './auth/guards/roles.guard';
import { SessionAuthGuard } from './auth/guards/session-auth.guard';
import { BatchesModule } from './batches/batches.module';
import { WorkEntriesModule } from './work-entries/work-entries.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { EmployeeAccountsModule } from './employee-accounts/employee-accounts.module';
import { OwnerAccountsModule } from './owner-accounts/owner-accounts.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
import { OperationsModule } from './operations/operations.module';
import { OwnersModule } from './owners/owners.module';
import { PersonnelModule } from './personnel/personnel.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(
          process.cwd(),
          '.env',
        ),
        resolve(
          process.cwd(),
          'apps/api/.env',
        ),
      ],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    PersonnelModule,
    OperationsModule,
    OwnersModule,
    BatchesModule,
    WorkEntriesModule,
    TimeEntriesModule,
    EmployeeAccountsModule,
    OwnerAccountsModule,
    ReportsModule,
    ProfileModule,
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass:
        SessionAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass:
        RolesGuard,
    },
  ],
})
export class AppModule {}