import { ValidationError } from '@careerhub/shared-kernel';
import {
  APPLICATION_CREATED_EVENT_NAME,
  APPLICATION_STATUS_UPDATED_EVENT_NAME,
  createIntegrationEvent
} from '@careerhub/contracts';
import { ApplicationStatus as ApplicationStatusVO } from '../../domain';
import { ApplicationNotificationEventFactory } from '../notifications/application-notification-event.factory';
import { persistNotificationOutbox } from '../outbox/application-outbox-event.mapper';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import { DuplicateApplicationError } from '../errors/duplicate-application.error';
import { ForbiddenApplicationAccessError } from '../errors/forbidden-application-access.error';
import { InvalidApplicationStatusTransitionError } from '../errors/invalid-application-status-transition.error';
import type {
  ApplicationRecord,
  ApplicationRepository,
  ApplicationStatus,
  ApplicationWriteTransaction,
  IdGenerator
} from '../ports';

function normalizeRequired(value: string, message: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError(message);
  }

  return normalized;
}

export class ApplicationOperations {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly writeTransaction: ApplicationWriteTransaction,
    private readonly notificationEventFactory: ApplicationNotificationEventFactory,
    private readonly idGenerator: IdGenerator
  ) {}

  async applyToJob(input: {
    candidateIdentityId: string;
    coverLetter?: string | null;
    employerIdentityId: string;
    jobId: string;
    requestId?: string;
    resumeId: string;
  }): Promise<ApplicationRecord> {
    const jobId = normalizeRequired(input.jobId, 'Job id is required');
    const candidateIdentityId = normalizeRequired(
      input.candidateIdentityId,
      'Candidate identity id is required'
    );
    const employerIdentityId = normalizeRequired(
      input.employerIdentityId,
      'Employer identity id is required'
    );
    const resumeId = normalizeRequired(input.resumeId, 'Resume id is required');

    const existing = await this.applicationRepository.findByJobAndCandidate(
      jobId,
      candidateIdentityId
    );

    if (existing) {
      throw new DuplicateApplicationError(jobId, candidateIdentityId);
    }

    const applicationId = this.idGenerator.generate();

    return this.writeTransaction.execute(async (context) => {
      const application = await context.applicationRepository.create({
        candidateIdentityId,
        coverLetter: input.coverLetter?.trim() || null,
        employerIdentityId,
        id: applicationId,
        jobId,
        resumeId,
        status: 'applied'
      });

      await context.applicationRepository.createHistory({
        actorIdentityId: candidateIdentityId,
        actorType: 'candidate',
        applicationId,
        eventType: 'status_change',
        fromStatus: null,
        id: this.idGenerator.generate(),
        note: 'Candidate applied to the job.',
        toStatus: 'applied'
      });

      const notificationEvent = this.notificationEventFactory.buildApplicationReceivedEvent({
        actorIdentityId: candidateIdentityId,
        application,
        requestId: input.requestId
      });

      await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
        createOutboxId: () => this.idGenerator.generate()
      });

      await persistNotificationOutbox(
        context.outboxRepository,
        createIntegrationEvent(
          APPLICATION_CREATED_EVENT_NAME,
          {
            applicationId,
            candidateIdentityId,
            employerIdentityId,
            jobId
          },
          input.requestId
        ),
        { createOutboxId: () => this.idGenerator.generate() }
      );

      return application;
    });
  }

  async withdrawApplication(input: {
    applicationId: string;
    candidateIdentityId: string;
  }): Promise<ApplicationRecord> {
    const applicationId = normalizeRequired(input.applicationId, 'Application id is required');
    const candidateIdentityId = normalizeRequired(
      input.candidateIdentityId,
      'Candidate identity id is required'
    );

    const application = await this.applicationRepository.findById(applicationId);

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    if (application.candidateIdentityId !== candidateIdentityId) {
      throw new ForbiddenApplicationAccessError(application.id);
    }

    if (!new ApplicationStatusVO(application.status).canWithdraw()) {
      throw new InvalidApplicationStatusTransitionError(application.status, 'withdrawn');
    }

    const updated = await this.applicationRepository.transitionStatusWithHistory({
      applicationId: application.id,
      expectedStatus: application.status,
      history: {
        actorIdentityId: application.candidateIdentityId,
        actorType: 'candidate',
        applicationId: application.id,
        eventType: 'status_change',
        fromStatus: application.status,
        id: this.idGenerator.generate(),
        note: 'Candidate withdrew the application.',
        toStatus: 'withdrawn'
      },
      status: 'withdrawn'
    });

    if (!updated) {
      throw new InvalidApplicationStatusTransitionError(application.status, 'withdrawn');
    }

    return updated;
  }

  async updateEmployerStatus(input: {
    applicationId: string;
    employerIdentityId: string;
    note?: string | null;
    requestId?: string;
    status: string;
  }): Promise<ApplicationRecord> {
    const applicationId = normalizeRequired(input.applicationId, 'Application id is required');
    const employerIdentityId = normalizeRequired(
      input.employerIdentityId,
      'Employer identity id is required'
    );

    // Constructor throws ValidationError if status is invalid
    const nextStatusVO = new ApplicationStatusVO(input.status);
    const nextStatus = nextStatusVO.value;

    const application = await this.applicationRepository.findById(applicationId);

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    if (application.employerIdentityId !== employerIdentityId) {
      throw new ForbiddenApplicationAccessError(application.id);
    }

    this.assertEmployerTransition(application.status, nextStatusVO);

    const note =
      typeof input.note === 'string' && input.note.trim().length > 0
        ? input.note.trim()
        : `Employer moved application from ${application.status} to ${nextStatus}.`;

    const oldStatus = application.status;

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.applicationRepository.transitionStatusWithHistory({
        applicationId: application.id,
        expectedStatus: application.status,
        history: {
          actorIdentityId: application.employerIdentityId,
          actorType: 'employer',
          applicationId: application.id,
          eventType: 'status_change',
          fromStatus: application.status,
          id: this.idGenerator.generate(),
          note,
          toStatus: nextStatus
        },
        status: nextStatus
      });

      if (!updated) {
        throw new InvalidApplicationStatusTransitionError(application.status, nextStatus);
      }

      const notificationEvent =
        this.notificationEventFactory.buildApplicationStatusChangedEvent({
          application: updated,
          newStatus: nextStatus,
          oldStatus,
          requestId: input.requestId
        });

      await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
        createOutboxId: () => this.idGenerator.generate()
      });

      await persistNotificationOutbox(
        context.outboxRepository,
        createIntegrationEvent(
          APPLICATION_STATUS_UPDATED_EVENT_NAME,
          {
            applicationId: updated.id,
            candidateIdentityId: updated.candidateIdentityId,
            employerIdentityId: updated.employerIdentityId,
            fromStatus: oldStatus,
            jobId: updated.jobId,
            toStatus: nextStatus
          },
          input.requestId
        ),
        { createOutboxId: () => this.idGenerator.generate() }
      );

      return updated;
    });
  }

  private assertEmployerTransition(
    currentStatus: ApplicationStatus,
    nextStatusVO: ApplicationStatusVO
  ): void {
    const currentVO = new ApplicationStatusVO(currentStatus);
    if (!currentVO.canEmployerTransitionTo(nextStatusVO)) {
      throw new InvalidApplicationStatusTransitionError(currentVO.value, nextStatusVO.value);
    }
  }
}
