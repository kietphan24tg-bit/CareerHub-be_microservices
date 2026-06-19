import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { GatewayJobsService } from '../../../application/jobs/gateway-jobs.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { CreateJobRequestDto } from './dto/create-job.request.dto';
import { EmployerJobsQueryDto } from './dto/employer-jobs-query.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateJobRequestDto } from './dto/update-job.request.dto';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('employer/jobs')
@Roles('employer')
export class EmployerJobsController {
  constructor(private readonly gatewayJobsService: GatewayJobsService) {}

  @Get()
  async listEmployerJobs(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Query() query: EmployerJobsQueryDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.listEmployerJobs({
        identityId: user.id,
        ...query,
        requestId
      }),
      message: 'Employer jobs loaded successfully'
    };
  }

  @Post()
  async createEmployerJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Body() dto: CreateJobRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.createEmployerJob({
        identityId: user.id,
        ...dto,
        requestId
      }),
      message: 'Job created successfully'
    };
  }

  @Get(':jobId')
  async getEmployerJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.getEmployerJob({
        identityId: user.id,
        jobId,
        requestId
      }),
      message: 'Employer job loaded successfully'
    };
  }

  @Patch(':jobId')
  async updateEmployerJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateJobRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.updateEmployerJob({
        identityId: user.id,
        jobId,
        ...dto,
        requestId
      }),
      message: 'Job updated successfully'
    };
  }

  @Post(':jobId/publish')
  async publishEmployerJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.publishEmployerJob({
        identityId: user.id,
        jobId,
        requestId
      }),
      message: 'Job published successfully'
    };
  }

  @Post(':jobId/close')
  async closeEmployerJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.closeEmployerJob({
        identityId: user.id,
        jobId,
        requestId
      }),
      message: 'Job closed successfully'
    };
  }

  @Post(':jobId/archive')
  async archiveEmployerJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.archiveEmployerJob({
        identityId: user.id,
        jobId,
        requestId
      }),
      message: 'Job archived successfully'
    };
  }

  @Post(':jobId/reopen')
  async reopenEmployerJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.reopenEmployerJob({
        identityId: user.id,
        jobId,
        requestId
      }),
      message: 'Job reopened successfully'
    };
  }
}
