import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post
} from '@nestjs/common';
import { GatewayOffersService } from '../../../application/offers/gateway-offers.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CandidateOfferDecisionRequestDto } from './dto/offer-write.request.dto';

@ApiTags('Offers')
@ApiBearerAuth()
@Controller()
@Roles('candidate')
export class CandidateOffersController {
  constructor(private readonly gatewayOffersService: GatewayOffersService) {}

  @Get('candidate/applications/:applicationId/offers')
  async listCandidateOffersForApplication(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.listCandidateOffersForApplication({
        applicationId,
        identityId: user.id,
        requestId
      }),
      message: 'Offers loaded successfully'
    };
  }

  @Get('candidate/offers/:offerId')
  async getCandidateOffer(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('offerId') offerId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.getCandidateOffer({
        identityId: user.id,
        offerId,
        requestId
      }),
      message: 'Offer loaded successfully'
    };
  }

  @Post('candidate/offers/:offerId/accept')
  async acceptOffer(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('offerId') offerId: string,
    @Body() dto: CandidateOfferDecisionRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.acceptOffer({
        dto,
        identityId: user.id,
        offerId,
        requestId
      }),
      message: 'Offer accepted successfully'
    };
  }

  @Post('candidate/offers/:offerId/decline')
  async declineOffer(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('offerId') offerId: string,
    @Body() dto: CandidateOfferDecisionRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.declineOffer({
        dto,
        identityId: user.id,
        offerId,
        requestId
      }),
      message: 'Offer declined successfully'
    };
  }
}
