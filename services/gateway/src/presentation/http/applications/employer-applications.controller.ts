import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query
} from '@nestjs/common';
import { GatewayApplicationsService } from '../../../application/applications/gateway-applications.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { AtsBoardQueryDto } from './dto/ats-board-query.dto';
import { EmployerApplicationsQueryDto } from './dto/employer-applications-query.dto';
import { UpdateApplicationStatusRequestDto } from './dto/update-application-status.request.dto';

@Controller()
@Roles('employer')
export class EmployerApplicationsController {
  constructor(
    private readonly gatewayApplicationsService: GatewayApplicationsService
  ) {}

  @Get('employer/jobs/:jobId/applications')
  async listJobApplications(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Query() query: EmployerApplicationsQueryDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.listJobApplications({
        identityId: user.id,
        jobId,
        ...query,
        requestId
      }),
      message: 'Job applications loaded successfully'
    };
  }

  @Get('employer/applications/:applicationId')
  async getEmployerApplication(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.getEmployerApplication({
        applicationId,
        identityId: user.id,
        requestId
      }),
      message: 'Application loaded successfully'
    };
  }

  @Patch('employer/applications/:applicationId/status')
  async updateApplicationStatus(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateApplicationStatusRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.updateApplicationStatus({
        applicationId,
        identityId: user.id,
        note: dto.note,
        requestId,
        status: dto.status
      }),
      message: 'Application status updated successfully'
    };
  }

  @Get('employer/applications/:applicationId/history')
  async getApplicationHistory(
    @Param('applicationId') applicationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.getApplicationHistory({
        applicationId,
        requestId
      }),
      message: 'Application history loaded successfully'
    };
  }

  @Get('employer/ats/:jobId')
  async getAtsBoard(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Query() query: AtsBoardQueryDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayApplicationsService.getAtsBoard({
        identityId: user.id,
        jobId,
        ...query,
        requestId
      }),
      message: 'ATS board loaded successfully'
    };
  }
}
