import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}