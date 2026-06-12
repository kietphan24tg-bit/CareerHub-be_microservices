import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ResumeMessage, ResumeTemplateDetail } from '@careerhub/contracts';
import type { EnvironmentVariables } from '@careerhub/infrastructure';
import { CandidateGrpcClient } from '../../infrastructure/transport/grpc/candidate-grpc.client';
import type { GatewayEnvironmentVariables } from '../../config/gateway-env.schema';
import { parseResumeContent } from './resume-content.parser';
import {
  resolveAssetOrigin,
  resolveLayoutAssetUrls,
  toAbsoluteAssetUrl
} from './resume-asset-url.util';

export type GatewayResume = {
  address?: string | null;
  avatarUrl?: string | null;
  awards: ReturnType<typeof parseResumeContent>['awards'];
  certifications: ReturnType<typeof parseResumeContent>['certifications'];
  educations: ReturnType<typeof parseResumeContent>['educations'];
  email?: string | null;
  experiences: ReturnType<typeof parseResumeContent>['experiences'];
  fullName?: string | null;
  githubUrl?: string | null;
  headline?: string | null;
  id: string;
  isUsing: boolean;
  linkedinUrl?: string | null;
  phone?: string | null;
  portfolioUrl?: string | null;
  projects: ReturnType<typeof parseResumeContent>['projects'];
  skills: ReturnType<typeof parseResumeContent>['skills'];
  summary?: string | null;
  templateId?: string | null;
  title: string;
  updatedAt: string;
  userId: string;
};

export type GatewayResumeTemplate = {
  category?: string | null;
  id: string;
  name: string;
  thumbnail?: string | null;
};

export type GatewayResumeTemplateDetail = GatewayResumeTemplate & {
  layoutData: Record<string, unknown>;
};

function toGatewayResume(resume: ResumeMessage): GatewayResume {
  const content = parseResumeContent(resume.content_json);

  return {
    address: content.address ?? null,
    avatarUrl: content.avatarUrl ?? null,
    awards: content.awards,
    certifications: content.certifications,
    educations: content.educations,
    email: content.email ?? null,
    experiences: content.experiences,
    fullName: content.fullName ?? null,
    githubUrl: content.githubUrl ?? null,
    headline: content.headline ?? null,
    id: resume.id,
    isUsing: resume.is_using,
    linkedinUrl: content.linkedinUrl ?? null,
    phone: content.phone ?? null,
    portfolioUrl: content.portfolioUrl ?? null,
    projects: content.projects,
    skills: content.skills,
    summary: content.summary ?? null,
    templateId: resume.template_id || null,
    title: resume.title,
    updatedAt: resume.updated_at,
    userId: resume.identity_id
  };
}

function toGatewayTemplateDetail(
  template: ResumeTemplateDetail,
  assetOrigin: string
): GatewayResumeTemplateDetail {
  let layoutData: Record<string, unknown> = {};

  try {
    layoutData = JSON.parse(template.layout_data_json) as Record<string, unknown>;
  } catch {
    layoutData = {};
  }

  return {
    category: template.category || null,
    id: template.id,
    layoutData: resolveLayoutAssetUrls(layoutData, assetOrigin),
    name: template.name,
    thumbnail: toAbsoluteAssetUrl(template.thumbnail, assetOrigin)
  };
}

@Injectable()
export class GatewayResumesService {
  constructor(
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly configService: ConfigService<
      GatewayEnvironmentVariables & EnvironmentVariables,
      true
    >
  ) {}

  async listTemplates(requestId?: string): Promise<GatewayResumeTemplate[]> {
    const response = await this.candidateGrpcClient.listResumeTemplates(
      {},
      requestId
    );
    const assetOrigin = this.resolveAssetOrigin();

    return (response.templates ?? []).map((template) => ({
      category: template.category || null,
      id: template.id,
      name: template.name,
      thumbnail: toAbsoluteAssetUrl(template.thumbnail, assetOrigin)
    }));
  }

  async getTemplateDetail(
    templateId: string,
    requestId?: string
  ): Promise<GatewayResumeTemplateDetail> {
    const response = await this.candidateGrpcClient.getResumeTemplateById(
      {
        template_id: templateId
      },
      requestId
    );

    return toGatewayTemplateDetail(response.template, this.resolveAssetOrigin());
  }

  async listResumes(
    identityId: string,
    requestId?: string
  ): Promise<GatewayResume[]> {
    const response = await this.candidateGrpcClient.listResumesByIdentityId(
      {
        identity_id: identityId
      },
      requestId
    );

    return (response.resumes ?? []).map(toGatewayResume);
  }

  async getResumeDetail(
    identityId: string,
    resumeId: string,
    requestId?: string
  ): Promise<GatewayResume> {
    const response = await this.candidateGrpcClient.getResumeById(
      {
        identity_id: identityId,
        resume_id: resumeId
      },
      requestId
    );

    return toGatewayResume(response.resume);
  }

  async createOrGetTemplateDraft(
    identityId: string,
    templateId: string,
    requestId?: string
  ): Promise<GatewayResume> {
    const response = await this.candidateGrpcClient.createOrGetTemplateDraft(
      {
        identity_id: identityId,
        template_id: templateId
      },
      requestId
    );

    return toGatewayResume(response.resume);
  }

  async createResume(
    input: {
      content: ReturnType<typeof parseResumeContent>;
      identityId: string;
      templateId: string;
      title: string;
      requestId?: string;
    }
  ): Promise<GatewayResume> {
    const response = await this.candidateGrpcClient.createResume(
      {
        content_json: JSON.stringify(input.content),
        identity_id: input.identityId,
        template_id: input.templateId,
        title: input.title
      },
      input.requestId
    );

    return toGatewayResume(response.resume);
  }

  async updateResume(
    input: {
      content: ReturnType<typeof parseResumeContent>;
      identityId: string;
      resumeId: string;
      title: string;
      requestId?: string;
    }
  ): Promise<GatewayResume> {
    const response = await this.candidateGrpcClient.updateResume(
      {
        content_json: JSON.stringify(input.content),
        identity_id: input.identityId,
        resume_id: input.resumeId,
        title: input.title
      },
      input.requestId
    );

    return toGatewayResume(response.resume);
  }

  async deleteResume(
    identityId: string,
    resumeId: string,
    requestId?: string
  ): Promise<void> {
    await this.candidateGrpcClient.deleteResume(
      {
        identity_id: identityId,
        resume_id: resumeId
      },
      requestId
    );
  }

  async getExportPayload(
    identityId: string,
    resumeId: string,
    requestId?: string
  ): Promise<{
    resume: GatewayResume;
    template: GatewayResumeTemplateDetail;
  }> {
    const response = await this.candidateGrpcClient.getResumeExportPayload(
      {
        identity_id: identityId,
        resume_id: resumeId
      },
      requestId
    );

    const assetOrigin = this.resolveAssetOrigin();

    return {
      resume: toGatewayResume(response.resume),
      template: toGatewayTemplateDetail(response.template, assetOrigin)
    };
  }

  private resolveAssetOrigin(): string {
    return resolveAssetOrigin(this.configService.get('APP_BASE_URL'));
  }
}
