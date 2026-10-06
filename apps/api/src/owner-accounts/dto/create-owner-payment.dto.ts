import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateOwnerPaymentDto {
  @IsString()
  @Matches(/^[1-9]\d{0,17}$/)
  amount!: string;

  @IsOptional()
  @IsString()
  workBatchId?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}