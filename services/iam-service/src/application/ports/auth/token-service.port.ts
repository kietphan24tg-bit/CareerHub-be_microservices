export type AuthenticatedIdentity = {
  email: string;
  id: string;
  role: string;
};

export interface TokenService {
  createRefreshToken(): string;
  getAccessTokenExpiresInMs(): number;
  getRefreshTokenExpiresInMs(): number;
  hashRefreshToken(token: string): string;
  issueAccessToken(identity: AuthenticatedIdentity): string;
  verifyAccessToken(token: string): AuthenticatedIdentity;
}
