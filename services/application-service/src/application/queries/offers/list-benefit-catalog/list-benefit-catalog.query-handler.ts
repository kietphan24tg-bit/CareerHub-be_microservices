import { OfferOperations } from '../../../services/offer-operations.service';

export class ListBenefitCatalogQueryHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute() {
    return this.offerOperations.listBenefitCatalog();
  }
}
