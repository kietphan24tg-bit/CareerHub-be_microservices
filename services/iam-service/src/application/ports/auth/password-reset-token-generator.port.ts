export type PasswordResetTokenParts = {
  expiresAt: string;
  identityId: string;
  tokenId: string;
};

export type PasswordResetTokenGenerator = {
  createToken(parts: PasswordResetTokenParts): string;
};
