import {
  CANDIDATE_GRPC_SERVICE_NAME,
  type CreateOrGetTemplateDraftRequest,
  type CreateOrGetTemplateDraftResponse,
  type CreateResumeRequest,
  type CreateResumeResponse,
  type DeleteResumeRequest,
  type DeleteResumeResponse,
  type GetResumeByIdRequest,
  type GetResumeByIdResponse,
  type GetResumeExportPayloadRequest,
  type GetResumeExportPayloadResponse,
  type GetResumeTemplateByIdRequest,
  type GetResumeTemplateByIdResponse,
  type ListResumeTemplatesRequest,
  type ListResumeTemplatesResponse,
  type ListResumesByIdentityIdRequest,
  type ListResumesByIdentityIdResponse,
  type UpdateResumeRequest,
  type UpdateResumeResponse
} from '@careerhub/contracts';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  CreateOrGetTemplateDraftCommandHandler,
  CreateResumeCommandHandler,
  DeleteResumeCommandHandler,
  GetResumeByIdQueryHandler,
  GetResumeExportPayloadQueryHandler,
  GetResumeTemplateByIdQueryHandler,
  ListResumeTemplatesQueryHandler,
  ListResumesByIdentityIdQueryHandler,
  UpdateResumeCommandHandler
} from '../../../application';
import { mapErrorToCandidateGrpcException } from '../mappers/grpc-error.mapper';
import {
  fromGrpcResumeContent,
  toGrpcResumeMessage,
  toGrpcResumeTemplateDetail,
  toGrpcResumeTemplateListItem
} from '../mappers/resume-grpc.mapper';

@Controller()
export class CandidateResumeGrpcController {
  constructor(
    private readonly listResumeTemplatesQueryHandler: ListResumeTemplatesQueryHandler,
    private readonly getResumeTemplateByIdQueryHandler: GetResumeTemplateByIdQueryHandler,
    private readonly listResumesByIdentityIdQueryHandler: ListResumesByIdentityIdQueryHandler,
    private readonly getResumeByIdQueryHandler: GetResumeByIdQueryHandler,
    private readonly createOrGetTemplateDraftCommandHandler: CreateOrGetTemplateDraftCommandHandler,
    private readonly createResumeCommandHandler: CreateResumeCommandHandler,
    private readonly updateResumeCommandHandler: UpdateResumeCommandHandler,
    private readonly deleteResumeCommandHandler: DeleteResumeCommandHandler,
    private readonly getResumeExportPayloadQueryHandler: GetResumeExportPayloadQueryHandler
  ) {}

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'ListResumeTemplates')
  async listResumeTemplates(
    _request: ListResumeTemplatesRequest
  ): Promise<ListResumeTemplatesResponse> {
    try {
      const templates = await this.listResumeTemplatesQueryHandler.execute();

      return {
        templates: templates.map(toGrpcResumeTemplateListItem)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'GetResumeTemplateById')
  async getResumeTemplateById(
    request: GetResumeTemplateByIdRequest
  ): Promise<GetResumeTemplateByIdResponse> {
    try {
      const template = await this.getResumeTemplateByIdQueryHandler.execute({
        templateId: request.template_id
      });

      return {
        template: toGrpcResumeTemplateDetail(template)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'ListResumesByIdentityId')
  async listResumesByIdentityId(
    request: ListResumesByIdentityIdRequest
  ): Promise<ListResumesByIdentityIdResponse> {
    try {
      const resumes = await this.listResumesByIdentityIdQueryHandler.execute({
        identityId: request.identity_id
      });

      return {
        resumes: resumes.map(toGrpcResumeMessage)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'GetResumeById')
  async getResumeById(
    request: GetResumeByIdRequest
  ): Promise<GetResumeByIdResponse> {
    try {
      const resume = await this.getResumeByIdQueryHandler.execute({
        identityId: request.identity_id,
        resumeId: request.resume_id
      });

      return {
        resume: toGrpcResumeMessage(resume)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'CreateOrGetTemplateDraft')
  async createOrGetTemplateDraft(
    request: CreateOrGetTemplateDraftRequest
  ): Promise<CreateOrGetTemplateDraftResponse> {
    try {
      const resume = await this.createOrGetTemplateDraftCommandHandler.execute({
        identityId: request.identity_id,
        templateId: request.template_id
      });

      return {
        resume: toGrpcResumeMessage(resume)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'CreateResume')
  async createResume(
    request: CreateResumeRequest
  ): Promise<CreateResumeResponse> {
    try {
      const resume = await this.createResumeCommandHandler.execute({
        content: fromGrpcResumeContent(request.content_json),
        identityId: request.identity_id,
        templateId: request.template_id,
        title: request.title
      });

      return {
        resume: toGrpcResumeMessage(resume)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'UpdateResume')
  async updateResume(
    request: UpdateResumeRequest
  ): Promise<UpdateResumeResponse> {
    try {
      const resume = await this.updateResumeCommandHandler.execute({
        content: fromGrpcResumeContent(request.content_json),
        identityId: request.identity_id,
        resumeId: request.resume_id,
        title: request.title
      });

      return {
        resume: toGrpcResumeMessage(resume)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'DeleteResume')
  async deleteResume(
    request: DeleteResumeRequest
  ): Promise<DeleteResumeResponse> {
    try {
      await this.deleteResumeCommandHandler.execute({
        identityId: request.identity_id,
        resumeId: request.resume_id
      });

      return {
        deleted: true
      } as unknown as DeleteResumeResponse;
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }

  @GrpcMethod(CANDIDATE_GRPC_SERVICE_NAME, 'GetResumeExportPayload')
  async getResumeExportPayload(
    request: GetResumeExportPayloadRequest
  ): Promise<GetResumeExportPayloadResponse> {
    try {
      const payload = await this.getResumeExportPayloadQueryHandler.execute({
        identityId: request.identity_id,
        resumeId: request.resume_id
      });

      return {
        resume: toGrpcResumeMessage(payload.resume),
        template: toGrpcResumeTemplateDetail(payload.template)
      };
    } catch (error) {
      throw mapErrorToCandidateGrpcException(error);
    }
  }
}
