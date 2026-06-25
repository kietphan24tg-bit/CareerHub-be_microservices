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
const saturdayPolicies = ['unspecified', 'works_saturday', 'off_saturday'] as const;
const experienceLevels = [
  'unspecified',
  'none',
  'under_1',
  'y1',
  'y2',
  'y3',
  'y4',
  'y5',
  'over_5'
] as const;

function trimOptional(value: unknown) {
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

export class CreateJobRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  description?: string;

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
  employmentType?: (typeof employmentTypes)[number];

  @IsOptional()
  @IsIn(jobLevels)
  level?: (typeof jobLevels)[number];

  @IsOptional()
  @IsIn(saturdayPolicies)
  saturdayPolicy?: (typeof saturdayPolicies)[number];

  @IsOptional()
  @IsIn(experienceLevels)
  experienceLevel?: (typeof experienceLevels)[number];

  @IsOptional()
  @IsString()
  departmentId?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  category?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  city?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
