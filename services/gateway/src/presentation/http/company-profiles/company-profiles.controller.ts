import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import { GatewayProfileService } from '../../../application/gateway-profile.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { UpdateCompanyProfileRequestDto } from './dto/update-company-profile.request.dto';

@Controller('company-profiles')
@Roles('employer')
export class CompanyProfilesController {
  constructor(
    private readonly gatewayProfileService: GatewayProfileService
  ) {}

  @Get('me')
  async getProfile(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: {
        profile: await this.gatewayProfileService.getEmployerProfile({
          identityId: user.id,
          requestId
        })
      },
      message: 'Company profile loaded successfully'
    };
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Body() dto: UpdateCompanyProfileRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: {
        profile: await this.gatewayProfileService.updateEmployerProfile({
          ...dto,
          identityId: user.id,
          requestId
        })
      },
      message: 'Company profile updated successfully'
    };
  }
}
