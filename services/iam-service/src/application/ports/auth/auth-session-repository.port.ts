export type AuthSessionRecord = {
  expiresAt: Date;
  id: string;
  identityId: string;
  rememberMe: boolean;
  revokedAt?: Date;
  tokenHash: string;
  updatedAt: Date;
};

export type CreateAuthSessionInput = {
  expiresAt: Date;
  id: string;
  identityId: string;
  rememberMe: boolean;
  tokenHash: string;
};

export interface AuthSessionRepository {
  create(input: CreateAuthSessionInput): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<AuthSessionRecord | null>;
  revoke(sessionId: string): Promise<void>;
  revokeByIdentityId(identityId: string, revokedAt: Date): Promise<number>;
  rotate(
    sessionId: string,
    input: Pick<CreateAuthSessionInput, 'expiresAt' | 'tokenHash'>
  ): Promise<void>;
}
