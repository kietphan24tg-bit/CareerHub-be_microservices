import type { UpdateOfferInput } from '../../../services/offer-operations.service';

export type UpdateOfferCommand = UpdateOfferInput & {
  employerIdentityId: string;
  offerId: string;
};
