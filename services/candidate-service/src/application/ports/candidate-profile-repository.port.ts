export type CandidateProfileRecord = {
  address: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  fullName: string;
  githubUrl: string | null;
  headline: string | null;
  id: string;
  identityId: string;
  linkedinUrl: string | null;
  phone: string | null;
  portfolioUrl: string | null;
  updatedAt: Date;
  yearsExperience: number | null;
};

export type CreateCandidateProfileRecord = {
  fullName: string;
  id: string;
  identityId: string;
  phone: string | null;
};

export type UpdateCandidateProfilePatch = {
  address?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  fullName?: string;
  githubUrl?: string | null;
  headline?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  portfolioUrl?: string | null;
  yearsExperience?: number | null;
};

export interface CandidateProfileRepository {
  existsByIdentityId(identityId: string): Promise<boolean>;
  findByIdentityId(identityId: string): Promise<CandidateProfileRecord | null>;
  save(profile: CreateCandidateProfileRecord): Promise<void>;
  updateByIdentityId(
    identityId: string,
    patch: UpdateCandidateProfilePatch
  ): Promise<CandidateProfileRecord | null>;
}
