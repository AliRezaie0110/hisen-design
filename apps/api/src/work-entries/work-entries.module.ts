import {
  Module,
} from '@nestjs/common';

import {
  SmsService,
} from '../auth/sms.service';
import {
  WorkEntriesController,
} from './work-entries.controller';
import {
  WorkEntriesService,
} from './work-entries.service';

@Module({
  controllers: [
    WorkEntriesController,
  ],
  providers: [
    WorkEntriesService,
    SmsService,
  ],
})
export class WorkEntriesModule {}