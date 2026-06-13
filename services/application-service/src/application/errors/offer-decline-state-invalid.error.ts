import { ApplicationError } from '@careerhub/infrastructure';

export class OfferDeclineStateInvalidError extends ApplicationError {
  constructor() {
    super('This offer can no longer be declined.', {
      code: 'OFFER_DECLINE_STATE_INVALID'
    });
  }
}
