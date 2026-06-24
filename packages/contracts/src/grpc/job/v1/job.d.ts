export declare const JOB_GRPC_PACKAGE_NAME = "careerhub.job.v1";
export declare const JOB_GRPC_SERVICE_NAME = "JobService";
export type PageMeta = {
    page: number;
    page_size: number;
    total: number;
};
export type JobCompany = {
    company_name: string;
    id: string;
    industry: string;
    logo_url: string;
    website: string;
};
export type JobMessage = {
    application_count: number;
    benefits: string[];
    category: string;
    city: string;
    company?: JobCompany;
    company_id: string;
    country: string;
    created_at: string;
    currency: string;
    description: string;
    employment_type: string;
    experience_level: string;
    expires_at: string;
    id: string;
    is_remote: boolean;
    level: string;
    null_fields: string[];
    requirements: string[];
    responsibilities: string[];
    salary_max: number;
    salary_min: number;
    saturday_policy: string;
    slug: string;
    status: string;
    title: string;
    updated_at: string;
};
export type SavedJobSummary = {
    city: string;
    company_id: string;
    company_logo_url: string;
    company_name: string;
    country: string;
    currency: string;
    employment_type: string;
    expires_at: string;
    id: string;
    is_remote: boolean;
    level: string;
    null_fields: string[];
    salary_max: number;
    salary_min: number;
    slug: string;
    status: string;
    title: string;
};
export type ListPublicJobsRequest = {
    category?: string;
    company_industry?: string;
    employment_type?: string;
    experience_level?: string;
    keyword?: string;
    location?: string;
    page?: number;
    page_size?: number;
    remote_only?: boolean;
    request_id?: string;
    salary_max?: number;
    salary_min?: number;
    saturday_policy?: string;
    sort?: string;
};
export type ListPublicJobsResponse = {
    items: JobMessage[];
    meta: PageMeta;
};
export type GetPublicJobBySlugRequest = {
    request_id?: string;
    slug: string;
};
export type GetPublicJobBySlugResponse = {
    job: JobMessage;
};
export type ListEmployerJobsRequest = {
    category?: string;
    employer_identity_id: string;
    page?: number;
    page_size?: number;
    request_id?: string;
    status?: string;
};
export type ListEmployerJobsResponse = {
    items: JobMessage[];
    meta: PageMeta;
};
export type GetEmployerJobByIdRequest = {
    employer_identity_id: string;
    job_id: string;
    request_id?: string;
};
export type GetEmployerJobByIdResponse = {
    job: JobMessage;
};
export type CreateJobRequest = {
    benefits?: string[];
    category?: string;
    city?: string;
    company_id: string;
    company_industry?: string;
    company_logo_url?: string;
    company_name: string;
    company_website?: string;
    country?: string;
    currency?: string;
    description?: string;
    employer_identity_id: string;
    employment_type?: string;
    experience_level?: string;
    expires_at?: string;
    is_remote?: boolean;
    level?: string;
    request_id?: string;
    requirements?: string[];
    responsibilities?: string[];
    salary_max?: number;
    salary_min?: number;
    saturday_policy?: string;
    title: string;
};
export type CreateJobResponse = {
    job: JobMessage;
};
export type UpdateJobRequest = {
    benefits?: string[];
    category?: string;
    city?: string;
    clear_fields?: string[];
    country?: string;
    currency?: string;
    description?: string;
    employer_identity_id: string;
    employment_type?: string;
    experience_level?: string;
    expires_at?: string;
    is_remote?: boolean;
    job_id: string;
    level?: string;
    request_id?: string;
    requirements?: string[];
    responsibilities?: string[];
    salary_max?: number;
    salary_min?: number;
    saturday_policy?: string;
    title?: string;
    updated_fields?: string[];
};
export type UpdateJobResponse = {
    job: JobMessage;
};
export type PublishJobRequest = {
    employer_identity_id: string;
    job_id: string;
    request_id?: string;
};
export type PublishJobResponse = {
    job: JobMessage;
};
export type CloseJobRequest = {
    employer_identity_id: string;
    job_id: string;
    request_id?: string;
};
export type CloseJobResponse = {
    job: JobMessage;
};
export type ArchiveJobRequest = {
    employer_identity_id: string;
    job_id: string;
    request_id?: string;
};
export type ArchiveJobResponse = {
    job: JobMessage;
};
export type ReopenJobRequest = {
    employer_identity_id: string;
    job_id: string;
    request_id?: string;
};
export type ReopenJobResponse = {
    job: JobMessage;
};
export type DeleteJobRequest = {
    employer_identity_id: string;
    job_id: string;
    request_id?: string;
};
export type DeleteJobResponse = {
    deleted: boolean;
};
export type ListJobsByIdsRequest = {
    job_ids: string[];
    request_id?: string;
};
export type ListJobsByIdsResponse = {
    items: SavedJobSummary[];
};
export type JobExistsRequest = {
    job_id: string;
    request_id?: string;
};
export type JobExistsResponse = {
    exists: boolean;
};
export type GetJobForApplicationRequest = {
    job_id: string;
    request_id?: string;
};
export type GetJobForApplicationResponse = {
    employer_identity_id: string;
    expires_at: string;
    job_id: string;
    null_fields: string[];
    status: string;
};
export type EmployerDashboardPriorityJobMessage = {
    category: string;
    city: string;
    country: string;
    expires_at: string;
    id: string;
    is_remote: boolean;
    slug: string;
    status: string;
    title: string;
};
export type GetEmployerDashboardJobsSummaryRequest = {
    employer_identity_id: string;
    request_id?: string;
};
export type GetEmployerDashboardJobsSummaryResponse = {
    active_jobs: number;
    priority_jobs: EmployerDashboardPriorityJobMessage[];
};
