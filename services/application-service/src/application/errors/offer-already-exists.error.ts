import { ApplicationError } from '@careerhub/infrastructure';

export class OfferAlreadyExistsError extends ApplicationError {
  constructor(applicationId?: string) {
    super(
      applicationId
        ? `This application already has an offer: ${applicationId}`
        : 'This application already has an offer.',
      {
        code: 'OFFER_ALREADY_EXISTS'
      }
    );
  }
}
