import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReviewWorkEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewerNote?: string;
}