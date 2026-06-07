import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf
} from 'class-validator';

function trimOptional(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateCandidateProfileRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  avatarUrl?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  githubUrl?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  linkedinUrl?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  portfolioUrl?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  yearsExperience?: number | null;
}
