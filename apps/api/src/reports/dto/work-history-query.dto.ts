import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import {
  ApprovalStatus,
} from '../../generated/prisma/enums';

export class WorkHistoryQueryDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  workBatchId?: string;

  @IsOptional()
  @IsString()
  operationId?: string;

  @IsOptional()
  @IsString()
  workBatchSizeId?: string;

  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
