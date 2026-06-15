import {
  credentials,
  type ClientUnaryCall,
  type Metadata,
  type ServiceError
} from '@grpc/grpc-js';
import type {
  ApplyToJobRequest,
  ApplyToJobResponse,
  AcceptOfferRequest,
  AcceptOfferResponse,
  CancelInterviewRequest,
  CancelInterviewResponse,
  ConfirmInterviewRequest,
  ConfirmInterviewResponse,
  CreateInterviewRequest,
  CreateInterviewResponse,
  CreateOfferRequest,
  CreateOfferResponse,
  CreateRecruiterNoteRequest,
  CreateRecruiterNoteResponse,
  DeclineInterviewRequest,
  DeclineInterviewResponse,
  DeclineOfferRequest,
  DeclineOfferResponse,
  DeleteRecruiterNoteRequest,
  DeleteRecruiterNoteResponse,
  GetApplicationCountsByJobIdsRequest,
  GetApplicationCountsByJobIdsResponse,
  GetApplicationHistoryRequest,
  GetApplicationHistoryResponse,
  GetCandidateApplicationByIdRequest,
  GetCandidateApplicationByIdResponse,
  GetCandidateInterviewRequest,
  GetCandidateInterviewResponse,
  GetCandidateOfferRequest,
  GetCandidateOfferResponse,
  GetEmployerApplicationByIdRequest,
  GetEmployerApplicationByIdResponse,
  GetEmployerDashboardRecruitmentDataRequest,
  GetEmployerDashboardRecruitmentDataResponse,
  GetEmployerOfferRequest,
  GetEmployerOfferResponse,
  ListBenefitCatalogRequest,
  ListBenefitCatalogResponse,
  ListCandidateApplicationsRequest,
  ListCandidateApplicationsResponse,
  ListCandidateOffersForApplicationRequest,
  ListCandidateOffersForApplicationResponse,
  ListEmployerInterviewsRequest,
  ListEmployerInterviewsResponse,
  ListEmployerOffersForApplicationRequest,
  ListEmployerOffersForApplicationResponse,
  ListJobApplicationsRequest,
  ListJobApplicationsResponse,
  ListRecruiterNotesRequest,
  ListRecruiterNotesResponse,
  RequestInterviewRescheduleRequest,
  RequestInterviewRescheduleResponse,
  SendOfferRequest,
  SendOfferResponse,
  SoftDeleteOfferRequest,
  SoftDeleteOfferResponse,
  UpdateApplicationStatusRequest,
  UpdateApplicationStatusResponse,
  UpdateInterviewRequest,
  UpdateInterviewResponse,
  UpdateOfferRequest,
  UpdateOfferResponse,
  UpdateRecruiterNoteRequest,
  UpdateRecruiterNoteResponse,
  WithdrawApplicationRequest,
  WithdrawApplicationResponse
} from '@careerhub/contracts';
import {
  APPLICATION_GRPC_PACKAGE_NAME,
  APPLICATION_GRPC_SERVICE_NAME
} from '@careerhub/contracts';
import {
  mapRpcErrorToHttpException,
  runWithSpanContext,
  startSpan
} from '@careerhub/infrastructure';
import { Injectable } from '@nestjs/common';
import { SpanKind, SpanStatusCode, context } from '@opentelemetry/api';
import { GatewayGrpcClient } from './gateway-grpc.client';

