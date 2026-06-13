import type {
  ApplicationInterviewRecord,
  ApplicationOfferRecord,
  ApplicationRepository
} from '../../ports';

export type ApplicationRelatedData = {
  interview: ApplicationInterviewRecord | null;
  offer: ApplicationOfferRecord | null;
};

export class GetApplicationRelatedDataQueryHandler {
  constructor(private readonly applicationRepository: ApplicationRepository) {}

  async execute(applicationId: string): Promise<ApplicationRelatedData> {
    const [interview, offer] = await Promise.all([
      this.applicationRepository.findLatestInterviewByApplicationId(applicationId),
      this.applicationRepository.findLatestOfferByApplicationId(applicationId)
    ]);

    return {
      interview,
      offer
    };
  }

  async executeBatch(applicationIds: string[]): Promise<Map<string, ApplicationRelatedData>> {
    const uniqueApplicationIds = [...new Set(applicationIds.filter((id) => id.trim().length > 0))];
    const result = new Map<string, ApplicationRelatedData>();

    for (const applicationId of uniqueApplicationIds) {
      result.set(applicationId, {
        interview: null,
        offer: null
      });
    }

    if (uniqueApplicationIds.length === 0) {
      return result;
    }

    const [interviews, offers] = await Promise.all([
      this.applicationRepository.listLatestInterviewsByApplicationIds(uniqueApplicationIds),
      this.applicationRepository.listLatestOffersByApplicationIds(uniqueApplicationIds)
    ]);

    for (const interview of interviews) {
      const existing = result.get(interview.applicationId);
      if (existing) {
        existing.interview = interview;
      }
    }

    for (const offer of offers) {
      const existing = result.get(offer.applicationId);
      if (existing) {
        existing.offer = offer;
      }
    }

    return result;
  }
}
