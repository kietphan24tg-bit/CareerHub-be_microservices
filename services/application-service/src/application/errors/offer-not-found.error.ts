import { ApplicationError } from '@careerhub/infrastructure';

export class OfferNotFoundError extends ApplicationError {
  constructor(offerId?: string) {
    super(offerId ? `Offer not found: ${offerId}` : 'Offer not found.', {
      code: 'OFFER_NOT_FOUND'
    });
  }
}
