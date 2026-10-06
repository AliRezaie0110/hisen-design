import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReviewTimeEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewerNote?: string;
}