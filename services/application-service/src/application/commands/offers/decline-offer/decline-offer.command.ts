import type { CandidateOfferDecisionInput } from '../../../services/offer-operations.service';

export type DeclineOfferCommand = CandidateOfferDecisionInput & {
  candidateIdentityId: string;
  offerId: string;
};
