import { ApplicationError } from '@careerhub/infrastructure';

export class OfferAcceptStateInvalidError extends ApplicationError {
  constructor() {
    super('This offer can no longer be accepted.', {
      code: 'OFFER_ACCEPT_STATE_INVALID'
    });
  }
}
