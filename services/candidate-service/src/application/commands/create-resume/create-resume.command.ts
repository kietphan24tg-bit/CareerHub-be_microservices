import type { ResumeContent } from '../../../domain/resume/resume-content.types';

export type CreateResumeCommand = {
  content: ResumeContent;
  identityId: string;
  templateId: string;
  title: string;
};
