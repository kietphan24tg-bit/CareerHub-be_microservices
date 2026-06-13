import { OfferOperations } from '../../../services/offer-operations.service';
import type { UpdateOfferCommand } from './update-offer.command';

export class UpdateOfferCommandHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(command: UpdateOfferCommand) {
    return this.offerOperations.updateOffer(
      command.employerIdentityId,
      command.offerId,
      command
    );
  }
}
