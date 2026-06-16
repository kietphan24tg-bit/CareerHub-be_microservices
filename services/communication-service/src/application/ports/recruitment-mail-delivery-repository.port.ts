export type RecruitmentMailDeliveryStatus = 'claimed' | 'sent' | 'failed';

export type ClaimRecruitmentMailDeliveryResult =
  | 'claimed'
  | 'duplicate_sent'
  | 'duplicate_in_flight';

export type RecruitmentMailDeliveryRepository = {
  claimDelivery(input: {
    deliveryId: string;
    eventName: string;
    now: Date;
    recipientIdentityId: string;
    sourceEventId: string;
    staleClaimCutoff: Date;
  }): Promise<ClaimRecruitmentMailDeliveryResult>;

  clearClaim(sourceEventId: string): Promise<void>;

  markFailed(sourceEventId: string, failedAt: Date, lastError: string): Promise<void>;

  markSent(sourceEventId: string, sentAt: Date): Promise<void>;
};
