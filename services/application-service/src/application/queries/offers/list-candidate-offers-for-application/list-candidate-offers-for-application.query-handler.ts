import { OfferOperations } from '../../../services/offer-operations.service';
import type { ListCandidateOffersForApplicationQuery } from './list-candidate-offers-for-application.query';

export class ListCandidateOffersForApplicationQueryHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(query: ListCandidateOffersForApplicationQuery) {
    return this.offerOperations.listCandidateOffersForApplication(
      query.candidateIdentityId,
      query.applicationId
    );
  }
}
