export type UpdateCandidateProfileCommand = {
  address?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  fullName?: string;
  githubUrl?: string | null;
  headline?: string | null;
  identityId: string;
  linkedinUrl?: string | null;
  phone?: string | null;
  portfolioUrl?: string | null;
  requestId?: string;
  resumeId?: string | null;
  yearsExperience?: number | null;
};
