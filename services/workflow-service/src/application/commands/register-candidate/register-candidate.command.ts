export type RegisterCandidateCommand = {
  acceptTerms: boolean;
  email: string;
  fullName: string;
  password: string;
  phone: string;
  requestId?: string;
};
