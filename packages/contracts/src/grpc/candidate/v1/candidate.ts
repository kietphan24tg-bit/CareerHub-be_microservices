export const CANDIDATE_GRPC_PACKAGE_NAME = 'careerhub.candidate.v1';
export const CANDIDATE_GRPC_SERVICE_NAME = 'CandidateService';

export type CreateCandidateProfileRequest = {
  full_name: string;
  identity_id: string;
  phone: string;
  request_id?: string;
};

export type CreateCandidateProfileResponse = {
  identity_id: string;
  profile_id: string;
};

export type DeleteCandidateProfileCompensationRequest = {
  identity_id: string;
  request_id?: string;
};

export type DeleteCandidateProfileCompensationResponse = {
  compensated: boolean;
};

export type GetCandidateProfileByIdentityIdRequest = {
  identity_id: string;
  request_id?: string;
};

export type CandidateProfile = {
  address: string;
  avatar_url: string;
  bio: string;
  created_at: string;
  full_name: string;
  github_url: string;
  headline: string;
  id: string;
  identity_id: string;
  linkedin_url: string;
  null_fields: string[];
  phone: string;
  portfolio_url: string;
  resume_id: string;
  updated_at: string;
  years_experience: number;
};

export type GetCandidateProfileByIdentityIdResponse = {
  profile: CandidateProfile;
};

export type UpdateCandidateProfileRequest = {
  address?: string;
  avatar_url?: string;
  bio?: string;
  clear_fields?: string[];
  full_name?: string;
  github_url?: string;
  headline?: string;
  identity_id: string;
  linkedin_url?: string;
  phone?: string;
  portfolio_url?: string;
  request_id?: string;
  resume_id?: string;
  updated_fields?: string[];
  years_experience?: number;
};

export type UpdateCandidateProfileResponse = {
  profile: CandidateProfile;
};

export type SavedJob = {
  id: string;
  identity_id: string;
  job_id: string;
  saved_at: string;
};

export type ListSavedJobsByIdentityIdRequest = {
  identity_id: string;
  request_id?: string;
};

export type ListSavedJobsByIdentityIdResponse = {
  saved_jobs: SavedJob[];
};

export type SaveJobRequest = {
  identity_id: string;
  job_id: string;
  request_id?: string;
};

export type SaveJobResponse = {
  saved_job: SavedJob;
};

export type RemoveSavedJobRequest = {
  identity_id: string;
  job_id: string;
  request_id?: string;
};

export type RemoveSavedJobResponse = {
  removed: boolean;
};

export type ResumeTemplateListItem = {
  category: string;
  id: string;
  name: string;
  thumbnail: string;
};

export type ResumeTemplateDetail = {
  category: string;
  id: string;
  layout_data_json: string;
  name: string;
  thumbnail: string;
};

export type ResumeMessage = {
  content_json: string;
  id: string;
  identity_id: string;
  is_using: boolean;
  template_id: string;
  title: string;
  updated_at: string;
};

export type ListResumeTemplatesRequest = {
  request_id?: string;
};

export type ListResumeTemplatesResponse = {
  templates: ResumeTemplateListItem[];
};

export type GetResumeTemplateByIdRequest = {
  request_id?: string;
  template_id: string;
};

export type GetResumeTemplateByIdResponse = {
  template: ResumeTemplateDetail;
};

export type ListResumesByIdentityIdRequest = {
  identity_id: string;
  request_id?: string;
};

export type ListResumesByIdentityIdResponse = {
  resumes: ResumeMessage[];
};

export type GetResumeByIdRequest = {
  identity_id: string;
  request_id?: string;
  resume_id: string;
};

export type GetResumeByIdResponse = {
  resume: ResumeMessage;
};

export type CreateOrGetTemplateDraftRequest = {
  identity_id: string;
  request_id?: string;
  template_id: string;
};

export type CreateOrGetTemplateDraftResponse = {
  resume: ResumeMessage;
};

export type CreateResumeRequest = {
  content_json: string;
  identity_id: string;
  request_id?: string;
  template_id: string;
  title: string;
};

export type CreateResumeResponse = {
  resume: ResumeMessage;
};

export type UpdateResumeRequest = {
  content_json: string;
  identity_id: string;
  request_id?: string;
  resume_id: string;
  title: string;
};

export type UpdateResumeResponse = {
  resume: ResumeMessage;
};

export type DeleteResumeRequest = {
  identity_id: string;
  request_id?: string;
  resume_id: string;
};

export type DeleteResumeResponse = {
  deleted: boolean;
};

export type GetResumeExportPayloadRequest = {
  identity_id: string;
  request_id?: string;
  resume_id: string;
};

export type GetResumeExportPayloadResponse = {
  resume: ResumeMessage;
  template: ResumeTemplateDetail;
};
