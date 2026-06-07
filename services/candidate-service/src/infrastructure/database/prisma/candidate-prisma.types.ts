import type { PrismaClientLike } from '@careerhub/infrastructure';

export type CandidateProfilePersistenceRecord = {
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

export type CandidateProfileCreateInput = {
  fullName: string;
  id: string;
  identityId: string;
  phone: string;
};

export type CandidateProfileModelDelegate = {
  create(args: {
    data: CandidateProfileCreateInput;
  }): Promise<CandidateProfilePersistenceRecord>;
  findUnique(args: {
    where: { identityId: string };
  }): Promise<CandidateProfilePersistenceRecord | null>;
  update(args: {
    data: Partial<CandidateProfilePersistenceRecord>;
    where: { id: string };
  }): Promise<CandidateProfilePersistenceRecord>;
};

export type CandidatePrismaClient = PrismaClientLike & {
  candidateProfile: CandidateProfileModelDelegate;
};
