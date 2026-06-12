import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const employmentTypes = ['fulltime', 'parttime', 'intern', 'contract'] as const;
const jobSortOptions = ['newest', 'salary_asc', 'salary_desc'] as const;

function trimOptional(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class PublicJobsQueryDto {
  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  keyword?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsIn(employmentTypes)
  employmentType?: (typeof employmentTypes)[number];

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  category?: string;

  @Transform(({ value }) => trimOptional(value))
  @IsOptional()
  @IsString()
  companyIndustry?: string;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
    }

    return value;
  })
  @IsOptional()
  @IsBoolean()
  remoteOnly?: boolean;

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

  @IsOptional()
  @IsIn(jobSortOptions)
  sort: (typeof jobSortOptions)[number] = 'newest';

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
