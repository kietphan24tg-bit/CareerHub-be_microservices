import { ValidationError } from '@careerhub/shared-kernel';
import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import { DuplicateApplicationError } from '../errors/duplicate-application.error';
import { ForbiddenApplicationAccessError } from '../errors/forbidden-application-access.error';
import { InvalidApplicationStatusTransitionError } from '../errors/invalid-application-status-transition.error';
import type {
  ApplicationRecord,
  ApplicationRepository,
  ApplicationStatus,
  IdGenerator
} from '../ports';
import { APPLICATION_STATUS_VALUES } from '../ports';

const WITHDRAWABLE_STATUSES = new Set<ApplicationStatus>([
  'applied',
  'reviewed',
  'shortlisted'
]);

const EMPLOYER_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ['reviewed', 'shortlisted', 'interview', 'rejected'],
  reviewed: ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['interview', 'offer', 'rejected'],
  interview: ['reviewed', 'shortlisted', 'offer', 'rejected'],
  offer: ['interview', 'hired', 'rejected'],
  hired: [],
  rejected: [],
  withdrawn: []
};

function normalizeRequired(value: string, message: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError(message);
  }

  return normalized;
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return APPLICATION_STATUS_VALUES.includes(value as ApplicationStatus);
}

export class ApplicationOperations {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly idGenerator: IdGenerator
  ) {}

  async applyToJob(input: {
    candidateIdentityId: string;
    coverLetter?: string | null;
    employerIdentityId: string;
    jobId: string;
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

    return this.applicationRepository.createWithHistory(
      {
        candidateIdentityId,
        coverLetter: input.coverLetter?.trim() || null,
        employerIdentityId,
        id: applicationId,
        jobId,
        resumeId,
        status: 'applied'
      },
      {
        actorIdentityId: candidateIdentityId,
        actorType: 'candidate',
        applicationId,
        eventType: 'status_change',
        fromStatus: null,
        id: this.idGenerator.generate(),
        note: 'Candidate applied to the job.',
        toStatus: 'applied'
      }
    );
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

    if (!WITHDRAWABLE_STATUSES.has(application.status)) {
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
    status: string;
  }): Promise<ApplicationRecord> {
    const applicationId = normalizeRequired(input.applicationId, 'Application id is required');
    const employerIdentityId = normalizeRequired(
      input.employerIdentityId,
      'Employer identity id is required'
    );

    if (!isApplicationStatus(input.status)) {
      throw new ValidationError('Application status is invalid');
    }

    const application = await this.applicationRepository.findById(applicationId);

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    if (application.employerIdentityId !== employerIdentityId) {
      throw new ForbiddenApplicationAccessError(application.id);
    }

    this.assertEmployerTransition(application.status, input.status);

    const note =
      typeof input.note === 'string' && input.note.trim().length > 0
        ? input.note.trim()
        : `Employer moved application from ${application.status} to ${input.status}.`;

    const updated = await this.applicationRepository.transitionStatusWithHistory({
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
        toStatus: input.status
      },
      status: input.status
    });

    if (!updated) {
      throw new InvalidApplicationStatusTransitionError(application.status, input.status);
    }

    return updated;
  }

  private assertEmployerTransition(
    currentStatus: ApplicationStatus,
    nextStatus: ApplicationStatus
  ): void {
    if (currentStatus === nextStatus) {
      throw new InvalidApplicationStatusTransitionError(currentStatus, nextStatus);
    }

    if (!EMPLOYER_STATUS_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw new InvalidApplicationStatusTransitionError(currentStatus, nextStatus);
    }
  }
}
