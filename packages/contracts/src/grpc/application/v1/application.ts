export const APPLICATION_GRPC_PACKAGE_NAME = 'careerhub.application.v1';
export const APPLICATION_GRPC_SERVICE_NAME = 'ApplicationService';

export type ApplicationPageMeta = {
  page: number;
  page_size: number;
  total: number;
};

export type CandidateApplicationsSummaryMessage = {
  all: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  reviewed: number;
  withdrawn: number;
};

export type InterviewMessage = {
  application_id: string;
  caller_info: string;
  candidate_identity_id?: string;
  candidate_proposed_date?: string;
  candidate_proposed_duration_minutes?: number;
  candidate_proposed_start_time?: string;
  candidate_proposed_timezone?: string;
  candidate_response_note: string;
  contact_info: string;
  created_at: string;
  date: string;
  duration_minutes?: number;
  employer_identity_id?: string;
  end_time: string;
  full_address: string;
  id: string;
  interviewers?: InterviewerMessage[];
  job_id?: string;
  location_detail: string;
  location_lat?: string;
  location_lng?: string;
  logistics_note?: string;
  map_link: string;
  meeting_id: string;
  meeting_link: string;
  notes_to_candidate: string;
  null_fields: string[];
  office_name: string;
  passcode: string;
  phone_number: string;
  platform: string;
  round: string;
  scheduled_by_identity_id?: string;
  start_time: string;
  status: string;
  timezone: string;
  type: string;
  updated_at: string;
};

export type InterviewerMessage = {
  name: string;
  role: string;
};

export type InterviewDetailMessage = InterviewMessage;

export type OfferBenefitMessage = {
  amount: string;
  annual_leave_days: number;
  catalog_id: string;
  created_at: string;
  currency: string;
  description: string;
  frequency: string;
  has_monetary_value: boolean;
  id: string;
  name: string;
  null_fields: string[];
  offer_id: string;
  type: string;
  updated_at: string;
};

export type BenefitCatalogMessage = {
  code: string;
  description: string;
  has_monetary_value_default: boolean;
  id: string;
  is_selectable: boolean;
  label: string;
  null_fields: string[];
  requires_amount: boolean;
  requires_annual_leave_days: boolean;
  requires_frequency: boolean;
  sort_order: number;
};

export type OfferDetailMessage = {
  application_id: string;
  benefits: OfferBenefitMessage[];
  bonus_details: string;
  candidate_identity_id: string;
  contract_document_url: string;
  created_at: string;
  created_by_identity_id: string;
  currency: string;
  deleted_at: string;
  department_team: string;
  employer_identity_id: string;
  employment_type: string;
  expires_at: string;
  id: string;
  job_id: string;
  location: string;
  message: string;
  null_fields: string[];
  probation_custom: string;
  probation_type: string;
  reporting_to: string;
  responded_at: string;
  salary: string;
  salary_period: string;
  seniority_label: string;
  sent_at: string;
  start_date: string;
  status: string;
  title: string;
  updated_at: string;
  viewed_at: string;
  work_model: string;
};

export type OfferMessage = {
  application_id: string;
  benefits?: OfferBenefitMessage[];
  bonus_details: string;
  candidate_identity_id?: string;
  contract_document_url: string;
  created_at: string;
  created_by_identity_id?: string;
  currency: string;
  deleted_at?: string;
  department_team?: string;
  employer_identity_id?: string;
  employment_type: string;
  expires_at: string;
  id: string;
  job_id?: string;
  location: string;
  message: string;
  null_fields: string[];
  probation_custom?: string;
  probation_type?: string;
  reporting_to?: string;
  responded_at: string;
  salary: string;
  salary_period?: string;
  seniority_label: string;
  sent_at: string;
  start_date: string;
  status: string;
  title: string;
  updated_at: string;
  viewed_at: string;
  work_model: string;
};

export type ApplicationMessage = {
  candidate_identity_id: string;
  cover_letter: string;
  created_at: string;
  employer_identity_id: string;
  id: string;
  interview?: InterviewMessage;
  job_id: string;
  null_fields: string[];
  offer?: OfferMessage;
  resume_id: string;
  status: string;
  updated_at: string;
};

