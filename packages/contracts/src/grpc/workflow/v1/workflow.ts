export const WORKFLOW_GRPC_PACKAGE_NAME = 'careerhub.workflow.v1';
export const WORKFLOW_GRPC_SERVICE_NAME = 'WorkflowService';

export type RegisterCandidateRequest = {
  accept_terms: boolean;
  email: string;
  full_name: string;
  password: string;
  phone: string;
  request_id?: string;
};

export type RegisterEmployerRequest = {
  accept_terms: boolean;
  address: string;
  company_email: string;
  company_name: string;
  full_name: string;
  industry: string;
  password: string;
  phone: string;
  request_id?: string;
};

export type RegistrationSagaResponse = {
  email: string;
  identity_id: string;
  role: string;
  saga_id: string;
  status: string;
};
