import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

class ResumeSkillWriteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsString()
  level?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number | null;
}

class ResumeExperienceWriteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  companyName!: string;

  @IsString()
  position!: string;

  @IsOptional()
  @IsString()
  employmentType?: string | null;

  @IsOptional()
  @IsString()
  startDate?: string | null;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsBoolean()
  isCurrent!: boolean;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  achievements?: string | null;

  @IsOptional()
  @IsString()
  techStack?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number | null;
}

class ResumeEducationWriteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  schoolName!: string;

  @IsOptional()
  @IsString()
  degree?: string | null;

  @IsOptional()
  @IsString()
  major?: string | null;

  @IsOptional()
  @IsString()
  startDate?: string | null;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  gpa?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number | null;
}

class ResumeProjectWriteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  projectName!: string;

  @IsOptional()
  @IsString()
  role?: string | null;

  @IsOptional()
  @IsString()
  startDate?: string | null;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  responsibilities?: string | null;

  @IsOptional()
  @IsString()
  techStack?: string | null;

  @IsOptional()
  @IsString()
  githubUrl?: string | null;

  @IsOptional()
  @IsString()
  demoUrl?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number | null;
}

class ResumeCertificationWriteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  issuer?: string | null;

  @IsOptional()
  @IsString()
  issueDate?: string | null;

  @IsOptional()
  @IsString()
  expireDate?: string | null;

  @IsOptional()
  @IsString()
  credentialUrl?: string | null;
}

class ResumeAwardWriteDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  organization?: string | null;

  @IsOptional()
  @IsString()
  awardDate?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateResumeRequestDto {
  @IsOptional()
  @IsString()
  fullName?: string | null;

  @IsOptional()
  @IsString()
  headline?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsString()
  linkedinUrl?: string | null;

  @IsOptional()
  @IsString()
  githubUrl?: string | null;

  @IsOptional()
  @IsString()
  portfolioUrl?: string | null;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeSkillWriteDto)
  skills!: ResumeSkillWriteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeExperienceWriteDto)
  experiences!: ResumeExperienceWriteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeEducationWriteDto)
  educations!: ResumeEducationWriteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeProjectWriteDto)
  projects!: ResumeProjectWriteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeCertificationWriteDto)
  certifications!: ResumeCertificationWriteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeAwardWriteDto)
  awards!: ResumeAwardWriteDto[];
}

export class CreateResumeRequestDto extends UpdateResumeRequestDto {
  @IsString()
  templateId!: string;
}
