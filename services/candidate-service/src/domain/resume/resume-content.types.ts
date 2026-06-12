export type ResumeAwardContent = {
  awardDate?: string | null;
  description?: string | null;
  id: string;
  organization?: string | null;
  title: string;
};

export type ResumeCertificationContent = {
  credentialUrl?: string | null;
  expireDate?: string | null;
  id: string;
  issueDate?: string | null;
  issuer?: string | null;
  name: string;
};

export type ResumeEducationContent = {
  degree?: string | null;
  description?: string | null;
  endDate?: string | null;
  gpa?: string | null;
  id: string;
  major?: string | null;
  schoolName: string;
  sortOrder?: number | null;
  startDate?: string | null;
};

export type ResumeExperienceContent = {
  achievements?: string | null;
  companyName: string;
  description?: string | null;
  employmentType?: string | null;
  endDate?: string | null;
  id: string;
  isCurrent: boolean;
  location?: string | null;
  position: string;
  sortOrder?: number | null;
  startDate?: string | null;
  techStack?: string | null;
};

export type ResumeProjectContent = {
  demoUrl?: string | null;
  description?: string | null;
  endDate?: string | null;
  githubUrl?: string | null;
  id: string;
  projectName: string;
  responsibilities?: string | null;
  role?: string | null;
  sortOrder?: number | null;
  startDate?: string | null;
  techStack?: string | null;
};

export type ResumeSkillContent = {
  category?: string | null;
  id: string;
  level?: string | null;
  name: string;
  sortOrder?: number | null;
};

export type ResumeContent = {
  address?: string | null;
  avatarUrl?: string | null;
  awards: ResumeAwardContent[];
  certifications: ResumeCertificationContent[];
  educations: ResumeEducationContent[];
  email?: string | null;
  experiences: ResumeExperienceContent[];
  fullName?: string | null;
  githubUrl?: string | null;
  headline?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  portfolioUrl?: string | null;
  projects: ResumeProjectContent[];
  skills: ResumeSkillContent[];
  summary?: string | null;
};

export function createEmptyResumeContent(): ResumeContent {
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
