import { OfferOperations } from '../../../services/offer-operations.service';
import type { SendOfferCommand } from './send-offer.command';

export class SendOfferCommandHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(command: SendOfferCommand) {
    return this.offerOperations.sendOffer(command.employerIdentityId, command.offerId);
  }
}
