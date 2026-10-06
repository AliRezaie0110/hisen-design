import {
  Module,
} from '@nestjs/common';

import {
  OwnerAccountsController,
} from './owner-accounts.controller';
import {
  OwnerAccountsService,
} from './owner-accounts.service';

@Module({
  controllers: [
    OwnerAccountsController,
  ],
  providers: [
    OwnerAccountsService,
  ],
})
export class OwnerAccountsModule {}