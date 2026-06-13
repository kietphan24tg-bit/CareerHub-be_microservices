import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from 'class-validator';

function trimOptional(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

class InterviewerRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  name!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  role?: string | null;
}

export class CreateInterviewRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  type!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsString()
  round!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsString()
  date!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsString()
  startTime!: string;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes!: number;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  timezone?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  notesToCandidate?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  logisticsNote?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewerRequestDto)
  interviewers?: InterviewerRequestDto[];

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  platform?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  meetingLink?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  meetingId?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  passcode?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  officeName?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  fullAddress?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  locationDetail?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLat?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLng?: number | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  mapLink?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  callerInfo?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  contactInfo?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;
}

export class UpdateInterviewRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  type?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  round?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  date?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  timezone?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  notesToCandidate?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  logisticsNote?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InterviewerRequestDto)
  interviewers?: InterviewerRequestDto[];

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  platform?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  meetingLink?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  meetingId?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  passcode?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  officeName?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  fullAddress?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  locationDetail?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLat?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLng?: number | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  mapLink?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  callerInfo?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  contactInfo?: string | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;
}

export class CancelInterviewRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  reason!: string;
}

export class CandidateInterviewResponseRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  candidateResponseNote?: string | null;
}

export class CandidateRescheduleRequestDto extends CandidateInterviewResponseRequestDto {
  @Transform(({ value }) => trimOptional(value))
  @IsString()
  proposedDate!: string;

  @Transform(({ value }) => trimOptional(value))
  @IsString()
  proposedStartTime!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  proposedDurationMinutes?: number | null;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  proposedTimezone?: string | null;
}
