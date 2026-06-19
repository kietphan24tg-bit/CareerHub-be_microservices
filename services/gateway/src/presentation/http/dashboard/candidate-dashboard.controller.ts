import { Controller, Get, Headers } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GatewayDashboardService } from '../../../application/dashboard/gateway-dashboard.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('candidate/dashboard')
@Roles('candidate')
export class CandidateDashboardController {
  constructor(private readonly gatewayDashboardService: GatewayDashboardService) {}

  @Get()
  async getCandidateDashboard(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayDashboardService.getCandidateDashboard({
        identityId: user.id,
        requestId
      }),
      message: 'Candidate dashboard loaded successfully'
    };
  }
}
