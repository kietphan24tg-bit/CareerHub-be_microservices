import { OfferOperations } from '../../../services/offer-operations.service';
import type { CreateOfferCommand } from './create-offer.command';

export class CreateOfferCommandHandler {
  constructor(private readonly offerOperations: OfferOperations) {}

  execute(command: CreateOfferCommand) {
    return this.offerOperations.createDraftOffer(
      command.employerIdentityId,
      command.applicationId,
      command
    );
  }
}
