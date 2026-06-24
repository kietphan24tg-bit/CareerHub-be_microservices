import {
  APPLICATION_GRPC_SERVICE_NAME,
  type AcceptOfferRequest,
  type AcceptOfferResponse,
  type ApplyToJobRequest,
  type ApplyToJobResponse,
  type CancelInterviewRequest,
  type CancelInterviewResponse,
  type ConfirmInterviewRequest,
  type ConfirmInterviewResponse,
  type CreateInterviewRequest,
  type CreateInterviewResponse,
  type CreateOfferRequest,
  type CreateOfferResponse,
  type CreateRecruiterNoteRequest,
  type CreateRecruiterNoteResponse,
  type DeclineInterviewRequest,
  type DeclineInterviewResponse,
  type DeclineOfferRequest,
  type DeclineOfferResponse,
  type DeleteRecruiterNoteRequest,
  type DeleteRecruiterNoteResponse,
  type GetApplicationCountsByJobIdsRequest,
  type GetApplicationCountsByJobIdsResponse,
  type GetApplicationHistoryRequest,
  type GetApplicationHistoryResponse,
  type GetCandidateApplicationByIdRequest,
  type GetCandidateApplicationByIdResponse,
  type GetCandidateDashboardDataRequest,
  type GetCandidateDashboardDataResponse,
  type GetCandidateInterviewRequest,
  type GetCandidateInterviewResponse,
  type GetCandidateOfferRequest,
  type GetCandidateOfferResponse,
  type GetEmployerApplicationByIdRequest,
  type GetEmployerApplicationByIdResponse,
  type GetEmployerDashboardRecruitmentDataRequest,
  type GetEmployerDashboardRecruitmentDataResponse,
  type GetEmployerOfferRequest,
  type GetEmployerOfferResponse,
  type ListBenefitCatalogRequest,
  type ListBenefitCatalogResponse,
  type ListCandidateApplicationsRequest,
  type ListCandidateApplicationsResponse,
  type ListCandidateOffersForApplicationRequest,
  type ListCandidateOffersForApplicationResponse,
  type ListEmployerInterviewsRequest,
  type ListEmployerInterviewsResponse,
  type ListEmployerOffersRequest,
  type ListEmployerOffersResponse,
  type ListEmployerOffersForApplicationRequest,
  type ListEmployerOffersForApplicationResponse,
  type ListJobApplicationsRequest,
  type ListJobApplicationsResponse,
  type ListRecruiterNotesRequest,
  type ListRecruiterNotesResponse,
  type RequestInterviewRescheduleRequest,
  type RequestInterviewRescheduleResponse,
  type SendOfferRequest,
  type SendOfferResponse,
  type SoftDeleteOfferRequest,
  type SoftDeleteOfferResponse,
  type UpdateApplicationStatusRequest,
  type UpdateApplicationStatusResponse,
  type UpdateInterviewRequest,
  type UpdateInterviewResponse,
  type UpdateOfferRequest,
  type UpdateOfferResponse,
  type UpdateRecruiterNoteRequest,
  type UpdateRecruiterNoteResponse,
  type WithdrawApplicationRequest,
  type WithdrawApplicationResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  AcceptOfferCommandHandler,
  ApplyToJobCommandHandler,
  CancelInterviewCommandHandler,
  ConfirmInterviewCommandHandler,
  CreateInterviewCommandHandler,
  CreateOfferCommandHandler,
  CreateRecruiterNoteCommandHandler,
  DeclineInterviewCommandHandler,
  DeclineOfferCommandHandler,
  DeleteRecruiterNoteCommandHandler,
  GetApplicationCountsByJobIdsQueryHandler,
  GetApplicationHistoryQueryHandler,
  GetApplicationRelatedDataQueryHandler,
  GetCandidateApplicationByIdQueryHandler,
  GetCandidateDashboardDataQueryHandler,
  GetCandidateInterviewQueryHandler,
  GetCandidateOfferQueryHandler,
  GetEmployerApplicationByIdQueryHandler,
  GetEmployerDashboardRecruitmentDataQueryHandler,
  GetEmployerOfferQueryHandler,
  ListBenefitCatalogQueryHandler,
  ListCandidateApplicationsQueryHandler,
  ListCandidateOffersForApplicationQueryHandler,
  ListEmployerInterviewsQueryHandler,
  ListEmployerOffersQueryHandler,
  ListEmployerOffersForApplicationQueryHandler,
  ListJobApplicationsQueryHandler,
  ListRecruiterNotesQueryHandler,
  RequestInterviewRescheduleCommandHandler,
  SendOfferCommandHandler,
  SoftDeleteOfferCommandHandler,
  UpdateApplicationStatusCommandHandler,
  UpdateInterviewCommandHandler,
  UpdateOfferCommandHandler,
  UpdateRecruiterNoteCommandHandler,
  WithdrawApplicationCommandHandler,
  type ApplicationRecord,
  type ApplicationStatus
} from '../../../application';
import type { CandidateApplicationStatusFilter } from '../../../application/queries/list-candidate-applications/list-candidate-applications.query';
import {
  toGrpcApplicationHistoryMessage,
  toGrpcEnrichedApplicationMessage
} from '../mappers/application-message.mapper';
import { mapErrorToApplicationGrpcException } from '../mappers/grpc-error.mapper';
import {
  fromGrpcCreateInterviewInput,
  fromGrpcCreateOfferInput,
  fromGrpcUpdateInterviewInput,
  fromGrpcUpdateOfferInput,
  toGrpcBenefitCatalogMessage,
  toGrpcInterviewDetailMessage,
  toGrpcOfferDetailMessage
} from '../mappers/recruitment-message.mapper';
import {
  toGrpcCandidateDashboardDataResponse,
  toGrpcEmployerDashboardRecruitmentDataResponse,
  toGrpcRecruiterNoteMessage
} from '../mappers/employer-dashboard-message.mapper';

