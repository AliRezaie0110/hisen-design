import {
  IsInt,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkBatchSizeDto {
  @IsString()
  @MaxLength(50)
  label!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
