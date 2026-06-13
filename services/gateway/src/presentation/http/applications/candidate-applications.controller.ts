import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query
} from '@nestjs/common';
import { GatewayApplicationsService } from '../../../application/applications/gateway-applications.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { ApplyToJobRequestDto } from './dto/apply-to-job.request.dto';
import { CandidateApplicationsQueryDto } from './dto/candidate-applications-query.dto';

@Controller()
@Roles('candidate')
export class CandidateApplicationsController {
  constructor(
    private readonly gatewayApplicationsService: GatewayApplicationsService
  ) {}

  @Post('candidate/jobs/:jobId/applications')
  async applyToJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: ApplyToJobRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.applyToJob({
        coverLetter: dto.coverLetter,
        identityId: user.id,
        jobId,
        requestId,
        resumeId: dto.resumeId
      }),
      message: 'Application submitted successfully'
    };
  }

  @Get('candidate/applications')
  async listCandidateApplications(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Query() query: CandidateApplicationsQueryDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.listCandidateApplications({
        identityId: user.id,
        ...query,
        requestId
      }),
      message: 'Candidate applications loaded successfully'
    };
  }

  @Get('candidate/applications/:applicationId')
  async getCandidateApplication(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.getCandidateApplication({
        applicationId,
        identityId: user.id,
        requestId
      }),
      message: 'Candidate application loaded successfully'
    };
  }

  @Post('candidate/applications/:applicationId/withdraw')
  async withdrawApplication(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.withdrawApplication({
        applicationId,
        identityId: user.id,
        requestId
      }),
      message: 'Application withdrawn successfully'
    };
  }
}
