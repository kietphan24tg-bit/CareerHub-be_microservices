import { OfferOperations } from '../../../services/offer-operations.service';
import type { AcceptOfferCommand } from './accept-offer.command';

export class AcceptOfferCommandHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(command: AcceptOfferCommand) {
    return this.offerOperations.acceptOffer(
      command.candidateIdentityId,
      command.offerId,
      command
    );
  }
}
