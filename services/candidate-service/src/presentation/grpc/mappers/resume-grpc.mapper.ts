import type {
  ResumeMessage,
  ResumeTemplateDetail,
  ResumeTemplateListItem
} from '@careerhub/contracts';
import type { ResumeContent } from '../../../domain/resume/resume-content.types';
import type { ResumeResponseShape } from '../../../application/mappers/resume-response.mapper';
import type { ResumeTemplateListItemRecord, ResumeTemplateRecord } from '../../../application';

export function toGrpcResumeMessage(resume: ResumeResponseShape): ResumeMessage {
  return {
    content_json: JSON.stringify({
      address: resume.address ?? null,
      avatarUrl: resume.avatarUrl ?? null,
      awards: resume.awards,
      certifications: resume.certifications,
      educations: resume.educations,
      email: resume.email ?? null,
      experiences: resume.experiences,
      fullName: resume.fullName ?? null,
      githubUrl: resume.githubUrl ?? null,
      headline: resume.headline ?? null,
      linkedinUrl: resume.linkedinUrl ?? null,
      phone: resume.phone ?? null,
      portfolioUrl: resume.portfolioUrl ?? null,
      projects: resume.projects,
      skills: resume.skills,
      summary: resume.summary ?? null
    }),
    id: resume.id,
    identity_id: resume.identityId,
    is_using: resume.isUsing,
    template_id: resume.templateId ?? '',
    title: resume.title,
    updated_at: resume.updatedAt
  };
}

export function fromGrpcResumeContent(contentJson: string): ResumeContent {
  try {
    return JSON.parse(contentJson) as ResumeContent;
  } catch {
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
}

export function toGrpcResumeTemplateListItem(
  template: ResumeTemplateListItemRecord
): ResumeTemplateListItem {
  return {
    category: template.category ?? '',
    id: template.id,
    name: template.name,
    thumbnail: template.thumbnail ?? ''
  };
}

export function toGrpcResumeTemplateDetail(
  template: ResumeTemplateRecord
): ResumeTemplateDetail {
  return {
    category: template.category ?? '',
    id: template.id,
    layout_data_json: JSON.stringify(template.layoutData),
    name: template.name,
    thumbnail: template.thumbnail ?? ''
  };
}
