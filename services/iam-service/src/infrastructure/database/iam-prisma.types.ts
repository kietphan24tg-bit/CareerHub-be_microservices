import type { PrismaClientLike } from '@careerhub/nest-common';

export type IdentityPersistenceRole = 'candidate' | 'employer';
export type IdentityPersistenceStatus = 'active' | 'disabled';

export type IdentityPersistenceRecord = {
  acceptedTerms: boolean;
  createdAt: Date;
  email: string;
  id: string;
  passwordHash: string;
  role: IdentityPersistenceRole;
  status: IdentityPersistenceStatus;
  updatedAt: Date;
};

export type PrismaIdentityCreateInput = IdentityPersistenceRecord;

export type IdentityModelDelegate = {
  create(args: { data: PrismaIdentityCreateInput }): Promise<IdentityPersistenceRecord>;
  findUnique(args: {
    select?: { id?: boolean };
    where: { email: string };
  }): Promise<Pick<IdentityPersistenceRecord, 'id'> | IdentityPersistenceRecord | null>;
};

export type IamPrismaClient = PrismaClientLike & {
  identity: IdentityModelDelegate;
};
