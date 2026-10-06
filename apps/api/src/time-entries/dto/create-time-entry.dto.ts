import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTimeEntryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  workDate!: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  minutesWorked?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}