type ApplicationGrpcServiceClient = {
  ApplyToJob(
    request: ApplyToJobRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ApplyToJobResponse) => void
  ): ClientUnaryCall;
  WithdrawApplication(
    request: WithdrawApplicationRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: WithdrawApplicationResponse
    ) => void
  ): ClientUnaryCall;
  UpdateApplicationStatus(
    request: UpdateApplicationStatusRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: UpdateApplicationStatusResponse
    ) => void
  ): ClientUnaryCall;
  ListCandidateApplications(
    request: ListCandidateApplicationsRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListCandidateApplicationsResponse
    ) => void
  ): ClientUnaryCall;
  GetCandidateApplicationById(
    request: GetCandidateApplicationByIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetCandidateApplicationByIdResponse
    ) => void
  ): ClientUnaryCall;
  ListJobApplications(
    request: ListJobApplicationsRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListJobApplicationsResponse
    ) => void
  ): ClientUnaryCall;
  GetEmployerApplicationById(
    request: GetEmployerApplicationByIdRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetEmployerApplicationByIdResponse
    ) => void
  ): ClientUnaryCall;
  GetApplicationHistory(
    request: GetApplicationHistoryRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetApplicationHistoryResponse
    ) => void
  ): ClientUnaryCall;
  GetApplicationCountsByJobIds(
    request: GetApplicationCountsByJobIdsRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetApplicationCountsByJobIdsResponse
    ) => void
  ): ClientUnaryCall;
  ListEmployerInterviews(
    request: ListEmployerInterviewsRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListEmployerInterviewsResponse
    ) => void
  ): ClientUnaryCall;
  CreateInterview(
    request: CreateInterviewRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: CreateInterviewResponse) => void
  ): ClientUnaryCall;
  UpdateInterview(
    request: UpdateInterviewRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: UpdateInterviewResponse) => void
  ): ClientUnaryCall;
  CancelInterview(
    request: CancelInterviewRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: CancelInterviewResponse) => void
  ): ClientUnaryCall;
  GetCandidateInterview(
    request: GetCandidateInterviewRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetCandidateInterviewResponse
    ) => void
  ): ClientUnaryCall;
  ConfirmInterview(
    request: ConfirmInterviewRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ConfirmInterviewResponse) => void
  ): ClientUnaryCall;
  DeclineInterview(
    request: DeclineInterviewRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: DeclineInterviewResponse) => void
  ): ClientUnaryCall;
  RequestInterviewReschedule(
    request: RequestInterviewRescheduleRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: RequestInterviewRescheduleResponse
    ) => void
  ): ClientUnaryCall;
  ListBenefitCatalog(
    request: ListBenefitCatalogRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: ListBenefitCatalogResponse) => void
  ): ClientUnaryCall;
  CreateOffer(
    request: CreateOfferRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: CreateOfferResponse) => void
  ): ClientUnaryCall;
  SendOffer(
    request: SendOfferRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: SendOfferResponse) => void
  ): ClientUnaryCall;
  UpdateOffer(
    request: UpdateOfferRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: UpdateOfferResponse) => void
  ): ClientUnaryCall;
  SoftDeleteOffer(
    request: SoftDeleteOfferRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: SoftDeleteOfferResponse) => void
  ): ClientUnaryCall;
  ListEmployerOffersForApplication(
    request: ListEmployerOffersForApplicationRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListEmployerOffersForApplicationResponse
    ) => void
  ): ClientUnaryCall;
  GetEmployerOffer(
    request: GetEmployerOfferRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: GetEmployerOfferResponse) => void
  ): ClientUnaryCall;
  ListCandidateOffersForApplication(
    request: ListCandidateOffersForApplicationRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListCandidateOffersForApplicationResponse
    ) => void
  ): ClientUnaryCall;
  GetCandidateOffer(
    request: GetCandidateOfferRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: GetCandidateOfferResponse) => void
  ): ClientUnaryCall;
  AcceptOffer(
    request: AcceptOfferRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: AcceptOfferResponse) => void
  ): ClientUnaryCall;
  DeclineOffer(
    request: DeclineOfferRequest,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: DeclineOfferResponse) => void
  ): ClientUnaryCall;
  GetEmployerDashboardRecruitmentData(
    request: GetEmployerDashboardRecruitmentDataRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: GetEmployerDashboardRecruitmentDataResponse
    ) => void
  ): ClientUnaryCall;
  ListRecruiterNotes(
    request: ListRecruiterNotesRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: ListRecruiterNotesResponse
    ) => void
  ): ClientUnaryCall;
  CreateRecruiterNote(
    request: CreateRecruiterNoteRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: CreateRecruiterNoteResponse
    ) => void
  ): ClientUnaryCall;
  UpdateRecruiterNote(
    request: UpdateRecruiterNoteRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: UpdateRecruiterNoteResponse
    ) => void
  ): ClientUnaryCall;
  DeleteRecruiterNote(
    request: DeleteRecruiterNoteRequest,
    metadata: Metadata,
    callback: (
      error: ServiceError | null,
      response: DeleteRecruiterNoteResponse
    ) => void
  ): ClientUnaryCall;
};

