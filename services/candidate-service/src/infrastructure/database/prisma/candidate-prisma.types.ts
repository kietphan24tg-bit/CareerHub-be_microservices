import type { PrismaClientLike } from '@careerhub/nest-common';

export type CandidateProfilePersistenceRecord = {
  createdAt: Date;
  fullName: string;
  id: string;
  identityId: string;
  phone: string;
  updatedAt: Date;
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
};

export type CandidatePrismaClient = PrismaClientLike & {
  candidateProfile: CandidateProfileModelDelegate;
};
