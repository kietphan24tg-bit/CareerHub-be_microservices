import {
  createIntegrationEvent,
  MAIL_INTERVIEW_CANCELLED_EVENT_NAME,
  MAIL_INTERVIEW_CREATED_EVENT_NAME,
  MAIL_INTERVIEW_UPDATED_EVENT_NAME,
  MAIL_OFFER_SENT_EVENT_NAME,
  type RecruitmentMailInterviewIntegrationEvent,
  type RecruitmentMailOfferIntegrationEvent
} from '@careerhub/contracts';
import { randomUUID } from 'node:crypto';
import type { ApplicationInterviewRecord, ApplicationOfferRecord } from '../ports';
import type { ApplicationMailContextQuery } from './application-mail-context.query';

export type ApplicationMailEventFactoryDeps = {
  createSourceEventId: () => string;
  mailContextQuery: ApplicationMailContextQuery;
};

export class ApplicationMailEventFactory {
  constructor(private readonly deps: ApplicationMailEventFactoryDeps) {}

  async buildInterviewCreatedMailEvent(input: {
    interview: ApplicationInterviewRecord;
    requestId?: string;
  }): Promise<RecruitmentMailInterviewIntegrationEvent | null> {
    return this.buildInterviewMailEvent({
      action: 'created',
      interview: input.interview,
      preview: 'A new interview invitation is available in your CareerHub account.',
      requestId: input.requestId,
      subject: 'CareerHub interview invitation'
    });
  }

  async buildInterviewUpdatedMailEvent(input: {
    interview: ApplicationInterviewRecord;
    requestId?: string;
  }): Promise<RecruitmentMailInterviewIntegrationEvent | null> {
    return this.buildInterviewMailEvent({
      action: 'updated',
      interview: input.interview,
      preview: 'Your interview schedule has been updated in CareerHub.',
      requestId: input.requestId,
      subject: 'CareerHub interview schedule updated'
    });
  }

  async buildInterviewCancelledMailEvent(input: {
    interview: ApplicationInterviewRecord;
    requestId?: string;
  }): Promise<RecruitmentMailInterviewIntegrationEvent | null> {
    return this.buildInterviewMailEvent({
      action: 'cancelled',
      interview: input.interview,
      preview: 'The interview has been cancelled by the employer.',
      requestId: input.requestId,
      subject: 'CareerHub interview cancelled'
    });
  }

  async buildOfferSentMailEvent(input: {
    offer: ApplicationOfferRecord;
    requestId?: string;
  }): Promise<RecruitmentMailOfferIntegrationEvent> {
    const candidateIdentityId = input.offer.candidateIdentityId;
    const mailContext = await this.deps.mailContextQuery.buildOfferMailContext(
      input.offer,
      input.requestId
    );
    const sourceEventId = this.deps.createSourceEventId();

    return createIntegrationEvent(
      MAIL_OFFER_SENT_EVENT_NAME,
      {
        appUrl: this.deps.mailContextQuery.buildOfferAppUrl(input.offer.id),
        benefits: this.deps.mailContextQuery.mapOfferBenefits(input.offer.benefits),
        bonusDetails: input.offer.bonusDetails,
        companyName: mailContext.companyName,
        contractDocumentUrl: input.offer.contractDocumentUrl,
        currency: input.offer.currency,
        departmentTeam: input.offer.departmentTeam,
        employmentType: input.offer.employmentType,
        expiresAt: input.offer.expiresAt?.toISOString() ?? null,
        location: input.offer.location,
        message: input.offer.message,
        offerId: input.offer.id,
        preview: 'A new job offer is available in your CareerHub account.',
        probationCustom: input.offer.probationCustom,
        probationType: input.offer.probationType,
        recipientIdentityId: candidateIdentityId,
        reportingTo: input.offer.reportingTo,
        salary: input.offer.salary,
        salaryPeriod: input.offer.salaryPeriod,
        seniorityLabel: input.offer.seniorityLabel,
        sourceEventId,
        startDate: input.offer.startDate,
        subject: 'CareerHub job offer received',
        title: input.offer.title,
        workModel: input.offer.workModel
      },
      input.requestId
    ) as RecruitmentMailOfferIntegrationEvent;
  }

  private async buildInterviewMailEvent(input: {
    action: 'created' | 'updated' | 'cancelled';
    interview: ApplicationInterviewRecord;
    preview: string;
    requestId?: string;
    subject: string;
  }): Promise<RecruitmentMailInterviewIntegrationEvent | null> {
    const candidateIdentityId = input.interview.candidateIdentityId;
    const employerIdentityId = input.interview.employerIdentityId;

    if (!candidateIdentityId || !employerIdentityId) {
      return null;
    }

    const mailContext = await this.deps.mailContextQuery.buildInterviewMailContext(
      input.interview,
      input.requestId
    );
    const sourceEventId = this.deps.createSourceEventId();
    const eventName =
      input.action === 'created'
        ? MAIL_INTERVIEW_CREATED_EVENT_NAME
        : input.action === 'updated'
          ? MAIL_INTERVIEW_UPDATED_EVENT_NAME
          : MAIL_INTERVIEW_CANCELLED_EVENT_NAME;

    return createIntegrationEvent(
      eventName,
      {
        appUrl: this.deps.mailContextQuery.buildInterviewAppUrl(input.interview.id),
        companyName: mailContext.companyName,
        date: input.interview.date,
        endTime: input.interview.endTime,
        interviewId: input.interview.id,
        jobTitle: mailContext.jobTitle,
        meetingLink: input.interview.meetingLink,
        platform: input.interview.platform,
        preview: input.preview,
        recipientIdentityId: candidateIdentityId,
        sourceEventId,
        startTime: input.interview.startTime,
        subject: input.subject,
        timezone: input.interview.timezone,
        type: input.interview.type
      },
      input.requestId
    ) as RecruitmentMailInterviewIntegrationEvent;
  }
}

export function createDefaultApplicationMailEventFactory(
  mailContextQuery: ApplicationMailContextQuery
): ApplicationMailEventFactory {
  return new ApplicationMailEventFactory({
    createSourceEventId: () => randomUUID(),
    mailContextQuery
  });
}
