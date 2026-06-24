import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class EmployerInterviewsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', 'today', 'thisWeek'])
  dateFilter?: 'all' | 'today' | 'thisWeek';

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsIn([
    'all',
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'rescheduled',
    'no_show'
  ])
  status?: string;

  @IsOptional()
  @IsIn(['all', 'online', 'onsite', 'phone'])
  type?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}