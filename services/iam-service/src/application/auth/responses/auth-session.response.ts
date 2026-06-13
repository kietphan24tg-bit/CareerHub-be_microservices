export type AuthSessionResponse = {
  accessToken: string;
  email: string;
  identityId: string;
  rememberMe: boolean;
  refreshToken: string;
  role: string;
};
