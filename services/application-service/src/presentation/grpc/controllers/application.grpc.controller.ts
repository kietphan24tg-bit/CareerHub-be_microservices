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
  type DeclineInterviewRequest,
  type DeclineInterviewResponse,
  type DeclineOfferRequest,
  type DeclineOfferResponse,
  type GetApplicationCountsByJobIdsRequest,
  type GetApplicationCountsByJobIdsResponse,
  type GetApplicationHistoryRequest,
  type GetApplicationHistoryResponse,
  type GetCandidateApplicationByIdRequest,
  type GetCandidateApplicationByIdResponse,
  type GetCandidateInterviewRequest,
  type GetCandidateInterviewResponse,
  type GetCandidateOfferRequest,
  type GetCandidateOfferResponse,
  type GetEmployerApplicationByIdRequest,
  type GetEmployerApplicationByIdResponse,
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
  type ListEmployerOffersForApplicationRequest,
  type ListEmployerOffersForApplicationResponse,
  type ListJobApplicationsRequest,
  type ListJobApplicationsResponse,
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
  DeclineInterviewCommandHandler,
  DeclineOfferCommandHandler,
  GetApplicationCountsByJobIdsQueryHandler,
  GetApplicationHistoryQueryHandler,
  GetApplicationRelatedDataQueryHandler,
  GetCandidateApplicationByIdQueryHandler,
  GetCandidateInterviewQueryHandler,
  GetCandidateOfferQueryHandler,
  GetEmployerApplicationByIdQueryHandler,
  GetEmployerOfferQueryHandler,
  ListBenefitCatalogQueryHandler,
  ListCandidateApplicationsQueryHandler,
  ListCandidateOffersForApplicationQueryHandler,
  ListEmployerInterviewsQueryHandler,
  ListEmployerOffersForApplicationQueryHandler,
  ListJobApplicationsQueryHandler,
  RequestInterviewRescheduleCommandHandler,
  SendOfferCommandHandler,
  SoftDeleteOfferCommandHandler,
  UpdateApplicationStatusCommandHandler,
  UpdateInterviewCommandHandler,
  UpdateOfferCommandHandler,
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

@Controller()
export class ApplicationGrpcController {
  constructor(
    private readonly acceptOfferCommandHandler: AcceptOfferCommandHandler,
    private readonly applyToJobCommandHandler: ApplyToJobCommandHandler,
    private readonly cancelInterviewCommandHandler: CancelInterviewCommandHandler,
    private readonly confirmInterviewCommandHandler: ConfirmInterviewCommandHandler,
    private readonly createInterviewCommandHandler: CreateInterviewCommandHandler,
    private readonly createOfferCommandHandler: CreateOfferCommandHandler,
    private readonly declineInterviewCommandHandler: DeclineInterviewCommandHandler,
    private readonly declineOfferCommandHandler: DeclineOfferCommandHandler,
    private readonly getApplicationCountsByJobIdsQueryHandler: GetApplicationCountsByJobIdsQueryHandler,
    private readonly getApplicationHistoryQueryHandler: GetApplicationHistoryQueryHandler,
    private readonly getApplicationRelatedDataQueryHandler: GetApplicationRelatedDataQueryHandler,
    private readonly getCandidateApplicationByIdQueryHandler: GetCandidateApplicationByIdQueryHandler,
    private readonly getCandidateInterviewQueryHandler: GetCandidateInterviewQueryHandler,
    private readonly getCandidateOfferQueryHandler: GetCandidateOfferQueryHandler,
    private readonly getEmployerApplicationByIdQueryHandler: GetEmployerApplicationByIdQueryHandler,
    private readonly getEmployerOfferQueryHandler: GetEmployerOfferQueryHandler,
    private readonly listBenefitCatalogQueryHandler: ListBenefitCatalogQueryHandler,
    private readonly listCandidateApplicationsQueryHandler: ListCandidateApplicationsQueryHandler,
    private readonly listCandidateOffersForApplicationQueryHandler: ListCandidateOffersForApplicationQueryHandler,
    private readonly listEmployerInterviewsQueryHandler: ListEmployerInterviewsQueryHandler,
    private readonly listEmployerOffersForApplicationQueryHandler: ListEmployerOffersForApplicationQueryHandler,
    private readonly listJobApplicationsQueryHandler: ListJobApplicationsQueryHandler,
    private readonly requestInterviewRescheduleCommandHandler: RequestInterviewRescheduleCommandHandler,
    private readonly sendOfferCommandHandler: SendOfferCommandHandler,
    private readonly softDeleteOfferCommandHandler: SoftDeleteOfferCommandHandler,
    private readonly updateApplicationStatusCommandHandler: UpdateApplicationStatusCommandHandler,
    private readonly updateInterviewCommandHandler: UpdateInterviewCommandHandler,
    private readonly updateOfferCommandHandler: UpdateOfferCommandHandler,
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
      const items = await this.listEmployerInterviewsQueryHandler.execute({
        employerIdentityId: request.employer_identity_id
      });

      return {
        items: items.map(toGrpcInterviewDetailMessage)
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
        reason: request.input.reason
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
        candidateResponseNote: request.input?.candidate_response_note
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
        candidateResponseNote: request.input?.candidate_response_note
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
        proposedTimezone: request.input.proposed_timezone
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
        offerId: request.offer_id
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
        offerId: request.offer_id
      });

      return {
        deleted: result.deleted,
        id: result.id
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
        note: request.input?.note
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
        note: request.input?.note
      });

      return {
        offer: toGrpcOfferDetailMessage(offer)
      };
    } catch (error) {
      throw mapErrorToApplicationGrpcException(error);
    }
  }
}
