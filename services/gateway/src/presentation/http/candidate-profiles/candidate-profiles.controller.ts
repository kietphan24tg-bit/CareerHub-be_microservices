import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GatewayProfileService } from '../../../application/profiles/gateway-profile.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { UpdateCandidateProfileRequestDto } from './dto/update-candidate-profile.request.dto';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('candidate/profile')
@Roles('candidate')
export class CandidateProfilesController {
  constructor(
    private readonly gatewayProfileService: GatewayProfileService
  ) {}

  @Get()
  async getProfile(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: {
        profile: await this.gatewayProfileService.getCandidateProfile({
          identityId: user.id,
          requestId
        })
      },
      message: 'Candidate profile loaded successfully'
    };
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Body() dto: UpdateCandidateProfileRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: {
        profile: await this.gatewayProfileService.updateCandidateProfile({
          ...dto,
          identityId: user.id,
          requestId
        })
      },
      message: 'Candidate profile updated successfully'
    };
  }
}
