import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  OwnerPricingType,
} from '../../generated/prisma/enums';
import {
  CreateBatchOperationDto,
} from './create-batch-operation.dto';
import {
  CreateWorkBatchSizeDto,
} from './create-work-batch-size.dto';

export class CreateWorkBatchDto {
  @IsString()
  @MaxLength(80)
  code!: string;

  @IsString()
  ownerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  modelName?: string;

  @IsInt()
  @Min(1)
  totalQuantity!: number;

  @IsEnum(OwnerPricingType)
  ownerPricingType!: OwnerPricingType;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,17}$/)
  ownerUnitPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,17}$/)
  ownerFixedAmount?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({
    each: true,
  })
  @Type(
    () =>
      CreateBatchOperationDto,
  )
  operations!:
    CreateBatchOperationDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({
    each: true,
  })
  @Type(
    () =>
      CreateWorkBatchSizeDto,
  )
  sizes!:
    CreateWorkBatchSizeDto[];
}
