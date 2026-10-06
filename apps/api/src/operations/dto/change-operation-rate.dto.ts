import {
  IsString,
  Matches,
} from 'class-validator';

export class ChangeOperationRateDto {
  @IsString()
  @Matches(/^[1-9]\d{0,17}$/)
  amount!: string;
}