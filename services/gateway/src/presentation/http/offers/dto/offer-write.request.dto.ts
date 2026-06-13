import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function trimOptional(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class OfferBenefitInputRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  catalogId?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsString()
  type!: string;

  @ValidateIf((dto: OfferBenefitInputRequestDto) => dto.type === 'custom')
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  hasMonetaryValue?: boolean;

  @IsOptional()
  @IsNumber()
  amount?: number | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  frequency?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  annualLeaveDays?: number | null;
}

export class CreateOfferRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seniorityLabel?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  departmentTeam?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reportingTo?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  message?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  bonusDetails?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contractDocumentUrl?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  salaryPeriod?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  employmentType?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  workModel?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  startDate?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  offerExpiresAt?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  probationType?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  probationCustom?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferBenefitInputRequestDto)
  benefits?: OfferBenefitInputRequestDto[];
}

export class UpdateOfferRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seniorityLabel?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  departmentTeam?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reportingTo?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  message?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  bonusDetails?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contractDocumentUrl?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  salaryPeriod?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  employmentType?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  workModel?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  startDate?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  offerExpiresAt?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  probationType?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(255)
  probationCustom?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferBenefitInputRequestDto)
  benefits?: OfferBenefitInputRequestDto[];
}

export class CandidateOfferDecisionRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string | null;
}
