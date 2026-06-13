import { OfferOperations } from '../../../services/offer-operations.service';
import type { DeclineOfferCommand } from './decline-offer.command';

export class DeclineOfferCommandHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(command: DeclineOfferCommand) {
    return this.offerOperations.declineOffer(
      command.candidateIdentityId,
      command.offerId,
      command
    );
  }
}
