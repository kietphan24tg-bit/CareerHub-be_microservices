import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const employerStatusTransitionTargets = [
  'reviewed',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected'
] as const;

export class UpdateApplicationStatusRequestDto {
  @IsIn(employerStatusTransitionTargets)
  status!: (typeof employerStatusTransitionTargets)[number];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string | null;
}
