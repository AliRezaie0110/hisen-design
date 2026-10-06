import {
  Module,
} from '@nestjs/common';

import {
  AdminEmployeeAccountsController,
} from './admin-employee-accounts.controller';
import {
  EmployeeAccountController,
} from './employee-account.controller';
import {
  EmployeeAccountsService,
} from './employee-accounts.service';

@Module({
  controllers: [
    EmployeeAccountController,
    AdminEmployeeAccountsController,
  ],
  providers: [
    EmployeeAccountsService,
  ],
})
export class EmployeeAccountsModule {}