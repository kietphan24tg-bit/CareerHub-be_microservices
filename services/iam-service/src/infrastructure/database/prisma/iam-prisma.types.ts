import type { PrismaClientLike } from '@careerhub/nest-common';

export type IdentityPersistenceRole = 'candidate' | 'employer';
export type IdentityPersistenceStatus = 'active' | 'disabled' | 'pending_profile';

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

export type AuthSessionPersistenceRecord = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  identityId: string;
  rememberMe: boolean;
  revokedAt: Date | null;
  tokenHash: string;
  updatedAt: Date;
};

export type PrismaAuthSessionCreateInput = {
  expiresAt: Date;
  id: string;
  identityId: string;
  rememberMe: boolean;
  tokenHash: string;
};

export type IdentityModelDelegate = {
  create(args: { data: PrismaIdentityCreateInput }): Promise<IdentityPersistenceRecord>;
  findUnique(args: {
    where: { email?: string; id?: string };
  }): Promise<IdentityPersistenceRecord | null>;
  update(args: {
    data: Partial<
      Pick<
        IdentityPersistenceRecord,
        'acceptedTerms' | 'email' | 'passwordHash' | 'role' | 'status' | 'updatedAt'
      >
    >;
    where: { id: string };
  }): Promise<IdentityPersistenceRecord>;
};

export type AuthSessionModelDelegate = {
  create(args: { data: PrismaAuthSessionCreateInput }): Promise<AuthSessionPersistenceRecord>;
  findUnique(args: {
    where: { tokenHash: string };
  }): Promise<AuthSessionPersistenceRecord | null>;
  update(args: {
    data: Partial<Pick<AuthSessionPersistenceRecord, 'expiresAt' | 'revokedAt' | 'tokenHash'>>;
    where: { id: string };
  }): Promise<AuthSessionPersistenceRecord>;
};

export type IamPrismaClient = PrismaClientLike & {
  authSession: AuthSessionModelDelegate;
  identity: IdentityModelDelegate;
};
