export type PasswordResetTokenRecord = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  identityId: string;
  tokenHash: string;
  usedAt?: Date;
};

export type CreatePasswordResetTokenInput = {
  expiresAt: Date;
  id: string;
  identityId: string;
  tokenHash: string;
};

export interface PasswordResetTokenRepository {
  create(input: CreatePasswordResetTokenInput): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  invalidateActiveForIdentity(identityId: string, usedAt: Date): Promise<number>;
  markUsed(tokenId: string, usedAt: Date): Promise<void>;
}
