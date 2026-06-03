export type RegisterIdentityCommand = {
  acceptedTerms: boolean;
  email: string;
  password: string;
  requestId?: string;
  role: string;
};
