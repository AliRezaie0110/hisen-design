import {
  IsEnum,
} from 'class-validator';

import {
  BatchStatus,
} from '../../generated/prisma/enums';

export class ChangeBatchStatusDto {
  @IsEnum(BatchStatus)
  status!: BatchStatus;
}