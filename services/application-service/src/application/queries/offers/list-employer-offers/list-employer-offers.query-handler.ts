import { OfferOperations } from '../../../services/offer-operations.service';
import type { ListEmployerOffersQuery } from './list-employer-offers.query';

export class ListEmployerOffersQueryHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(query: ListEmployerOffersQuery) {
    return this.offerOperations.listEmployerOffersPage(query);
  }
}