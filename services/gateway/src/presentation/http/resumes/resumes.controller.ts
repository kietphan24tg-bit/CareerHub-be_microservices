import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile
} from '@nestjs/common';
import { GatewayResumeExportService } from '../../../application/resumes/gateway-resume-export.service';
import { GatewayResumesService } from '../../../application/resumes/gateway-resumes.service';
import { buildResumeContentFromDto } from '../../../application/resumes/resume-content.parser';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import {
  CreateResumeRequestDto,
  UpdateResumeRequestDto
} from './dto/resume-write.request.dto';

type PdfResponse = {
  setHeader: (name: string, value: string) => void;
};

@Controller('candidate/resumes')
@Roles('candidate')
export class ResumesController {
  constructor(
    private readonly gatewayResumesService: GatewayResumesService,
    private readonly gatewayResumeExportService: GatewayResumeExportService
  ) {}

  @Get('templates')
  async listTemplates(@Headers('x-request-id') requestId?: string) {
    return {
      data: await this.gatewayResumesService.listTemplates(requestId),
      message: 'Resume templates loaded successfully'
    };
  }

  @Get('templates/:templateId')
  async getTemplateDetail(
    @Param('templateId') templateId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayResumesService.getTemplateDetail(
        templateId,
        requestId
      ),
      message: 'Resume template loaded successfully'
    };
  }

  @Post('templates/:templateId/draft')
  async createOrGetTemplateDraft(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('templateId') templateId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayResumesService.createOrGetTemplateDraft(
        user.id,
        templateId,
        requestId
      ),
      message: 'Candidate resume draft loaded successfully'
    };
  }

  @Get('export-payload/:token')
  @Public()
  async getExportPayload(@Param('token') token: string) {
    return {
      data: await this.gatewayResumeExportService.getExportPayloadByToken(token),
      message: 'Resume export payload loaded successfully'
    };
  }

  @Get()
  async listResumes(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayResumesService.listResumes(user.id, requestId),
      message: 'Candidate resumes loaded successfully'
    };
  }

  @Post()
  async createResume(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Body() dto: CreateResumeRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayResumesService.createResume({
        content: buildResumeContentFromDto(dto as never),
        identityId: user.id,
        requestId,
        templateId: dto.templateId,
        title: dto.title
      }),
      message: 'Candidate resume created successfully'
    };
  }

  @Get(':resumeId')
  async getResumeDetail(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('resumeId') resumeId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayResumesService.getResumeDetail(
        user.id,
        resumeId,
        requestId
      ),
      message: 'Candidate resume loaded successfully'
    };
  }

  @Patch(':resumeId')
  async updateResume(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('resumeId') resumeId: string,
    @Body() dto: UpdateResumeRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayResumesService.updateResume({
        content: buildResumeContentFromDto(dto as never),
        identityId: user.id,
        requestId,
        resumeId,
        title: dto.title
      }),
      message: 'Candidate resume updated successfully'
    };
  }

  @Delete(':resumeId')
  async deleteResume(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('resumeId') resumeId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    await this.gatewayResumesService.deleteResume(user.id, resumeId, requestId);

    return {
      data: null,
      message: 'Candidate resume deleted successfully'
    };
  }

  @Post(':resumeId/export-pdf')
  async exportResumePdf(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('resumeId') resumeId: string,
    @Res({ passthrough: true }) response: PdfResponse
  ): Promise<StreamableFile> {
    const { file, filename } = await this.gatewayResumeExportService.exportResumePdf(
      user.id,
      resumeId
    );

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    return file;
  }
}
