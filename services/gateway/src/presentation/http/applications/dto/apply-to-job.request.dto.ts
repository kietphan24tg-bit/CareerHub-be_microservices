import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function trimOptional(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class ApplyToJobRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MinLength(1)
  resumeId!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;
}
