import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateBatchOperationDto {
  @IsString()
  operationId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetQuantity?: number;

  @IsString()
  @Matches(/^[1-9]\d{0,17}$/)
  unitRate!: string;
}
