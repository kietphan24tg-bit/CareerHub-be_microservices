import { Injectable } from '@nestjs/common';
import type { BenefitCatalogMessage } from '@careerhub/contracts';
import { ApplicationGrpcClient } from '../../infrastructure/transport/grpc/application-grpc.client';
import { CandidateGrpcClient } from '../../infrastructure/transport/grpc/candidate-grpc.client';
import { JobGrpcClient } from '../../infrastructure/transport/grpc/job-grpc.client';
import { toGatewayJobSummary } from '../jobs/mappers/gateway-job.mapper';
import type { GatewayJobSummary } from '../saved-jobs/ports/job-lookup.port';
import {
  toGatewayHttpBenefitCatalogItem,
  toGatewayHttpEmployerOfferListItem,
  toGatewayHttpOfferDetail,
  toGrpcCandidateOfferDecisionInput,
  toGrpcCreateOfferInput,
  toGrpcUpdateOfferInput,
  type GatewayHttpEmployerOfferListItem
} from './mappers/gateway-offer.mapper';
import type { EmployerOffersQueryDto } from '../../presentation/http/offers/dto/employer-offers-query.dto';
import type {
  CandidateOfferDecisionRequestDto,
  CreateOfferRequestDto,
  UpdateOfferRequestDto
} from '../../presentation/http/offers/dto/offer-write.request.dto';

type CandidateSnapshot = {
  fullName: string;
  id: string;
};

const SEARCH_FETCH_PAGE_SIZE = 500;

function matchesOfferSearch(item: GatewayHttpEmployerOfferListItem, search?: string) {
  const normalized = search?.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [item.candidateName, item.jobTitle, item.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

@Injectable()
export class GatewayOffersService {
  constructor(
    private readonly applicationGrpcClient: ApplicationGrpcClient,
    private readonly candidateGrpcClient: CandidateGrpcClient,
    private readonly jobGrpcClient: JobGrpcClient
  ) {}

  async listBenefitCatalog(requestId?: string) {
    const response = await this.applicationGrpcClient.listBenefitCatalog({}, requestId);
    return (response.items ?? []).map(toGatewayHttpBenefitCatalogItem);
  }

  async listEmployerOffers(
    input: EmployerOffersQueryDto & { identityId: string; requestId?: string }
  ) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const hasSearch = Boolean(input.search?.trim());
    const grpcRequest = {
      employer_identity_id: input.identityId,
      page: hasSearch ? 1 : page,
      page_size: hasSearch ? SEARCH_FETCH_PAGE_SIZE : pageSize,
      status: input.status && input.status !== 'all' ? input.status : undefined,
      work_model: input.workModel && input.workModel !== 'all' ? input.workModel : undefined
    };

    const response = await this.applicationGrpcClient.listEmployerOffers(grpcRequest, input.requestId);
    const offers = response.items ?? [];
    const enriched = await this.enrichEmployerOfferList(offers, input.requestId);

    if (!hasSearch) {
      return {
        items: enriched,
        meta: {
          page: response.meta?.page ?? page,
          pageSize: response.meta?.page_size ?? pageSize,
          total: response.meta?.total ?? enriched.length
        }
      };
    }

    const filtered = enriched.filter((item) => matchesOfferSearch(item, input.search));
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      meta: {
        page,
        pageSize,
        total: filtered.length
      }
    };
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

  private async enrichEmployerOfferList(
    offers: NonNullable<Awaited<ReturnType<ApplicationGrpcClient['listEmployerOffers']>>['items']>,
    requestId?: string
  ) {
    const [jobLookup, candidateLookup] = await Promise.all([
      this.loadJobLookup(
        offers.map((item) => item.job_id).filter((id): id is string => Boolean(id)),
        requestId
      ),
      this.loadCandidateLookup(
        offers
          .map((item) => item.candidate_identity_id)
          .filter((id): id is string => Boolean(id)),
        requestId
      )
    ]);

    return offers.map((offer) => {
      const candidate = candidateLookup.get(offer.candidate_identity_id ?? '');
      const job = jobLookup.get(offer.job_id ?? '');

      return toGatewayHttpEmployerOfferListItem({
        candidateName: candidate?.fullName || `Candidate #${offer.candidate_identity_id}`,
        jobTitle: job?.title || offer.title,
        offer
      });
    });
  }

  private async loadJobLookup(jobIds: string[], requestId?: string) {
    const uniqueJobIds = [...new Set(jobIds.filter((jobId) => jobId.trim().length > 0))];
    const lookup = new Map<string, GatewayJobSummary | null>();

    if (uniqueJobIds.length === 0) {
      return lookup;
    }

    const response = await this.jobGrpcClient.listJobsByIds({ job_ids: uniqueJobIds }, requestId);

    for (const jobId of uniqueJobIds) {
      lookup.set(jobId, null);
    }

    for (const item of response.items ?? []) {
      lookup.set(item.id, toGatewayJobSummary(item));
    }

    return lookup;
  }

  private async loadCandidateLookup(candidateIds: string[], requestId?: string) {
    const uniqueCandidateIds = [...new Set(candidateIds.filter((id) => id.trim().length > 0))];
    const lookup = new Map<string, CandidateSnapshot | null>();

    await Promise.all(
      uniqueCandidateIds.map(async (candidateId) => {
        try {
          const response = await this.candidateGrpcClient.getCandidateProfileByIdentityId(
            { identity_id: candidateId },
            requestId
          );

          lookup.set(candidateId, {
            fullName: response.profile.full_name,
            id: candidateId
          });
        } catch {
          lookup.set(candidateId, null);
        }
      })
    );

    return lookup;
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