function resolveGrpcNamespace(
  packageDefinition: Record<string, unknown>,
  packageName: string
): Record<string, unknown> {
  return packageName
    .split('.')
    .reduce<Record<string, unknown>>((current, segment) => {
      const next = current[segment];

      if (!next || typeof next !== 'object') {
        throw new Error(`Unable to resolve gRPC package namespace: ${packageName}`);
      }

      return next as Record<string, unknown>;
    }, packageDefinition);
}

@Injectable()
export class ApplicationGrpcClient {
  constructor(private readonly gatewayGrpcClient: GatewayGrpcClient) {}

  private invokeUnary<TRequest, TResponse>(
    methodName: string,
    operation: (
      client: ApplicationGrpcServiceClient,
      request: TRequest,
      metadata: Metadata,
      callback: (error: ServiceError | null, response: TResponse) => void
    ) => ClientUnaryCall,
    request: TRequest,
    requestId?: string
  ): Promise<TResponse> {
    const clientFactory = this.gatewayGrpcClient.createClient('application');
    const client = this.createServiceClient();
    const parentContext = context.active();
    const span = startSpan(
      `application.${methodName}`,
      {
        attributes: {
          'rpc.method': methodName,
          'rpc.service': APPLICATION_GRPC_SERVICE_NAME,
          'rpc.system': 'grpc'
        },
        kind: SpanKind.CLIENT
      },
      parentContext
    );

    return runWithSpanContext(span, parentContext, () =>
      new Promise<TResponse>((resolve, reject) => {
        operation(client, request, clientFactory.metadata(requestId), (error, response) => {
          if (error) {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message
            });
            span.end();
            reject(mapRpcErrorToHttpException(error));
            return;
          }

          if (!response) {
            const emptyResponseError = new Error(
              'Application gRPC returned an empty response'
            );
            span.recordException(emptyResponseError);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: emptyResponseError.message
            });
            span.end();
            reject(emptyResponseError);
            return;
          }

          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          resolve(response);
        });
      })
    );
  }

  private createServiceClient(): ApplicationGrpcServiceClient {
    const clientFactory = this.gatewayGrpcClient.createClient('application');
    const packageNamespace = resolveGrpcNamespace(
      clientFactory.packageDefinition,
      APPLICATION_GRPC_PACKAGE_NAME
    );
    const ServiceCtor = packageNamespace[APPLICATION_GRPC_SERVICE_NAME] as new (
      target: string,
      channelCredentials: ReturnType<typeof credentials.createInsecure>
    ) => ApplicationGrpcServiceClient;

    if (typeof ServiceCtor !== 'function') {
      throw new Error(
        `Unable to resolve gRPC service constructor: ${APPLICATION_GRPC_SERVICE_NAME}`
      );
    }

    return new ServiceCtor(
      clientFactory.target,
      credentials.createInsecure()
    );
  }

  async applyToJob(
    request: ApplyToJobRequest,
    requestId?: string
  ): Promise<ApplyToJobResponse> {
    const grpcRequest = {
      ...request,
      candidateIdentityId: request.candidate_identity_id,
      coverLetter: request.cover_letter,
      employerIdentityId: request.employer_identity_id,
      jobId: request.job_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? '',
      resumeId: request.resume_id
    } as ApplyToJobRequest & Record<string, unknown>;

    return this.invokeUnary(
      'ApplyToJob',
      (client, payload, metadata, callback) =>
        client.ApplyToJob(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async withdrawApplication(
    request: WithdrawApplicationRequest,
    requestId?: string
  ): Promise<WithdrawApplicationResponse> {
    const grpcRequest = {
      ...request,
      applicationId: request.application_id,
      candidateIdentityId: request.candidate_identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as WithdrawApplicationRequest & Record<string, unknown>;

    return this.invokeUnary(
      'WithdrawApplication',
      (client, payload, metadata, callback) =>
        client.WithdrawApplication(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async updateApplicationStatus(
    request: UpdateApplicationStatusRequest,
    requestId?: string
  ): Promise<UpdateApplicationStatusResponse> {
    const grpcRequest = {
      ...request,
      applicationId: request.application_id,
      employerIdentityId: request.employer_identity_id,
      note: request.note,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as UpdateApplicationStatusRequest & Record<string, unknown>;

    return this.invokeUnary(
      'UpdateApplicationStatus',
      (client, payload, metadata, callback) =>
        client.UpdateApplicationStatus(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async listCandidateApplications(
    request: ListCandidateApplicationsRequest,
    requestId?: string
  ): Promise<ListCandidateApplicationsResponse> {
    const grpcRequest = {
      ...request,
      candidateIdentityId: request.candidate_identity_id,
      pageSize: request.page_size,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as ListCandidateApplicationsRequest & Record<string, unknown>;

    return this.invokeUnary(
      'ListCandidateApplications',
      (client, payload, metadata, callback) =>
        client.ListCandidateApplications(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getCandidateApplicationById(
    request: GetCandidateApplicationByIdRequest,
    requestId?: string
  ): Promise<GetCandidateApplicationByIdResponse> {
    const grpcRequest = {
      ...request,
      applicationId: request.application_id,
      candidateIdentityId: request.candidate_identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as GetCandidateApplicationByIdRequest & Record<string, unknown>;

    return this.invokeUnary(
      'GetCandidateApplicationById',
      (client, payload, metadata, callback) =>
        client.GetCandidateApplicationById(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async listJobApplications(
    request: ListJobApplicationsRequest,
    requestId?: string
  ): Promise<ListJobApplicationsResponse> {
    const grpcRequest = {
      ...request,
      employerIdentityId: request.employer_identity_id,
      jobId: request.job_id,
      pageSize: request.page_size,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as ListJobApplicationsRequest & Record<string, unknown>;

    return this.invokeUnary(
      'ListJobApplications',
      (client, payload, metadata, callback) =>
        client.ListJobApplications(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getEmployerApplicationById(
    request: GetEmployerApplicationByIdRequest,
    requestId?: string
  ): Promise<GetEmployerApplicationByIdResponse> {
    const grpcRequest = {
      ...request,
      applicationId: request.application_id,
      employerIdentityId: request.employer_identity_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as GetEmployerApplicationByIdRequest & Record<string, unknown>;

    return this.invokeUnary(
      'GetEmployerApplicationById',
      (client, payload, metadata, callback) =>
        client.GetEmployerApplicationById(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getApplicationHistory(
    request: GetApplicationHistoryRequest,
    requestId?: string
  ): Promise<GetApplicationHistoryResponse> {
    const grpcRequest = {
      ...request,
      applicationId: request.application_id,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as GetApplicationHistoryRequest & Record<string, unknown>;

    return this.invokeUnary(
      'GetApplicationHistory',
      (client, payload, metadata, callback) =>
        client.GetApplicationHistory(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async getApplicationCountsByJobIds(
    request: GetApplicationCountsByJobIdsRequest,
    requestId?: string
  ): Promise<GetApplicationCountsByJobIdsResponse> {
    const grpcRequest = {
      ...request,
      jobIds: request.job_ids,
      requestId: requestId ?? '',
      request_id: requestId ?? request.request_id ?? ''
    } as GetApplicationCountsByJobIdsRequest & Record<string, unknown>;

    return this.invokeUnary(
      'GetApplicationCountsByJobIds',
      (client, payload, metadata, callback) =>
        client.GetApplicationCountsByJobIds(payload, metadata, callback),
      grpcRequest,
      requestId
    );
  }

  async listEmployerInterviews(
    request: ListEmployerInterviewsRequest,
    requestId?: string
  ): Promise<ListEmployerInterviewsResponse> {
    return this.invokeUnary(
      'ListEmployerInterviews',
      (client, payload, metadata, callback) =>
        client.ListEmployerInterviews(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async createInterview(
    request: CreateInterviewRequest,
    requestId?: string
  ): Promise<CreateInterviewResponse> {
    return this.invokeUnary(
      'CreateInterview',
      (client, payload, metadata, callback) =>
        client.CreateInterview(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async updateInterview(
    request: UpdateInterviewRequest,
    requestId?: string
  ): Promise<UpdateInterviewResponse> {
    return this.invokeUnary(
      'UpdateInterview',
      (client, payload, metadata, callback) =>
        client.UpdateInterview(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async cancelInterview(
    request: CancelInterviewRequest,
    requestId?: string
  ): Promise<CancelInterviewResponse> {
    return this.invokeUnary(
      'CancelInterview',
      (client, payload, metadata, callback) =>
        client.CancelInterview(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async getCandidateInterview(
    request: GetCandidateInterviewRequest,
    requestId?: string
  ): Promise<GetCandidateInterviewResponse> {
    return this.invokeUnary(
      'GetCandidateInterview',
      (client, payload, metadata, callback) =>
        client.GetCandidateInterview(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async confirmInterview(
    request: ConfirmInterviewRequest,
    requestId?: string
  ): Promise<ConfirmInterviewResponse> {
    return this.invokeUnary(
      'ConfirmInterview',
      (client, payload, metadata, callback) =>
        client.ConfirmInterview(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async declineInterview(
    request: DeclineInterviewRequest,
    requestId?: string
  ): Promise<DeclineInterviewResponse> {
    return this.invokeUnary(
      'DeclineInterview',
      (client, payload, metadata, callback) =>
        client.DeclineInterview(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async requestInterviewReschedule(
    request: RequestInterviewRescheduleRequest,
    requestId?: string
  ): Promise<RequestInterviewRescheduleResponse> {
    return this.invokeUnary(
      'RequestInterviewReschedule',
      (client, payload, metadata, callback) =>
        client.RequestInterviewReschedule(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async listBenefitCatalog(
    request: ListBenefitCatalogRequest,
    requestId?: string
  ): Promise<ListBenefitCatalogResponse> {
    return this.invokeUnary(
      'ListBenefitCatalog',
      (client, payload, metadata, callback) =>
        client.ListBenefitCatalog(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async createOffer(
    request: CreateOfferRequest,
    requestId?: string
  ): Promise<CreateOfferResponse> {
    return this.invokeUnary(
      'CreateOffer',
      (client, payload, metadata, callback) =>
        client.CreateOffer(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async sendOffer(request: SendOfferRequest, requestId?: string): Promise<SendOfferResponse> {
    return this.invokeUnary(
      'SendOffer',
      (client, payload, metadata, callback) => client.SendOffer(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async updateOffer(
    request: UpdateOfferRequest,
    requestId?: string
  ): Promise<UpdateOfferResponse> {
    return this.invokeUnary(
      'UpdateOffer',
      (client, payload, metadata, callback) =>
        client.UpdateOffer(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async softDeleteOffer(
    request: SoftDeleteOfferRequest,
    requestId?: string
  ): Promise<SoftDeleteOfferResponse> {
    return this.invokeUnary(
      'SoftDeleteOffer',
      (client, payload, metadata, callback) =>
        client.SoftDeleteOffer(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async listEmployerOffersForApplication(
    request: ListEmployerOffersForApplicationRequest,
    requestId?: string
  ): Promise<ListEmployerOffersForApplicationResponse> {
    return this.invokeUnary(
      'ListEmployerOffersForApplication',
      (client, payload, metadata, callback) =>
        client.ListEmployerOffersForApplication(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async getEmployerOffer(
    request: GetEmployerOfferRequest,
    requestId?: string
  ): Promise<GetEmployerOfferResponse> {
    return this.invokeUnary(
      'GetEmployerOffer',
      (client, payload, metadata, callback) =>
        client.GetEmployerOffer(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async listCandidateOffersForApplication(
    request: ListCandidateOffersForApplicationRequest,
    requestId?: string
  ): Promise<ListCandidateOffersForApplicationResponse> {
    return this.invokeUnary(
      'ListCandidateOffersForApplication',
      (client, payload, metadata, callback) =>
        client.ListCandidateOffersForApplication(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async getCandidateOffer(
    request: GetCandidateOfferRequest,
    requestId?: string
  ): Promise<GetCandidateOfferResponse> {
    return this.invokeUnary(
      'GetCandidateOffer',
      (client, payload, metadata, callback) =>
        client.GetCandidateOffer(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async acceptOffer(
    request: AcceptOfferRequest,
    requestId?: string
  ): Promise<AcceptOfferResponse> {
    return this.invokeUnary(
      'AcceptOffer',
      (client, payload, metadata, callback) =>
        client.AcceptOffer(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async declineOffer(
    request: DeclineOfferRequest,
    requestId?: string
  ): Promise<DeclineOfferResponse> {
    return this.invokeUnary(
      'DeclineOffer',
      (client, payload, metadata, callback) =>
        client.DeclineOffer(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async getEmployerDashboardRecruitmentData(
    request: GetEmployerDashboardRecruitmentDataRequest,
    requestId?: string
  ): Promise<GetEmployerDashboardRecruitmentDataResponse> {
    return this.invokeUnary(
      'GetEmployerDashboardRecruitmentData',
      (client, payload, metadata, callback) =>
        client.GetEmployerDashboardRecruitmentData(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async listRecruiterNotes(
    request: ListRecruiterNotesRequest,
    requestId?: string
  ): Promise<ListRecruiterNotesResponse> {
    return this.invokeUnary(
      'ListRecruiterNotes',
      (client, payload, metadata, callback) =>
        client.ListRecruiterNotes(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async createRecruiterNote(
    request: CreateRecruiterNoteRequest,
    requestId?: string
  ): Promise<CreateRecruiterNoteResponse> {
    return this.invokeUnary(
      'CreateRecruiterNote',
      (client, payload, metadata, callback) =>
        client.CreateRecruiterNote(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async updateRecruiterNote(
    request: UpdateRecruiterNoteRequest,
    requestId?: string
  ): Promise<UpdateRecruiterNoteResponse> {
    return this.invokeUnary(
      'UpdateRecruiterNote',
      (client, payload, metadata, callback) =>
        client.UpdateRecruiterNote(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  async deleteRecruiterNote(
    request: DeleteRecruiterNoteRequest,
    requestId?: string
  ): Promise<DeleteRecruiterNoteResponse> {
    return this.invokeUnary(
      'DeleteRecruiterNote',
      (client, payload, metadata, callback) =>
        client.DeleteRecruiterNote(payload, metadata, callback),
      this.withRequestId(request, requestId),
      requestId
    );
  }

  private withRequestId<T extends { request_id?: string }>(
    request: T,
    requestId?: string
  ): T {
    return {
      ...request,
      request_id: requestId ?? request.request_id ?? ''
    };
  }
}
