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
import { GatewayInterviewsService } from '../../../application/interviews/gateway-interviews.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import {
  CancelInterviewRequestDto,
  CreateInterviewRequestDto,
  UpdateInterviewRequestDto
} from './dto/interview-write.request.dto';
import { EmployerInterviewsQueryDto } from './dto/employer-interviews-query.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Interviews')
@ApiBearerAuth()
@Controller()
@Roles('employer')
export class EmployerInterviewsController {
  constructor(private readonly gatewayInterviewsService: GatewayInterviewsService) {}

  @Get('employer/interviews')
  async listEmployerInterviews(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Query() query: EmployerInterviewsQueryDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayInterviewsService.listEmployerInterviews({
        ...query,
        identityId: user.id,
        requestId
      }),
      message: 'Employer interviews loaded successfully'
    };
  }

  @Post('employer/applications/:applicationId/interviews')
  async createInterview(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateInterviewRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayInterviewsService.createInterview({
        applicationId,
        dto,
        identityId: user.id,
        requestId
      }),
      message: 'Interview created successfully'
    };
  }

  @Patch('employer/interviews/:interviewId')
  async updateInterview(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('interviewId') interviewId: string,
    @Body() dto: UpdateInterviewRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayInterviewsService.updateInterview({
        dto,
        identityId: user.id,
        interviewId,
        requestId
      }),
      message: 'Interview updated successfully'
    };
  }

  @Post('employer/interviews/:interviewId/cancel')
  async cancelInterview(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('interviewId') interviewId: string,
    @Body() dto: CancelInterviewRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayInterviewsService.cancelInterview({
        dto,
        identityId: user.id,
        interviewId,
        requestId
      }),
      message: 'Interview cancelled successfully'
    };
  }
}
