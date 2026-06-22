export type RegisterEmployerCommand = {
  acceptTerms: boolean;
  address: string;
  companyEmail: string;
  companyName: string;
  fullName: string;
  industry: string;
  password: string;
  phone: string;
  requestId?: string;
};