export type ApplicationHistoryMessage = {
  actor_identity_id: string;
  actor_type: string;
  application_id: string;
  created_at: string;
  event_type: string;
  from_status: string;
  id: string;
  null_fields: string[];
  note: string;
  to_status: string;
};

export type ApplicationCountByJobMessage = {
  count: number;
  job_id: string;
};

export type ApplyToJobRequest = {
  candidate_identity_id: string;
  cover_letter?: string;
  employer_identity_id: string;
  job_id: string;
  request_id?: string;
  resume_id: string;
};

export type ApplyToJobResponse = {
  application: ApplicationMessage;
};

export type WithdrawApplicationRequest = {
  application_id: string;
  candidate_identity_id: string;
  request_id?: string;
};

export type WithdrawApplicationResponse = {
  application: ApplicationMessage;
};

export type UpdateApplicationStatusRequest = {
  application_id: string;
  employer_identity_id: string;
  note?: string;
  request_id?: string;
  status: string;
};

export type UpdateApplicationStatusResponse = {
  application: ApplicationMessage;
};

export type ListCandidateApplicationsRequest = {
  candidate_identity_id: string;
  page?: number;
  page_size?: number;
  request_id?: string;
  sort?: string;
  status?: string;
};

export type ListCandidateApplicationsResponse = {
  items: ApplicationMessage[];
  meta: ApplicationPageMeta;
  summary: CandidateApplicationsSummaryMessage;
};

export type GetCandidateApplicationByIdRequest = {
  application_id: string;
  candidate_identity_id: string;
  request_id?: string;
};

export type GetCandidateApplicationByIdResponse = {
  application: ApplicationMessage;
};

export type ListJobApplicationsRequest = {
  employer_identity_id: string;
  job_id: string;
  page?: number;
  page_size?: number;
  request_id?: string;
  status?: string;
};

export type ListJobApplicationsResponse = {
  items: ApplicationMessage[];
  meta: ApplicationPageMeta;
};

export type GetEmployerApplicationByIdRequest = {
  application_id: string;
  employer_identity_id: string;
  request_id?: string;
};

export type GetEmployerApplicationByIdResponse = {
  application: ApplicationMessage;
};

export type GetApplicationHistoryRequest = {
  application_id: string;
  request_id?: string;
};

export type GetApplicationHistoryResponse = {
  items: ApplicationHistoryMessage[];
};

export type GetApplicationCountsByJobIdsRequest = {
  job_ids: string[];
  request_id?: string;
};

export type GetApplicationCountsByJobIdsResponse = {
  items: ApplicationCountByJobMessage[];
};

export type CreateInterviewInputMessage = {
  caller_info?: string;
  contact_info?: string;
  date?: string;
  duration_minutes?: number;
  full_address?: string;
  interviewers?: InterviewerMessage[];
  location_detail?: string;
  location_lat?: string;
  location_lng?: string;
  logistics_note?: string;
  map_link?: string;
  meeting_id?: string;
  meeting_link?: string;
  notes_to_candidate?: string;
  office_name?: string;
  passcode?: string;
  phone_number?: string;
  platform?: string;
  round: string;
  start_time?: string;
  timezone?: string;
  type: string;
};

export type UpdateInterviewInputMessage = Partial<CreateInterviewInputMessage>;

export type CancelInterviewInputMessage = {
  reason: string;
};

export type CandidateInterviewResponseInputMessage = {
  candidate_response_note?: string;
};

export type CandidateRescheduleRequestInputMessage = CandidateInterviewResponseInputMessage & {
  proposed_date: string;
  proposed_duration_minutes?: number;
  proposed_start_time: string;
  proposed_timezone?: string;
};

export type OfferBenefitInputMessage = {
  amount?: string;
  annual_leave_days?: number;
  catalog_id?: string;
  currency?: string;
  description?: string;
  frequency?: string;
  has_monetary_value?: boolean;
  name?: string;
  type: string;
};

export type CreateOfferInputMessage = {
  benefits?: OfferBenefitInputMessage[];
  bonus_details?: string;
  contract_document_url?: string;
  currency?: string;
  department_team?: string;
  employment_type?: string;
  location?: string;
  message?: string;
  offer_expires_at?: string;
  probation_custom?: string;
  probation_type?: string;
  reporting_to?: string;
  salary?: string;
  salary_period?: string;
  seniority_label?: string;
  start_date?: string;
  title: string;
  work_model?: string;
};

