export type PasswordResetTokenRecord = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  identityId: string;
  mailProcessingAt?: Date;
  mailSentAt?: Date;
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
  claimMailDelivery(
    tokenId: string,
    processingAt: Date,
    staleProcessingCutoff: Date
  ): Promise<boolean>;
  clearMailDeliveryClaim(tokenId: string): Promise<void>;
  create(input: CreatePasswordResetTokenInput): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>;
  invalidateActiveForIdentity(identityId: string, usedAt: Date): Promise<number>;
  markMailSent(tokenId: string, sentAt: Date): Promise<void>;
  markUsed(tokenId: string, usedAt: Date): Promise<void>;
}