@Controller()
export class ApplicationGrpcController {
  constructor(
    private readonly acceptOfferCommandHandler: AcceptOfferCommandHandler,
    private readonly applyToJobCommandHandler: ApplyToJobCommandHandler,
    private readonly cancelInterviewCommandHandler: CancelInterviewCommandHandler,
    private readonly confirmInterviewCommandHandler: ConfirmInterviewCommandHandler,
    private readonly createInterviewCommandHandler: CreateInterviewCommandHandler,
    private readonly createOfferCommandHandler: CreateOfferCommandHandler,
    private readonly createRecruiterNoteCommandHandler: CreateRecruiterNoteCommandHandler,
    private readonly declineInterviewCommandHandler: DeclineInterviewCommandHandler,
    private readonly declineOfferCommandHandler: DeclineOfferCommandHandler,
    private readonly deleteRecruiterNoteCommandHandler: DeleteRecruiterNoteCommandHandler,
    private readonly getApplicationCountsByJobIdsQueryHandler: GetApplicationCountsByJobIdsQueryHandler,
    private readonly getApplicationHistoryQueryHandler: GetApplicationHistoryQueryHandler,
    private readonly getApplicationRelatedDataQueryHandler: GetApplicationRelatedDataQueryHandler,
    private readonly getCandidateApplicationByIdQueryHandler: GetCandidateApplicationByIdQueryHandler,
    private readonly getCandidateDashboardDataQueryHandler: GetCandidateDashboardDataQueryHandler,
    private readonly getCandidateInterviewQueryHandler: GetCandidateInterviewQueryHandler,
    private readonly getCandidateOfferQueryHandler: GetCandidateOfferQueryHandler,
    private readonly getEmployerApplicationByIdQueryHandler: GetEmployerApplicationByIdQueryHandler,
    private readonly getEmployerDashboardRecruitmentDataQueryHandler: GetEmployerDashboardRecruitmentDataQueryHandler,
    private readonly getEmployerOfferQueryHandler: GetEmployerOfferQueryHandler,
    private readonly listBenefitCatalogQueryHandler: ListBenefitCatalogQueryHandler,
    private readonly listCandidateApplicationsQueryHandler: ListCandidateApplicationsQueryHandler,
    private readonly listCandidateOffersForApplicationQueryHandler: ListCandidateOffersForApplicationQueryHandler,
    private readonly listEmployerInterviewsQueryHandler: ListEmployerInterviewsQueryHandler,
    private readonly listEmployerOffersQueryHandler: ListEmployerOffersQueryHandler,
    private readonly listEmployerOffersForApplicationQueryHandler: ListEmployerOffersForApplicationQueryHandler,
    private readonly listJobApplicationsQueryHandler: ListJobApplicationsQueryHandler,
    private readonly listRecruiterNotesQueryHandler: ListRecruiterNotesQueryHandler,
    private readonly requestInterviewRescheduleCommandHandler: RequestInterviewRescheduleCommandHandler,
    private readonly sendOfferCommandHandler: SendOfferCommandHandler,
    private readonly softDeleteOfferCommandHandler: SoftDeleteOfferCommandHandler,
    private readonly updateApplicationStatusCommandHandler: UpdateApplicationStatusCommandHandler,
    private readonly updateInterviewCommandHandler: UpdateInterviewCommandHandler,
    private readonly updateOfferCommandHandler: UpdateOfferCommandHandler,
    private readonly updateRecruiterNoteCommandHandler: UpdateRecruiterNoteCommandHandler,
    private readonly withdrawApplicationCommandHandler: WithdrawApplicationCommandHandler
  ) {}

