import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength
} from 'class-validator';

const employmentTypes = ['fulltime', 'parttime', 'intern', 'contract'] as const;
const jobLevels = ['intern', 'fresher', 'junior', 'mid', 'senior', 'lead'] as const;

function trimOptional(value: unknown) {
  if (value === null) {
    return null;
  }

  return typeof value === 'string' ? value.trim() : value;
}

function trimArray(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => typeof item !== 'string' || item.length > 0);
}

export class UpdateJobRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  description?: string | null;

  @Transform(({ value }) => trimArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @Transform(({ value }) => trimArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @Transform(({ value }) => trimArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsIn(employmentTypes)
  employmentType?: (typeof employmentTypes)[number] | null;

  @IsOptional()
  @IsIn(jobLevels)
  level?: (typeof jobLevels)[number] | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  category?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  city?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  country?: string | null;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @Transform(({ value }) => (value === null ? null : value))
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number | null;

  @Transform(({ value }) => (value === null ? null : value))
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string | null;

  @Transform(({ value }) => (value === null ? null : value))
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
