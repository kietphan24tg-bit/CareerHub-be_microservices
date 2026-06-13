import type { CreateOfferInput } from '../../../services/offer-operations.service';

export type CreateOfferCommand = CreateOfferInput & {
  applicationId: string;
  employerIdentityId: string;
};
