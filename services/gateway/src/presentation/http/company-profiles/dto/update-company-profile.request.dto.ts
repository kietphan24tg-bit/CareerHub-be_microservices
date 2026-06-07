import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf
} from 'class-validator';

function trimOptional(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function validateWhenPresent(_object: unknown, value: unknown) {
  return value !== undefined;
}

function validateWhenNonEmpty(_object: unknown, value: unknown) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

export class UpdateCompanyProfileRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @ValidateIf(validateWhenPresent)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  companyName?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @ValidateIf(validateWhenNonEmpty)
  @IsString()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  website?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  industry?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companySize?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1800)
  @Max(2100)
  foundedYear?: number | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  description?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxCode?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string | null;
}
