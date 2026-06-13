import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post
} from '@nestjs/common';
import { GatewayInterviewsService } from '../../../application/interviews/gateway-interviews.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import {
  CandidateInterviewResponseRequestDto,
  CandidateRescheduleRequestDto
} from './dto/interview-write.request.dto';

@Controller()
@Roles('candidate')
export class CandidateInterviewsController {
  constructor(private readonly gatewayInterviewsService: GatewayInterviewsService) {}

  @Get('candidate/applications/:applicationId/interview')
  async getCandidateInterview(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayInterviewsService.getCandidateInterview({
        applicationId,
        identityId: user.id,
        requestId
      }),
      message: 'Interview loaded successfully'
    };
  }

  @Post('candidate/interviews/:interviewId/confirm')
  async confirmInterview(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('interviewId') interviewId: string,
    @Body() dto: CandidateInterviewResponseRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayInterviewsService.confirmInterview({
        dto,
        identityId: user.id,
        interviewId,
        requestId
      }),
      message: 'Interview confirmed successfully'
    };
  }

  @Post('candidate/interviews/:interviewId/decline')
  async declineInterview(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('interviewId') interviewId: string,
    @Body() dto: CandidateInterviewResponseRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayInterviewsService.declineInterview({
        dto,
        identityId: user.id,
        interviewId,
        requestId
      }),
      message: 'Interview declined successfully'
    };
  }

  @Post('candidate/interviews/:interviewId/request-reschedule')
  async requestReschedule(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('interviewId') interviewId: string,
    @Body() dto: CandidateRescheduleRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayInterviewsService.requestReschedule({
        dto,
        identityId: user.id,
        interviewId,
        requestId
      }),
      message: 'Interview reschedule requested successfully'
    };
  }
}
