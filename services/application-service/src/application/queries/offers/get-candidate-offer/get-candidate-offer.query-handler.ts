import { OfferOperations } from '../../../services/offer-operations.service';
import type { GetCandidateOfferQuery } from './get-candidate-offer.query';

export class GetCandidateOfferQueryHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(query: GetCandidateOfferQuery) {
    return this.offerOperations.getCandidateOfferDetail(
      query.candidateIdentityId,
      query.offerId
    );
  }
}
