import { ApplicationError } from '@careerhub/infrastructure';

export class OfferSendStateInvalidError extends ApplicationError {
  constructor(message = 'Only draft offers can be sent.') {
    super(message, {
      code: 'OFFER_SEND_STATE_INVALID'
    });
  }
}
