import { ApplicationError } from '@careerhub/infrastructure';

export class OfferApplicationStateInvalidError extends ApplicationError {
  constructor(message = 'This application cannot receive a new offer.') {
    super(message, {
      code: 'OFFER_APPLICATION_STATE_INVALID'
    });
  }
}
