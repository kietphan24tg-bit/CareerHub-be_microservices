import {
  createIntegrationEvent,
  type NotificationRequestedIntegrationEvent
} from '@careerhub/contracts';
import { randomUUID } from 'node:crypto';
import type {
  ApplicationInterviewRecord,
  ApplicationOfferRecord,
  ApplicationRecord,
  ApplicationStatus
} from '../ports';

type InterviewAction =
  | 'scheduled'
  | 'updated'
  | 'cancelled'
  | 'confirmed'
  | 'declined'
  | 'requested_reschedule';

type OfferKind = 'sent' | 'updated' | 'withdrawn' | 'accepted' | 'declined';

export type ApplicationNotificationEventFactoryDeps = {
  createSourceEventId: () => string;
};

export class ApplicationNotificationEventFactory {
  constructor(private readonly deps: ApplicationNotificationEventFactoryDeps) {}

  buildApplicationReceivedEvent(input: {
    actorIdentityId: string;
    application: ApplicationRecord;
    requestId?: string;
  }): NotificationRequestedIntegrationEvent {
    return this.buildEvent({
      message: 'A candidate applied to your job posting.',
      metadata: {
        action: 'applied',
        actorUserId: input.actorIdentityId,
        applicationId: input.application.id,
        candidateUserId: input.application.candidateIdentityId,
        employerIdentityId: input.application.employerIdentityId,
        jobId: input.application.jobId,
        resumeId: input.application.resumeId
      },
      recipientIdentityId: input.application.employerIdentityId,
      requestId: input.requestId,
      title: 'New application received',
      type: 'application_received'
    });
  }

  buildApplicationStatusChangedEvent(input: {
    application: ApplicationRecord;
    newStatus: ApplicationStatus;
    oldStatus: ApplicationStatus;
    requestId?: string;
  }): NotificationRequestedIntegrationEvent {
    const content = this.buildApplicationStatusNotificationContent(input.newStatus);

    return this.buildEvent({
      message: content.message,
      metadata: {
        actorUserId: input.application.employerIdentityId,
        applicationId: input.application.id,
        candidateUserId: input.application.candidateIdentityId,
        employerIdentityId: input.application.employerIdentityId,
        jobId: input.application.jobId,
        newStatus: input.newStatus,
        oldStatus: input.oldStatus
      },
      recipientIdentityId: input.application.candidateIdentityId,
      requestId: input.requestId,
      title: content.title,
      type: 'application_status_changed'
    });
  }

  buildInterviewScheduledEvent(input: {
    actorIdentityId: string;
    interview: ApplicationInterviewRecord;
    requestId?: string;
  }): NotificationRequestedIntegrationEvent | null {
    return this.buildInterviewEvent({
      action: 'scheduled',
      actorIdentityId: input.actorIdentityId,
      interview: input.interview,
      recipientRole: 'candidate',
      requestId: input.requestId
    });
  }

  buildInterviewStatusChangedEvent(input: {
    action: Exclude<InterviewAction, 'scheduled'>;
    actorIdentityId: string;
    interview: ApplicationInterviewRecord;
    recipientRole: 'candidate' | 'employer';
    requestId?: string;
  }): NotificationRequestedIntegrationEvent | null {
    return this.buildInterviewEvent(input);
  }

  buildOfferSentEvent(input: {
    actorIdentityId: string;
    offer: ApplicationOfferRecord;
    requestId?: string;
  }): NotificationRequestedIntegrationEvent {
    return this.buildOfferEvent({
      actorIdentityId: input.actorIdentityId,
      kind: 'sent',
      offer: input.offer,
      recipientRole: 'candidate',
      requestId: input.requestId
    });
  }

  buildOfferUpdatedEvent(input: {
    actorIdentityId: string;
    offer: ApplicationOfferRecord;
    requestId?: string;
  }): NotificationRequestedIntegrationEvent {
    return this.buildOfferEvent({
      actorIdentityId: input.actorIdentityId,
      kind: 'updated',
      offer: input.offer,
      recipientRole: 'candidate',
      requestId: input.requestId
    });
  }

