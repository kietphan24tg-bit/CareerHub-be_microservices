export const EMPLOYER_GRPC_PACKAGE_NAME = 'careerhub.employer.v1';
export const EMPLOYER_GRPC_SERVICE_NAME = 'EmployerService';

export type CreateEmployerProfileRequest = {
  address: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  identity_id: string;
  industry: string;
  request_id?: string;
};

export type CreateEmployerProfileResponse = {
  identity_id: string;
  profile_id: string;
};
