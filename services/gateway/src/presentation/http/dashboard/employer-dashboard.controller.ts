import { Controller, Get, Headers } from '@nestjs/common';
import { GatewayDashboardService } from '../../../application/dashboard/gateway-dashboard.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';

@Controller('employer/dashboard')
@Roles('employer')
export class EmployerDashboardController {
  constructor(private readonly gatewayDashboardService: GatewayDashboardService) {}

  @Get()
  async getEmployerDashboard(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayDashboardService.getEmployerDashboard({
        identityId: user.id,
        requestId
      }),
      message: 'Employer dashboard loaded successfully'
    };
  }
}
