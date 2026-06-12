import { Body, Controller, Delete, Get, Headers, Param, Post } from '@nestjs/common';
import { GatewaySavedJobsService } from '../../../application/saved-jobs/gateway-saved-jobs.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { SaveJobRequestDto } from './dto/save-job.request.dto';

@Controller('candidate/saved-jobs')
@Roles('candidate')
export class SavedJobsController {
  constructor(
    private readonly gatewaySavedJobsService: GatewaySavedJobsService
  ) {}

  @Get()
  async listSavedJobs(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewaySavedJobsService.listSavedJobs({
        identityId: user.id,
        requestId
      }),
      message: 'Lấy danh sách job đã lưu thành công.'
    };
  }

  @Post()
  async saveJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Body() dto: SaveJobRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewaySavedJobsService.saveJob({
        identityId: user.id,
        jobId: dto.jobId,
        requestId
      }),
      message: 'Lưu job thành công.'
    };
  }

  @Delete(':jobId')
  async removeSavedJob(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('jobId') jobId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    await this.gatewaySavedJobsService.removeSavedJob({
      identityId: user.id,
      jobId,
      requestId
    });

    return {
      data: null,
      message: 'Bỏ lưu job thành công.'
    };
  }
}
