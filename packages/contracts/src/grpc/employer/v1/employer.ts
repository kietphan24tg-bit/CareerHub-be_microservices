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

export type DeleteEmployerProfileCompensationRequest = {
  identity_id: string;
  request_id?: string;
};

export type DeleteEmployerProfileCompensationResponse = {
  compensated: boolean;
};

export type GetEmployerProfileByIdentityIdRequest = {
  identity_id: string;
  request_id?: string;
};

export type EmployerProfile = {
  address: string;
  company_name: string;
  company_size: string;
  contact_name: string;
  contact_phone: string;
  created_at: string;
  description: string;
  founded_year: number;
  id: string;
  identity_id: string;
  industry: string;
  logo_url: string;
  null_fields: string[];
  tax_code: string;
  updated_at: string;
  website: string;
};

export type GetEmployerProfileByIdentityIdResponse = {
  profile: EmployerProfile;
};

export type UpdateEmployerProfileRequest = {
  address?: string;
  clear_fields?: string[];
  company_name?: string;
  company_size?: string;
  contact_name?: string;
  contact_phone?: string;
  description?: string;
  founded_year?: number;
  identity_id: string;
  industry?: string;
  logo_url?: string;
  request_id?: string;
  tax_code?: string;
  updated_fields?: string[];
  website?: string;
};

export type UpdateEmployerProfileResponse = {
  profile: EmployerProfile;
};

export type Department = {
  company_id: string;
  created_at: string;
  description: string;
  id: string;
  name: string;
  null_fields: string[];
  updated_at: string;
};

export type CreateDepartmentRequest = {
  identity_id: string;
  description?: string;
  name: string;
  request_id?: string;
};

export type UpdateDepartmentRequest = {
  clear_fields?: string[];
  description?: string;
  id: string;
  name?: string;
  request_id?: string;
  updated_fields?: string[];
};

export type DeleteDepartmentRequest = {
  id: string;
  request_id?: string;
};

export type DeleteDepartmentResponse = {
  deleted: boolean;
};

export type DepartmentResponse = {
  department: Department;
};

export type ListDepartmentsByCompanyRequest = {
  identity_id: string;
  request_id?: string;
};

export type ListDepartmentsByCompanyResponse = {
  departments: Department[];
};
