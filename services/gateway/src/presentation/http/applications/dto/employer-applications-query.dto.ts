import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const employerStatusValues = [
  'applied',
  'reviewed',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn'
] as const;

export class EmployerApplicationsQueryDto {
  @IsOptional()
  @IsIn(employerStatusValues)
  status?: (typeof employerStatusValues)[number];

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
