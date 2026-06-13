import { OfferOperations } from '../../../services/offer-operations.service';
import type { SoftDeleteOfferCommand } from './soft-delete-offer.command';

export class SoftDeleteOfferCommandHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(command: SoftDeleteOfferCommand) {
    return this.offerOperations.softDeleteOffer(command.employerIdentityId, command.offerId);
  }
}