  buildOfferWithdrawnEvent(input: {
    actorIdentityId: string;
    offer: ApplicationOfferRecord;
    requestId?: string;
  }): NotificationRequestedIntegrationEvent {
    return this.buildOfferEvent({
      actorIdentityId: input.actorIdentityId,
      kind: 'withdrawn',
      offer: input.offer,
      recipientRole: 'candidate',
      requestId: input.requestId
    });
  }

  buildOfferAcceptedEvent(input: {
    actorIdentityId: string;
    offer: ApplicationOfferRecord;
    requestId?: string;
  }): NotificationRequestedIntegrationEvent {
    return this.buildOfferEvent({
      actorIdentityId: input.actorIdentityId,
      kind: 'accepted',
      offer: input.offer,
      recipientRole: 'employer',
      requestId: input.requestId
    });
  }

  buildOfferDeclinedEvent(input: {
    actorIdentityId: string;
    offer: ApplicationOfferRecord;
    requestId?: string;
  }): NotificationRequestedIntegrationEvent {
    return this.buildOfferEvent({
      actorIdentityId: input.actorIdentityId,
      kind: 'declined',
      offer: input.offer,
      recipientRole: 'employer',
      requestId: input.requestId
    });
  }

  private buildInterviewEvent(input: {
    action: InterviewAction;
    actorIdentityId: string;
    interview: ApplicationInterviewRecord;
    recipientRole: 'candidate' | 'employer';
    requestId?: string;
  }): NotificationRequestedIntegrationEvent | null {
    const employerIdentityId = input.interview.employerIdentityId;
    const candidateIdentityId = input.interview.candidateIdentityId;

    if (!employerIdentityId || !candidateIdentityId) {
      return null;
    }

    const content = this.buildInterviewNotificationContent(
      input.recipientRole,
      input.action
    );

    if (!content) {
      return null;
    }

    const recipientIdentityId =
      input.recipientRole === 'candidate' ? candidateIdentityId : employerIdentityId;

    return this.buildEvent({
      message: content.message,
      metadata: {
        action: input.action,
        actorUserId: input.actorIdentityId,
        applicationId: input.interview.applicationId,
        employerIdentityId,
        interviewId: input.interview.id,
        jobId: input.interview.jobId
      },
      recipientIdentityId,
      requestId: input.requestId,
      title: content.title,
      type:
        input.action === 'scheduled' ? 'interview_scheduled' : 'interview_status_changed'
    });
  }

  private buildOfferEvent(input: {
    actorIdentityId: string;
    kind: OfferKind;
    offer: ApplicationOfferRecord;
    recipientRole: 'candidate' | 'employer';
    requestId?: string;
  }): NotificationRequestedIntegrationEvent {
    const content = this.buildOfferNotificationContent(input.recipientRole, input.kind);
    const recipientIdentityId =
      input.recipientRole === 'candidate'
        ? input.offer.candidateIdentityId
        : input.offer.employerIdentityId;

    return this.buildEvent({
      message: content.message,
      metadata: {
        actorUserId: input.actorIdentityId,
        applicationId: input.offer.applicationId,
        employerIdentityId: input.offer.employerIdentityId,
        jobId: input.offer.jobId,
        kind: input.kind,
        offerId: input.offer.id
      },
      recipientIdentityId,
      requestId: input.requestId,
      title: content.title,
      type: `offer_${input.kind}`
    });
  }

  private buildEvent(input: {
    message: string;
    metadata: Record<string, unknown>;
    recipientIdentityId: string;
    requestId?: string;
    title: string;
    type: string;
  }): NotificationRequestedIntegrationEvent {
    const sourceEventId = this.deps.createSourceEventId();

    return createIntegrationEvent(
      this.resolveEventName(input.type),
      {
        message: input.message,
        metadata: input.metadata,
        recipientIdentityId: input.recipientIdentityId,
        sourceEventId,
        title: input.title,
        type: input.type
      },
      input.requestId
    ) as NotificationRequestedIntegrationEvent;
  }

