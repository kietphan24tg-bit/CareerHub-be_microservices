import type { ResumeAggregate } from '../../domain/resume/resume.aggregate';
import type { ResumeContent } from '../../domain/resume/resume-content.types';

export type ResumeResponseShape = {
  address?: string | null;
  avatarUrl?: string | null;
  awards: ResumeContent['awards'];
  certifications: ResumeContent['certifications'];
  educations: ResumeContent['educations'];
  email?: string | null;
  experiences: ResumeContent['experiences'];
  fullName?: string | null;
  githubUrl?: string | null;
  headline?: string | null;
  id: string;
  identityId: string;
  isUsing: boolean;
  linkedinUrl?: string | null;
  phone?: string | null;
  portfolioUrl?: string | null;
  projects: ResumeContent['projects'];
  skills: ResumeContent['skills'];
  summary?: string | null;
  templateId?: string | null;
  title: string;
  updatedAt: string;
};

export function mapResumeAggregateToResponse(
  resume: ResumeAggregate
): ResumeResponseShape {
  return {
    address: resume.content.address ?? null,
    avatarUrl: resume.content.avatarUrl ?? null,
    awards: resume.content.awards ?? [],
    certifications: resume.content.certifications ?? [],
    educations: resume.content.educations ?? [],
    email: resume.content.email ?? null,
    experiences: resume.content.experiences ?? [],
    fullName: resume.content.fullName ?? null,
    githubUrl: resume.content.githubUrl ?? null,
    headline: resume.content.headline ?? null,
    id: resume.id.toString(),
    identityId: resume.identityId,
    isUsing: resume.isUsing,
    linkedinUrl: resume.content.linkedinUrl ?? null,
    phone: resume.content.phone ?? null,
    portfolioUrl: resume.content.portfolioUrl ?? null,
    projects: resume.content.projects ?? [],
    skills: resume.content.skills ?? [],
    summary: resume.content.summary ?? null,
    templateId: resume.templateId,
    title: resume.title.value,
    updatedAt: (resume.updatedAt ?? resume.createdAt ?? new Date()).toISOString()
  };
}

export function parseResumeContent(value: unknown): ResumeContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      address: null,
      avatarUrl: null,
      awards: [],
      certifications: [],
      educations: [],
      email: null,
      experiences: [],
      fullName: null,
      githubUrl: null,
      headline: null,
      linkedinUrl: null,
      phone: null,
      portfolioUrl: null,
      projects: [],
      skills: [],
      summary: ''
    };
  }

  const parsed = value as Partial<ResumeContent>;

  return {
    address: parsed.address ?? null,
    avatarUrl: parsed.avatarUrl ?? null,
    awards: parsed.awards ?? [],
    certifications: parsed.certifications ?? [],
    educations: parsed.educations ?? [],
    email: parsed.email ?? null,
    experiences: parsed.experiences ?? [],
    fullName: parsed.fullName ?? null,
    githubUrl: parsed.githubUrl ?? null,
    headline: parsed.headline ?? null,
    linkedinUrl: parsed.linkedinUrl ?? null,
    phone: parsed.phone ?? null,
    portfolioUrl: parsed.portfolioUrl ?? null,
    projects: parsed.projects ?? [],
    skills: parsed.skills ?? [],
    summary: parsed.summary ?? null
  };
}