  private async toGrpcApplication(application: ApplicationRecord) {
    const related = await this.getApplicationRelatedDataQueryHandler.execute(application.id);

    return toGrpcEnrichedApplicationMessage({
      application,
      interview: related.interview,
      offer: related.offer
    });
  }

  private async toGrpcApplications(applications: ApplicationRecord[]) {
    const relatedMap = await this.getApplicationRelatedDataQueryHandler.executeBatch(
      applications.map((application) => application.id)
    );

    return applications.map((application) => {
      const related = relatedMap.get(application.id) ?? {
        interview: null,
        offer: null
      };

      return toGrpcEnrichedApplicationMessage({
        application,
        interview: related.interview,
        offer: related.offer
      });
    });
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ApplyToJob')
  async applyToJob(request: ApplyToJobRequest): Promise<ApplyToJobResponse> {
    try {
      const application = await this.applyToJobCommandHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        coverLetter: request.cover_letter,
        employerIdentityId: request.employer_identity_id,
        jobId: request.job_id,
        requestId: request.request_id,
        resumeId: request.resume_id
      });

      return {
        application: await this.toGrpcApplication(application)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'WithdrawApplication')
  async withdrawApplication(
    request: WithdrawApplicationRequest
  ): Promise<WithdrawApplicationResponse> {
    try {
      const application = await this.withdrawApplicationCommandHandler.execute({
        applicationId: request.application_id,
        candidateIdentityId: request.candidate_identity_id
      });

      return {
        application: await this.toGrpcApplication(application)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'UpdateApplicationStatus')
  async updateApplicationStatus(
    request: UpdateApplicationStatusRequest
  ): Promise<UpdateApplicationStatusResponse> {
    try {
      const application = await this.updateApplicationStatusCommandHandler.execute({
        applicationId: request.application_id,
        employerIdentityId: request.employer_identity_id,
        note: request.note,
        requestId: request.request_id,
        status: request.status as ApplicationStatus
      });

      return {
        application: await this.toGrpcApplication(application)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ListCandidateApplications')
  async listCandidateApplications(
    request: ListCandidateApplicationsRequest
  ): Promise<ListCandidateApplicationsResponse> {
    try {
      const result = await this.listCandidateApplicationsQueryHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        page: request.page ?? 1,
        pageSize: request.page_size ?? 20,
        sort: (request.sort as 'newest' | 'oldest' | undefined) ?? 'newest',
        status: (request.status as CandidateApplicationStatusFilter | undefined) ?? 'all'
      });

      return {
        items: await this.toGrpcApplications(result.items),
        meta: {
          page: result.meta.page,
          page_size: result.meta.pageSize,
          total: result.meta.total
        },
        summary: result.summary
      } as unknown as ListCandidateApplicationsResponse;
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetCandidateApplicationById')
  async getCandidateApplicationById(
    request: GetCandidateApplicationByIdRequest
  ): Promise<GetCandidateApplicationByIdResponse> {
    try {
      const application = await this.getCandidateApplicationByIdQueryHandler.execute({
        applicationId: request.application_id,
        candidateIdentityId: request.candidate_identity_id
      });

      return {
        application: await this.toGrpcApplication(application)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ListJobApplications')
  async listJobApplications(
    request: ListJobApplicationsRequest
  ): Promise<ListJobApplicationsResponse> {
    try {
      const result = await this.listJobApplicationsQueryHandler.execute({
        employerIdentityId: request.employer_identity_id,
        jobId: request.job_id,
        page: request.page ?? 1,
        pageSize: request.page_size ?? 20,
        status: request.status as ApplicationStatus | undefined
      });

      return {
        items: await this.toGrpcApplications(result.items),
        meta: {
          page: result.meta.page,
          page_size: result.meta.pageSize,
          total: result.meta.total
        }
      } as unknown as ListJobApplicationsResponse;
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetEmployerApplicationById')
  async getEmployerApplicationById(
    request: GetEmployerApplicationByIdRequest
  ): Promise<GetEmployerApplicationByIdResponse> {
    try {
      const application = await this.getEmployerApplicationByIdQueryHandler.execute({
        applicationId: request.application_id,
        employerIdentityId: request.employer_identity_id
      });

      return {
        application: await this.toGrpcApplication(application)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetApplicationHistory')
  async getApplicationHistory(
    request: GetApplicationHistoryRequest
  ): Promise<GetApplicationHistoryResponse> {
    try {
      const items = await this.getApplicationHistoryQueryHandler.execute({
        applicationId: request.application_id
      });

      return {
        items: items.map(toGrpcApplicationHistoryMessage)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetApplicationCountsByJobIds')
  async getApplicationCountsByJobIds(
    request: GetApplicationCountsByJobIdsRequest
  ): Promise<GetApplicationCountsByJobIdsResponse> {
    try {
      const items = await this.getApplicationCountsByJobIdsQueryHandler.execute({
        jobIds: request.job_ids
      });

      return {
        items: items.map((item) => ({
          count: item.count,
          job_id: item.jobId
        }))
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ListEmployerInterviews')
  async listEmployerInterviews(
    request: ListEmployerInterviewsRequest
  ): Promise<ListEmployerInterviewsResponse> {
    try {
      const result = await this.listEmployerInterviewsQueryHandler.execute({
        date: request.date,
        dateFrom: request.date_from,
        dateTo: request.date_to,
        employerIdentityId: request.employer_identity_id,
        page: request.page ?? 1,
        pageSize: request.page_size ?? 20,
        status: request.status,
        type: request.type
      });

      return {
        items: result.items.map(toGrpcInterviewDetailMessage),
        meta: {
          page: result.meta.page,
          page_size: result.meta.pageSize,
          total: result.meta.total
        }
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'CreateInterview')
  async createInterview(
    request: CreateInterviewRequest
  ): Promise<CreateInterviewResponse> {
    try {
      const interview = await this.createInterviewCommandHandler.execute({
        applicationId: request.application_id,
        employerIdentityId: request.employer_identity_id,
        requestId: request.request_id,
        ...fromGrpcCreateInterviewInput(request.input)
      });

      return {
        interview: toGrpcInterviewDetailMessage(interview)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'UpdateInterview')
  async updateInterview(
    request: UpdateInterviewRequest
  ): Promise<UpdateInterviewResponse> {
    try {
      const interview = await this.updateInterviewCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        interviewId: request.interview_id,
        requestId: request.request_id,
        ...fromGrpcUpdateInterviewInput(request.input)
      });

      return {
        interview: toGrpcInterviewDetailMessage(interview)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'CancelInterview')
  async cancelInterview(
    request: CancelInterviewRequest
  ): Promise<CancelInterviewResponse> {
    try {
      const interview = await this.cancelInterviewCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        interviewId: request.interview_id,
        reason: request.input.reason,
        requestId: request.request_id
      });

      return {
        interview: toGrpcInterviewDetailMessage(interview)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetCandidateInterview')
  async getCandidateInterview(
    request: GetCandidateInterviewRequest
  ): Promise<GetCandidateInterviewResponse> {
    try {
      const interview = await this.getCandidateInterviewQueryHandler.execute({
        applicationId: request.application_id,
        candidateIdentityId: request.candidate_identity_id
      });

      return {
        interview: toGrpcInterviewDetailMessage(interview)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ConfirmInterview')
  async confirmInterview(
    request: ConfirmInterviewRequest
  ): Promise<ConfirmInterviewResponse> {
    try {
      const interview = await this.confirmInterviewCommandHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        interviewId: request.interview_id,
        candidateResponseNote: request.input?.candidate_response_note,
        requestId: request.request_id
      });

      return {
        interview: toGrpcInterviewDetailMessage(interview)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'DeclineInterview')
  async declineInterview(
    request: DeclineInterviewRequest
  ): Promise<DeclineInterviewResponse> {
    try {
      const interview = await this.declineInterviewCommandHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        interviewId: request.interview_id,
        candidateResponseNote: request.input?.candidate_response_note,
        requestId: request.request_id
      });

      return {
        interview: toGrpcInterviewDetailMessage(interview)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'RequestInterviewReschedule')
  async requestInterviewReschedule(
    request: RequestInterviewRescheduleRequest
  ): Promise<RequestInterviewRescheduleResponse> {
    try {
      const interview = await this.requestInterviewRescheduleCommandHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        interviewId: request.interview_id,
        candidateResponseNote: request.input.candidate_response_note,
        proposedDate: request.input.proposed_date,
        proposedDurationMinutes: request.input.proposed_duration_minutes,
        proposedStartTime: request.input.proposed_start_time,
        proposedTimezone: request.input.proposed_timezone,
        requestId: request.request_id
      });

      return {
        interview: toGrpcInterviewDetailMessage(interview)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ListBenefitCatalog')
  async listBenefitCatalog(
    _request: ListBenefitCatalogRequest
  ): Promise<ListBenefitCatalogResponse> {
    try {
      const items = await this.listBenefitCatalogQueryHandler.execute();

      return {
        items: items.map(toGrpcBenefitCatalogMessage)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'CreateOffer')
  async createOffer(request: CreateOfferRequest): Promise<CreateOfferResponse> {
    try {
      const offer = await this.createOfferCommandHandler.execute({
        applicationId: request.application_id,
        employerIdentityId: request.employer_identity_id,
        ...fromGrpcCreateOfferInput(request.input)
      });

      return {
        offer: toGrpcOfferDetailMessage(offer)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'SendOffer')
  async sendOffer(request: SendOfferRequest): Promise<SendOfferResponse> {
    try {
      const offer = await this.sendOfferCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        offerId: request.offer_id,
        requestId: request.request_id
      });

      return {
        offer: toGrpcOfferDetailMessage(offer)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'UpdateOffer')
  async updateOffer(request: UpdateOfferRequest): Promise<UpdateOfferResponse> {
    try {
      const offer = await this.updateOfferCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        offerId: request.offer_id,
        requestId: request.request_id,
        ...fromGrpcUpdateOfferInput(request.input)
      });

      return {
        offer: toGrpcOfferDetailMessage(offer)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'SoftDeleteOffer')
  async softDeleteOffer(
    request: SoftDeleteOfferRequest
  ): Promise<SoftDeleteOfferResponse> {
    try {
      const result = await this.softDeleteOfferCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        offerId: request.offer_id,
        requestId: request.request_id
      });

      return {
        deleted: result.deleted,
        id: result.id
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ListEmployerOffers')
  async listEmployerOffers(
    request: ListEmployerOffersRequest
  ): Promise<ListEmployerOffersResponse> {
    try {
      const result = await this.listEmployerOffersQueryHandler.execute({
        employerIdentityId: request.employer_identity_id,
        page: request.page ?? 1,
        pageSize: request.page_size ?? 20,
        status: request.status,
        workModel: request.work_model
      });

      return {
        items: result.items.map(toGrpcOfferDetailMessage),
        meta: {
          page: result.meta.page,
          page_size: result.meta.pageSize,
          total: result.meta.total
        }
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ListEmployerOffersForApplication')
  async listEmployerOffersForApplication(
    request: ListEmployerOffersForApplicationRequest
  ): Promise<ListEmployerOffersForApplicationResponse> {
    try {
      const items = await this.listEmployerOffersForApplicationQueryHandler.execute({
        applicationId: request.application_id,
        employerIdentityId: request.employer_identity_id
      });

      return {
        items: items.map(toGrpcOfferDetailMessage)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetEmployerOffer')
  async getEmployerOffer(
    request: GetEmployerOfferRequest
  ): Promise<GetEmployerOfferResponse> {
    try {
      const offer = await this.getEmployerOfferQueryHandler.execute({
        employerIdentityId: request.employer_identity_id,
        offerId: request.offer_id
      });

      return {
        offer: toGrpcOfferDetailMessage(offer)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ListCandidateOffersForApplication')
  async listCandidateOffersForApplication(
    request: ListCandidateOffersForApplicationRequest
  ): Promise<ListCandidateOffersForApplicationResponse> {
    try {
      const items = await this.listCandidateOffersForApplicationQueryHandler.execute({
        applicationId: request.application_id,
        candidateIdentityId: request.candidate_identity_id
      });

      return {
        items: items.map(toGrpcOfferDetailMessage)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetCandidateOffer')
  async getCandidateOffer(
    request: GetCandidateOfferRequest
  ): Promise<GetCandidateOfferResponse> {
    try {
      const offer = await this.getCandidateOfferQueryHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        offerId: request.offer_id
      });

      return {
        offer: toGrpcOfferDetailMessage(offer)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'AcceptOffer')
  async acceptOffer(request: AcceptOfferRequest): Promise<AcceptOfferResponse> {
    try {
      const offer = await this.acceptOfferCommandHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        offerId: request.offer_id,
        note: request.input?.note,
        requestId: request.request_id
      });

      return {
        offer: toGrpcOfferDetailMessage(offer)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'DeclineOffer')
  async declineOffer(request: DeclineOfferRequest): Promise<DeclineOfferResponse> {
    try {
      const offer = await this.declineOfferCommandHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        offerId: request.offer_id,
        note: request.input?.note,
        requestId: request.request_id
      });

      return {
        offer: toGrpcOfferDetailMessage(offer)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetEmployerDashboardRecruitmentData')
  async getEmployerDashboardRecruitmentData(
    request: GetEmployerDashboardRecruitmentDataRequest
  ): Promise<GetEmployerDashboardRecruitmentDataResponse> {
    try {
      const data = await this.getEmployerDashboardRecruitmentDataQueryHandler.execute({
        employerIdentityId: request.employer_identity_id,
        localDate: request.local_date
      });

      return toGrpcEmployerDashboardRecruitmentDataResponse(data);
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'GetCandidateDashboardData')
  async getCandidateDashboardData(
    request: GetCandidateDashboardDataRequest
  ): Promise<GetCandidateDashboardDataResponse> {
    try {
      const data = await this.getCandidateDashboardDataQueryHandler.execute({
        candidateIdentityId: request.candidate_identity_id,
        localDate: request.local_date
      });

      return toGrpcCandidateDashboardDataResponse(data);
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'ListRecruiterNotes')
  async listRecruiterNotes(
    request: ListRecruiterNotesRequest
  ): Promise<ListRecruiterNotesResponse> {
    try {
      const items = await this.listRecruiterNotesQueryHandler.execute({
        applicationId: request.application_id,
        employerIdentityId: request.employer_identity_id
      });

      return {
        items: items.map(toGrpcRecruiterNoteMessage)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'CreateRecruiterNote')
  async createRecruiterNote(
    request: CreateRecruiterNoteRequest
  ): Promise<CreateRecruiterNoteResponse> {
    try {
      const note = await this.createRecruiterNoteCommandHandler.execute({
        applicationId: request.application_id,
        body: request.body,
        employerIdentityId: request.employer_identity_id
      });

      return {
        note: toGrpcRecruiterNoteMessage(note)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'UpdateRecruiterNote')
  async updateRecruiterNote(
    request: UpdateRecruiterNoteRequest
  ): Promise<UpdateRecruiterNoteResponse> {
    try {
      const note = await this.updateRecruiterNoteCommandHandler.execute({
        body: request.body,
        employerIdentityId: request.employer_identity_id,
        noteId: request.note_id
      });

      return {
        note: toGrpcRecruiterNoteMessage(note)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }

  @GrpcMethod(APPLICATION_GRPC_SERVICE_NAME, 'DeleteRecruiterNote')
  async deleteRecruiterNote(
    request: DeleteRecruiterNoteRequest
  ): Promise<DeleteRecruiterNoteResponse> {
    try {
      const result = await this.deleteRecruiterNoteCommandHandler.execute({
        employerIdentityId: request.employer_identity_id,
        noteId: request.note_id
      });

      return result;
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }
}
