import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { GatewayOffersService } from '../../../application/offers/gateway-offers.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import type { GatewayAuthenticatedUser } from '../../../auth/types/gateway-auth.types';
import {
  CreateOfferRequestDto,
  UpdateOfferRequestDto
} from './dto/offer-write.request.dto';
import { EmployerOffersQueryDto } from './dto/employer-offers-query.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Offers')
@ApiBearerAuth()
@Controller()
@Roles('employer')
export class EmployerOffersController {
  constructor(private readonly gatewayOffersService: GatewayOffersService) {}

  @Get('employer/offers/benefits/catalog')
  async listBenefitCatalog(@Headers('x-request-id') requestId?: string) {
    return {
      data: await this.gatewayOffersService.listBenefitCatalog(requestId),
      message: 'Offer benefit catalog loaded successfully'
    };
  }

  @Get('employer/offers')
  async listEmployerOffers(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Query() query: EmployerOffersQueryDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.listEmployerOffers({
        ...query,
        identityId: user.id,
        requestId
      }),
      message: 'Offers loaded successfully'
    };
  }

  @Post('employer/applications/:applicationId/offers')
  async createOffer(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Body() dto: CreateOfferRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.createOffer({
        applicationId,
        dto,
        identityId: user.id,
        requestId
      }),
      message: 'Offer draft created successfully'
    };
  }

  @Post('employer/offers/:offerId/send')
  async sendOffer(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('offerId') offerId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.sendOffer({
        identityId: user.id,
        offerId,
        requestId
      }),
      message: 'Offer sent successfully'
    };
  }

  @Patch('employer/offers/:offerId')
  async updateOffer(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('offerId') offerId: string,
    @Body() dto: UpdateOfferRequestDto,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.updateOffer({
        dto,
        identityId: user.id,
        offerId,
        requestId
      }),
      message: 'Offer updated successfully'
    };
  }

  @Delete('employer/offers/:offerId')
  async softDeleteOffer(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('offerId') offerId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    await this.gatewayOffersService.softDeleteOffer({
      identityId: user.id,
      offerId,
      requestId
    });

    return {
      data: null,
      message: 'Offer withdrawn successfully'
    };
  }

  @Get('employer/applications/:applicationId/offers')
  async listEmployerOffersForApplication(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('applicationId') applicationId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.listEmployerOffersForApplication({
        applicationId,
        identityId: user.id,
        requestId
      }),
      message: 'Offers loaded successfully'
    };
  }

  @Get('employer/offers/:offerId')
  async getEmployerOffer(
    @CurrentUser() user: GatewayAuthenticatedUser,
    @Param('offerId') offerId: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      data: await this.gatewayOffersService.getEmployerOffer({
        identityId: user.id,
        offerId,
        requestId
      }),
      message: 'Offer loaded successfully'
    };
  }
}
