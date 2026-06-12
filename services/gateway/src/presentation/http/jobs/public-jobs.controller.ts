import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { GatewayJobsService } from '../../../application/jobs/gateway-jobs.service';
import { Public } from '../../../auth/decorators/public.decorator';
import { PublicJobsQueryDto } from './dto/public-jobs-query.dto';

@Controller('jobs')
export class PublicJobsController {
  constructor(private readonly gatewayJobsService: GatewayJobsService) {}

  @Get()
  @Public()
  async listPublicJobs(
    @Query() query: PublicJobsQueryDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.listPublicJobs({
        ...query,
        requestId
      }),
      message: 'Jobs loaded successfully'
    };
  }

  @Get(':slug')
  @Public()
  async getPublicJob(
    @Param('slug') slug: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayJobsService.getPublicJobBySlug({
        requestId,
        slug
      }),
      message: 'Job loaded successfully'
    };
  }
}
