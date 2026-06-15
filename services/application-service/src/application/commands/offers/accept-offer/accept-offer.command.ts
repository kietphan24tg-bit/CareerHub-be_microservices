import type { CandidateOfferDecisionInput } from '../../../services/offer-operations.service';

export type AcceptOfferCommand = CandidateOfferDecisionInput & {
  candidateIdentityId: string;
  offerId: string;
  requestId?: string;
};