  private resolveEventName(
    type: string
  ): NotificationRequestedIntegrationEvent['name'] {
    const mapping: Record<string, NotificationRequestedIntegrationEvent['name']> = {
      application_received: 'notifications.application-received.v1',
      application_status_changed: 'notifications.application-status-changed.v1',
      interview_scheduled: 'notifications.interview-scheduled.v1',
      interview_status_changed: 'notifications.interview-status-changed.v1',
      offer_accepted: 'notifications.offer-accepted.v1',
      offer_declined: 'notifications.offer-declined.v1',
      offer_sent: 'notifications.offer-sent.v1',
      offer_updated: 'notifications.offer-updated.v1',
      offer_withdrawn: 'notifications.offer-withdrawn.v1'
    };

    const eventName = mapping[type];
    if (!eventName) {
      throw new Error(`Unsupported notification type: ${type}`);
    }

    return eventName;
  }

  private buildInterviewNotificationContent(
    role: 'candidate' | 'employer',
    action: InterviewAction
  ) {
    const candidateMessages = {
      cancelled: {
        message: 'The employer cancelled your interview.',
        title: 'Interview cancelled'
      },
      scheduled: {
        message: 'You received a new interview invitation.',
        title: 'Interview invitation'
      },
      updated: {
        message: 'Your interview details were updated.',
        title: 'Interview updated'
      }
    };
    const employerMessages = {
      confirmed: {
        message: 'The candidate confirmed interview attendance.',
        title: 'Interview confirmed'
      },
      declined: {
        message: 'The candidate declined the interview.',
        title: 'Interview declined'
      },
      requested_reschedule: {
        message: 'The candidate requested a different interview slot.',
        title: 'Interview reschedule requested'
      }
    };

    return role === 'candidate'
      ? candidateMessages[action as keyof typeof candidateMessages]
      : employerMessages[action as keyof typeof employerMessages];
  }

  private buildOfferNotificationContent(role: 'candidate' | 'employer', kind: OfferKind) {
    if (role === 'candidate') {
      switch (kind) {
        case 'sent':
          return {
            message: 'You have received a new job offer.',
            title: 'Offer received'
          };
        case 'updated':
          return {
            message: 'Your job offer has been updated by the employer.',
            title: 'Offer updated'
          };
        case 'withdrawn':
          return {
            message: 'The employer has withdrawn a job offer.',
            title: 'Offer withdrawn'
          };
        default:
          return {
            message: 'Your offer status has changed.',
            title: 'Offer update'
          };
      }
    }

    switch (kind) {
      case 'accepted':
        return {
          message: 'The candidate accepted your job offer.',
          title: 'Offer accepted'
        };
      case 'declined':
        return {
          message: 'The candidate declined your job offer.',
          title: 'Offer declined'
        };
      default:
        return {
          message: 'Your offer has been updated.',
          title: 'Offer update'
        };
    }
  }

  private buildApplicationStatusNotificationContent(status: string) {
    switch (status) {
      case 'reviewed':
        return {
          message: 'Your application is now under review.',
          title: 'Application reviewed'
        };
      case 'shortlisted':
        return {
          message: 'You have been shortlisted for this job.',
          title: 'Application shortlisted'
        };
      case 'rejected':
        return {
          message: 'Your application was not selected for the next stage.',
          title: 'Application rejected'
        };
      case 'hired':
        return {
          message: 'Your application has been marked as hired.',
          title: 'Application hired'
        };
      case 'withdrawn':
        return {
          message: 'Your application has been withdrawn.',
          title: 'Application withdrawn'
        };
      default:
        return {
          message: 'Your application status has changed.',
          title: 'Application updated'
        };
    }
  }
}

export function createDefaultApplicationNotificationEventFactory(): ApplicationNotificationEventFactory {
  return new ApplicationNotificationEventFactory({
    createSourceEventId: () => randomUUID()
  });
}
