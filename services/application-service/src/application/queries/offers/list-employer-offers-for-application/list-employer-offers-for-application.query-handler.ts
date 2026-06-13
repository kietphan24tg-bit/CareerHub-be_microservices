import { OfferOperations } from '../../../services/offer-operations.service';
import type { ListEmployerOffersForApplicationQuery } from './list-employer-offers-for-application.query';

export class ListEmployerOffersForApplicationQueryHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(query: ListEmployerOffersForApplicationQuery) {
    return this.offerOperations.listEmployerOffersForApplication(
      query.employerIdentityId,
      query.applicationId
    );
  }
}
