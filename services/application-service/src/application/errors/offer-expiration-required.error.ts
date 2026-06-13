import { ApplicationError } from '@careerhub/infrastructure';

export class OfferExpirationRequiredError extends ApplicationError {
  constructor() {
    super('Offer response deadline is required before sending.', {
      code: 'OFFER_EXPIRATION_REQUIRED'
    });
  }
}