export type UpdateOfferInputMessage = Partial<CreateOfferInputMessage>;

export type CandidateOfferDecisionInputMessage = {
  note?: string;
};

export type ListEmployerInterviewsRequest = {
  employer_identity_id: string;
  request_id?: string;
};

export type ListEmployerInterviewsResponse = {
  items: InterviewDetailMessage[];
};

export type CreateInterviewRequest = {
  application_id: string;
  employer_identity_id: string;
  input: CreateInterviewInputMessage;
  request_id?: string;
};

export type CreateInterviewResponse = {
  interview: InterviewDetailMessage;
};

export type UpdateInterviewRequest = {
  employer_identity_id: string;
  input: UpdateInterviewInputMessage;
  interview_id: string;
  request_id?: string;
};

export type UpdateInterviewResponse = {
  interview: InterviewDetailMessage;
};

export type CancelInterviewRequest = {
  employer_identity_id: string;
  input: CancelInterviewInputMessage;
  interview_id: string;
  request_id?: string;
};

export type CancelInterviewResponse = {
  interview: InterviewDetailMessage;
};

export type GetCandidateInterviewRequest = {
  application_id: string;
  candidate_identity_id: string;
  request_id?: string;
};

export type GetCandidateInterviewResponse = {
  interview: InterviewDetailMessage;
};

export type ConfirmInterviewRequest = {
  candidate_identity_id: string;
  input?: CandidateInterviewResponseInputMessage;
  interview_id: string;
  request_id?: string;
};

export type ConfirmInterviewResponse = {
  interview: InterviewDetailMessage;
};

export type DeclineInterviewRequest = {
  candidate_identity_id: string;
  input?: CandidateInterviewResponseInputMessage;
  interview_id: string;
  request_id?: string;
};

export type DeclineInterviewResponse = {
  interview: InterviewDetailMessage;
};

export type RequestInterviewRescheduleRequest = {
  candidate_identity_id: string;
  input: CandidateRescheduleRequestInputMessage;
  interview_id: string;
  request_id?: string;
};

export type RequestInterviewRescheduleResponse = {
  interview: InterviewDetailMessage;
};

export type ListBenefitCatalogRequest = {
  request_id?: string;
};

export type ListBenefitCatalogResponse = {
  items: BenefitCatalogMessage[];
};

export type CreateOfferRequest = {
  application_id: string;
  employer_identity_id: string;
  input: CreateOfferInputMessage;
  request_id?: string;
};

export type CreateOfferResponse = {
  offer: OfferDetailMessage;
};

export type SendOfferRequest = {
  employer_identity_id: string;
  offer_id: string;
  request_id?: string;
};

export type SendOfferResponse = {
  offer: OfferDetailMessage;
};

export type UpdateOfferRequest = {
  employer_identity_id: string;
  input: UpdateOfferInputMessage;
  offer_id: string;
  request_id?: string;
};

export type UpdateOfferResponse = {
  offer: OfferDetailMessage;
};

export type SoftDeleteOfferRequest = {
  employer_identity_id: string;
  offer_id: string;
  request_id?: string;
};

export type SoftDeleteOfferResponse = {
  deleted: boolean;
  id: string;
};

export type ListEmployerOffersForApplicationRequest = {
  application_id: string;
  employer_identity_id: string;
  request_id?: string;
};

export type ListEmployerOffersForApplicationResponse = {
  items: OfferDetailMessage[];
};

export type GetEmployerOfferRequest = {
  employer_identity_id: string;
  offer_id: string;
  request_id?: string;
};

export type GetEmployerOfferResponse = {
  offer: OfferDetailMessage;
};

export type ListCandidateOffersForApplicationRequest = {
  application_id: string;
  candidate_identity_id: string;
  request_id?: string;
};

export type ListCandidateOffersForApplicationResponse = {
  items: OfferDetailMessage[];
};

export type GetCandidateOfferRequest = {
  candidate_identity_id: string;
  offer_id: string;
  request_id?: string;
};

export type GetCandidateOfferResponse = {
  offer: OfferDetailMessage;
};

