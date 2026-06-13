import { OfferOperations } from '../../../services/offer-operations.service';
import type { GetEmployerOfferQuery } from './get-employer-offer.query';

export class GetEmployerOfferQueryHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(query: GetEmployerOfferQuery) {
    return this.offerOperations.getEmployerOfferDetail(
      query.employerIdentityId,
      query.offerId
    );
  }
}
