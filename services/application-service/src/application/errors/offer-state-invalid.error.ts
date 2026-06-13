import { ApplicationError } from '@careerhub/infrastructure';

export class OfferStateInvalidError extends ApplicationError {
  constructor(message = 'This offer can no longer be changed or withdrawn.') {
    super(message, {
      code: 'OFFER_STATE_INVALID'
    });
  }
}
