import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkEntryDto {
  @IsString()
  batchOperationId!: string;

  @IsString()
  workBatchSizeId!: string;

  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  workerNote?: string;
}
