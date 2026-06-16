import type {
  ApplicationInterviewRecord,
  ApplicationOfferRecord,
  OfferBenefitRecord
} from '../ports';
import type { JobMailContextLookup } from '../ports/job-mail-context-lookup.port';

export type ApplicationMailContextQueryDeps = {
  appBaseUrl: string;
  jobMailContextLookup: JobMailContextLookup;
};

export class ApplicationMailContextQuery {
  constructor(private readonly deps: ApplicationMailContextQueryDeps) {}

  async buildInterviewMailContext(
    interview: ApplicationInterviewRecord,
    requestId?: string
  ): Promise<{ companyName: string; jobTitle: string }> {
    const jobContext = await this.deps.jobMailContextLookup.findByJobId(
      interview.jobId,
      requestId
    );

    return {
      companyName: jobContext?.companyName ?? 'Not specified',
      jobTitle: jobContext?.jobTitle ?? 'Not specified'
    };
  }

  async buildOfferMailContext(
    offer: ApplicationOfferRecord,
    requestId?: string
  ): Promise<{ companyName: string }> {
    const jobContext = await this.deps.jobMailContextLookup.findByJobId(
      offer.jobId,
      requestId
    );

    return {
      companyName: jobContext?.companyName ?? 'Not specified'
    };
  }

  buildInterviewAppUrl(interviewId: string): string {
    return `${this.normalizeBaseUrl()}/candidate/interviews/${interviewId}`;
  }

  buildOfferAppUrl(offerId: string): string {
    return `${this.normalizeBaseUrl()}/candidate/offers/${offerId}`;
  }

  mapOfferBenefits(benefits: OfferBenefitRecord[]) {
    return benefits.map((benefit) => ({
      amount: benefit.amount,
      annualLeaveDays: benefit.annualLeaveDays,
      currency: benefit.currency,
      description: benefit.description,
      frequency: benefit.frequency,
      hasMonetaryValue: benefit.hasMonetaryValue,
      name: benefit.name,
      type: benefit.type
    }));
  }

  private normalizeBaseUrl(): string {
    return this.deps.appBaseUrl.replace(/\/+$/, '');
  }
}
