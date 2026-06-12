import type { ResumeContent } from '../../../domain/resume/resume-content.types';

export type UpdateResumeCommand = {
  content: ResumeContent;
  identityId: string;
  resumeId: string;
  title: string;
};