export type AcceptOfferRequest = {
  candidate_identity_id: string;
  input?: CandidateOfferDecisionInputMessage;
  offer_id: string;
  request_id?: string;
};

export type AcceptOfferResponse = {
  offer: OfferDetailMessage;
};

export type DeclineOfferRequest = {
  candidate_identity_id: string;
  input?: CandidateOfferDecisionInputMessage;
  offer_id: string;
  request_id?: string;
};

export type DeclineOfferResponse = {
  offer: OfferDetailMessage;
};

export type EmployerDashboardPipelineItemMessage = {
  application_id: string;
  applied_at: string;
  candidate_identity_id: string;
  job_id: string;
  status: string;
  updated_at: string;
};

export type EmployerDashboardInterviewTodayItemMessage = {
  application_id: string;
  candidate_identity_id: string;
  date: string;
  id: string;
  job_id: string;
  start_time: string;
  status: string;
  type: string;
};

export type EmployerDashboardRecentActivityItemMessage = {
  application_id: string;
  candidate_identity_id: string;
  created_at: string;
  event_type: string;
  id: string;
  job_id: string;
  new_status: string;
  note: string;
  old_status: string;
};

export type EmployerDashboardRecruitmentSummaryMessage = {
  interviews_today: number;
  offers_open: number;
  total_applicants: number;
};

export type GetEmployerDashboardRecruitmentDataRequest = {
  employer_identity_id: string;
  local_date: string;
  request_id?: string;
};

export type GetEmployerDashboardRecruitmentDataResponse = {
  interviews_today: EmployerDashboardInterviewTodayItemMessage[];
  pipeline: EmployerDashboardPipelineItemMessage[];
  recent_activities: EmployerDashboardRecentActivityItemMessage[];
  summary: EmployerDashboardRecruitmentSummaryMessage;
};

export type CandidateDashboardRecentApplicationItemMessage = {
  application_id: string;
  applied_at: string;
  employer_identity_id: string;
  job_id: string;
  status: string;
  updated_at: string;
};

export type CandidateDashboardUpcomingInterviewItemMessage = {
  application_id: string;
  date: string;
  employer_identity_id: string;
  id: string;
  job_id: string;
  round: string;
  start_time: string;
  status: string;
  type: string;
};

export type CandidateDashboardActiveOfferItemMessage = {
  application_id: string;
  currency: string;
  employer_identity_id: string;
  expires_at: string;
  id: string;
  job_id: string;
  salary: string;
  sent_at: string;
  status: string;
  title: string;
};

export type CandidateDashboardSummaryMessage = {
  active_interviews: number;
  active_offers: number;
  total_applications: number;
};

export type GetCandidateDashboardDataRequest = {
  candidate_identity_id: string;
  local_date: string;
  request_id?: string;
};

export type GetCandidateDashboardDataResponse = {
  active_offers: CandidateDashboardActiveOfferItemMessage[];
  recent_applications: CandidateDashboardRecentApplicationItemMessage[];
  summary: CandidateDashboardSummaryMessage;
  upcoming_interviews: CandidateDashboardUpcomingInterviewItemMessage[];
};

export type RecruiterNoteMessage = {
  application_id: string;
  author_identity_id: string;
  body: string;
  created_at: string;
  id: string;
  updated_at: string;
};

export type ListRecruiterNotesRequest = {
  application_id: string;
  employer_identity_id: string;
  request_id?: string;
};

export type ListRecruiterNotesResponse = {
  items: RecruiterNoteMessage[];
};

export type CreateRecruiterNoteRequest = {
  application_id: string;
  body: string;
  employer_identity_id: string;
  request_id?: string;
};

export type CreateRecruiterNoteResponse = {
  note: RecruiterNoteMessage;
};

export type UpdateRecruiterNoteRequest = {
  body: string;
  employer_identity_id: string;
  note_id: string;
  request_id?: string;
};

export type UpdateRecruiterNoteResponse = {
  note: RecruiterNoteMessage;
};

export type DeleteRecruiterNoteRequest = {
  employer_identity_id: string;
  note_id: string;
  request_id?: string;
};

export type DeleteRecruiterNoteResponse = {
  deleted: boolean;
  id: string;
};
