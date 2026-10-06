import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEmployeePaymentDto {
  @IsString()
  @Matches(/^[1-9]\d{0,17}$/)
  amount!: string;

  @IsOptional()
  @IsIn([
    'CARD_TO_CARD',
    'BANK_TRANSFER',
    'CASH',
    'OTHER',
  ])
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}