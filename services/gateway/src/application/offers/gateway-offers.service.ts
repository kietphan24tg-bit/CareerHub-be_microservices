import { Injectable } from '@nestjs/common';
import type { BenefitCatalogMessage } from '@careerhub/contracts';
import { ApplicationGrpcClient } from '../../infrastructure/transport/grpc/application-grpc.client';
import {
  toGatewayHttpBenefitCatalogItem,
  toGatewayHttpOfferDetail,
  toGrpcCandidateOfferDecisionInput,
  toGrpcCreateOfferInput,
  toGrpcUpdateOfferInput
} from './mappers/gateway-offer.mapper';
import type {
  CandidateOfferDecisionRequestDto,
  CreateOfferRequestDto,
  UpdateOfferRequestDto
} from '../../presentation/http/offers/dto/offer-write.request.dto';

@Injectable()
export class GatewayOffersService {
  constructor(private readonly applicationGrpcClient: ApplicationGrpcClient) {}

  async listBenefitCatalog(requestId?: string) {
    const response = await this.applicationGrpcClient.listBenefitCatalog({}, requestId);
    return (response.items ?? []).map(toGatewayHttpBenefitCatalogItem);
  }

  async createOffer(input: {
    applicationId: string;
    dto: CreateOfferRequestDto;
    identityId: string;
    requestId?: string;
  }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.createOffer(
        {
          application_id: input.applicationId,
          employer_identity_id: input.identityId,
          input: toGrpcCreateOfferInput(input.dto)
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return toGatewayHttpOfferDetail(response.offer, catalogById);
  }

  async sendOffer(input: { identityId: string; offerId: string; requestId?: string }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.sendOffer(
        {
          employer_identity_id: input.identityId,
          offer_id: input.offerId
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return toGatewayHttpOfferDetail(response.offer, catalogById);
  }

  async updateOffer(input: {
    dto: UpdateOfferRequestDto;
    identityId: string;
    offerId: string;
    requestId?: string;
  }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.updateOffer(
        {
          employer_identity_id: input.identityId,
          input: toGrpcUpdateOfferInput(input.dto),
          offer_id: input.offerId
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return toGatewayHttpOfferDetail(response.offer, catalogById);
  }

  async softDeleteOffer(input: { identityId: string; offerId: string; requestId?: string }) {
    const result = await this.applicationGrpcClient.softDeleteOffer(
      {
        employer_identity_id: input.identityId,
        offer_id: input.offerId
      },
      input.requestId
    );

    return result;
  }

  async listEmployerOffersForApplication(input: {
    applicationId: string;
    identityId: string;
    requestId?: string;
  }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.listEmployerOffersForApplication(
        {
          application_id: input.applicationId,
          employer_identity_id: input.identityId
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return (response.items ?? []).map((offer) => toGatewayHttpOfferDetail(offer, catalogById));
  }

  async getEmployerOffer(input: { identityId: string; offerId: string; requestId?: string }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.getEmployerOffer(
        {
          employer_identity_id: input.identityId,
          offer_id: input.offerId
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return toGatewayHttpOfferDetail(response.offer, catalogById);
  }

  async listCandidateOffersForApplication(input: {
    applicationId: string;
    identityId: string;
    requestId?: string;
  }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.listCandidateOffersForApplication(
        {
          application_id: input.applicationId,
          candidate_identity_id: input.identityId
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return (response.items ?? []).map((offer) => toGatewayHttpOfferDetail(offer, catalogById));
  }

  async getCandidateOffer(input: { identityId: string; offerId: string; requestId?: string }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.getCandidateOffer(
        {
          candidate_identity_id: input.identityId,
          offer_id: input.offerId
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return toGatewayHttpOfferDetail(response.offer, catalogById);
  }

  async acceptOffer(input: {
    dto: CandidateOfferDecisionRequestDto;
    identityId: string;
    offerId: string;
    requestId?: string;
  }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.acceptOffer(
        {
          candidate_identity_id: input.identityId,
          input: toGrpcCandidateOfferDecisionInput(input.dto),
          offer_id: input.offerId
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return toGatewayHttpOfferDetail(response.offer, catalogById);
  }

  async declineOffer(input: {
    dto: CandidateOfferDecisionRequestDto;
    identityId: string;
    offerId: string;
    requestId?: string;
  }) {
    const [response, catalogById] = await Promise.all([
      this.applicationGrpcClient.declineOffer(
        {
          candidate_identity_id: input.identityId,
          input: toGrpcCandidateOfferDecisionInput(input.dto),
          offer_id: input.offerId
        },
        input.requestId
      ),
      this.loadBenefitCatalogMap(input.requestId)
    ]);

    return toGatewayHttpOfferDetail(response.offer, catalogById);
  }

  private async loadBenefitCatalogMap(requestId?: string) {
    const response = await this.applicationGrpcClient.listBenefitCatalog({}, requestId);
    const catalogById = new Map<string, BenefitCatalogMessage>();

    for (const item of response.items ?? []) {
      catalogById.set(item.id, item);
    }

    return catalogById;
  }
}
