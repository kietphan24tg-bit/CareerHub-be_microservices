import { ApplicationNotFoundError } from '../errors/application-not-found.error';
import { OfferAcceptStateInvalidError } from '../errors/offer-accept-state-invalid.error';
import { OfferAlreadyExistsError } from '../errors/offer-already-exists.error';
import { OfferApplicationStateInvalidError } from '../errors/offer-application-state-invalid.error';
import { OfferDeclineStateInvalidError } from '../errors/offer-decline-state-invalid.error';
import { OfferExpirationRequiredError } from '../errors/offer-expiration-required.error';
import { OfferNotFoundError } from '../errors/offer-not-found.error';
import { OfferSendStateInvalidError } from '../errors/offer-send-state-invalid.error';
import { OfferStateInvalidError } from '../errors/offer-state-invalid.error';
import { ApplicationNotificationEventFactory } from '../notifications/application-notification-event.factory';
import { persistNotificationOutbox } from '../outbox/application-outbox-event.mapper';
import type {
  ApplicationOfferRecord,
  ApplicationRepository,
  ApplicationStatus,
  ApplicationWriteTransaction,
  BenefitCatalogRecord,
  IdGenerator,
  RecruitmentRepository
} from '../ports';
import { TERMINAL_APPLICATION_STATUSES, normalizeNullableString } from './interview-schedule.utils';
import {
  EMPLOYER_MUTABLE_OFFER_STATUSES,
  OFFER_STATUS,
  buildOfferBenefitCreateRows,
  toDateEndOfDay,
  toDateOnlyOrThrow,
  validateBenefitInputs,
  validateOfferPayload,
  type OfferBenefitInput,
  type OfferPayloadInput
} from './offer-validation.utils';

export type CreateOfferInput = OfferPayloadInput & {
  benefits?: OfferBenefitInput[];
  employmentType?: string | null;
  title: string;
};

export type UpdateOfferInput = OfferPayloadInput & {
  benefits?: OfferBenefitInput[];
  employmentType?: string | null;
  title?: string;
};

export type CandidateOfferDecisionInput = {
  note?: string | null;
};

function lifecycleHistoryStatus(status: ApplicationStatus): {
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
} {
  return {
    fromStatus: status,
    toStatus: status
  };
}

export class OfferOperations {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly recruitmentRepository: RecruitmentRepository,
    private readonly writeTransaction: ApplicationWriteTransaction,
    private readonly notificationEventFactory: ApplicationNotificationEventFactory,
    private readonly idGenerator: IdGenerator
  ) {}

  async listBenefitCatalog(): Promise<BenefitCatalogRecord[]> {
    return this.recruitmentRepository.listBenefitCatalog();
  }

  async createDraftOffer(
    employerIdentityId: string,
    applicationId: string,
    input: CreateOfferInput
  ): Promise<ApplicationOfferRecord> {
    const application = await this.applicationRepository.findByIdAndEmployer(
      applicationId.trim(),
      employerIdentityId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    if (TERMINAL_APPLICATION_STATUSES.has(application.status)) {
      throw new OfferApplicationStateInvalidError();
    }

    const existingOffer = await this.recruitmentRepository.findOfferByApplicationId(application.id);
    if (existingOffer) {
      throw new OfferAlreadyExistsError(application.id);
    }

    const benefitCatalog = await this.recruitmentRepository.listBenefitCatalog();
    const benefitCatalogMap = new Map(benefitCatalog.map((row) => [row.code, row] as const));

    validateOfferPayload(input, true);
    validateBenefitInputs(input.benefits, benefitCatalogMap);

    const offerId = this.idGenerator.generate();
    const benefits = buildOfferBenefitCreateRows(
      offerId,
      input.benefits ?? [],
      benefitCatalogMap,
      () => this.idGenerator.generate()
    );

    const offer = await this.recruitmentRepository.createOffer(
      {
        applicationId: application.id,
        bonusDetails: normalizeNullableString(input.bonusDetails),
        candidateIdentityId: application.candidateIdentityId,
        contractDocumentUrl: normalizeNullableString(input.contractDocumentUrl),
        createdByIdentityId: employerIdentityId.trim(),
        currency: normalizeNullableString(input.currency),
        departmentTeam: normalizeNullableString(input.departmentTeam),
        employerIdentityId: application.employerIdentityId,
        employmentType: input.employmentType ?? null,
        expiresAt: input.offerExpiresAt ? toDateEndOfDay(input.offerExpiresAt) : null,
        id: offerId,
        jobId: application.jobId,
        location: normalizeNullableString(input.location),
        message: normalizeNullableString(input.message),
        probationCustom: normalizeNullableString(input.probationCustom),
        probationType: input.probationType ?? null,
        reportingTo: normalizeNullableString(input.reportingTo),
        salary:
          input.salary === undefined || input.salary === null ? null : String(input.salary),
        salaryPeriod: input.salaryPeriod ?? null,
        seniorityLabel: normalizeNullableString(input.seniorityLabel),
        startDate: input.startDate ? toDateOnlyOrThrow(input.startDate) : null,
        status: OFFER_STATUS.draft,
        title: input.title.trim(),
        workModel: input.workModel ?? null
      },
      benefits
    );

    const historyStatus = lifecycleHistoryStatus(application.status);
    await this.applicationRepository.createHistory({
      actorIdentityId: employerIdentityId.trim(),
      actorType: 'employer',
      applicationId: application.id,
      eventType: 'offer_created',
      fromStatus: historyStatus.fromStatus,
      id: this.idGenerator.generate(),
      note: `Employer created offer draft #${offer.id}.`,
      toStatus: historyStatus.toStatus
    });

    return offer;
  }

  async sendOffer(
    employerIdentityId: string,
    offerId: string,
    requestId?: string
  ): Promise<ApplicationOfferRecord> {
    const offer = await this.recruitmentRepository.findOfferByIdAndEmployer(
      offerId.trim(),
      employerIdentityId.trim()
    );

    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    if (offer.status !== OFFER_STATUS.draft) {
      throw new OfferSendStateInvalidError();
    }

    if (!offer.expiresAt) {
      throw new OfferExpirationRequiredError();
    }

    const application = await this.applicationRepository.findById(offer.applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(offer.applicationId);
    }

    if (TERMINAL_APPLICATION_STATUSES.has(application.status)) {
      throw new OfferApplicationStateInvalidError('Cannot send an offer for a closed application.');
    }

    const now = new Date();
    const normalizedEmployerIdentityId = employerIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateOfferIfStatus(
        offer.id,
        [OFFER_STATUS.draft],
        {
          sentAt: now,
          status: OFFER_STATUS.sent
        }
      );

      if (!updated) {
        throw new OfferSendStateInvalidError();
      }

      if (application.status !== 'offer') {
        await context.applicationRepository.updateStatus(application.id, 'offer');
        await context.applicationRepository.createHistory({
          actorIdentityId: normalizedEmployerIdentityId,
          actorType: 'employer',
          applicationId: application.id,
          eventType: 'status_change',
          fromStatus: application.status,
          id: this.idGenerator.generate(),
          note: 'Application moved to offer stage when the offer was sent.',
          toStatus: 'offer'
        });
      }

      const historyStatus = lifecycleHistoryStatus('offer');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedEmployerIdentityId,
        actorType: 'employer',
        applicationId: application.id,
        eventType: 'offer_sent',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: `Offer #${offer.id} was sent to the candidate.`,
        toStatus: historyStatus.toStatus
      });

      const notificationEvent = this.notificationEventFactory.buildOfferSentEvent({
        actorIdentityId: normalizedEmployerIdentityId,
        offer: updated,
        requestId
      });

      await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
        createOutboxId: () => this.idGenerator.generate()
      });

      return updated;
    });
  }

  async updateOffer(
    employerIdentityId: string,
    offerId: string,
    input: UpdateOfferInput & { requestId?: string }
  ): Promise<ApplicationOfferRecord> {
    await this.recruitmentRepository.expireOfferIfDue(offerId.trim(), new Date());

    const offer = await this.recruitmentRepository.findOfferByIdAndEmployer(
      offerId.trim(),
      employerIdentityId.trim()
    );

    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    this.ensureEmployerCanMutateOffer(offer.status);

    const benefitCatalog = await this.recruitmentRepository.listBenefitCatalog();
    const benefitCatalogMap = new Map(benefitCatalog.map((row) => [row.code, row] as const));

    validateOfferPayload(input, false);
    if (input.benefits !== undefined) {
      validateBenefitInputs(input.benefits, benefitCatalogMap);
    }

    const benefits =
      input.benefits === undefined
        ? undefined
        : buildOfferBenefitCreateRows(
            offer.id,
            input.benefits,
            benefitCatalogMap,
            () => this.idGenerator.generate()
          );

    const normalizedEmployerIdentityId = employerIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateOfferIfStatus(
        offer.id,
        [offer.status],
        {
          bonusDetails:
            input.bonusDetails === undefined
              ? undefined
              : normalizeNullableString(input.bonusDetails),
          contractDocumentUrl:
            input.contractDocumentUrl === undefined
              ? undefined
              : normalizeNullableString(input.contractDocumentUrl),
          currency:
            input.currency === undefined ? undefined : normalizeNullableString(input.currency),
          departmentTeam:
            input.departmentTeam === undefined
              ? undefined
              : normalizeNullableString(input.departmentTeam),
          employmentType: input.employmentType === undefined ? undefined : input.employmentType,
          expiresAt:
            input.offerExpiresAt === undefined
              ? undefined
              : input.offerExpiresAt
                ? toDateEndOfDay(input.offerExpiresAt)
                : null,
          location:
            input.location === undefined ? undefined : normalizeNullableString(input.location),
          message: input.message === undefined ? undefined : normalizeNullableString(input.message),
          probationCustom:
            input.probationCustom === undefined
              ? undefined
              : normalizeNullableString(input.probationCustom),
          probationType: input.probationType === undefined ? undefined : input.probationType,
          reportingTo:
            input.reportingTo === undefined ? undefined : normalizeNullableString(input.reportingTo),
          salary:
            input.salary === undefined
              ? undefined
              : input.salary === null
                ? null
                : String(input.salary),
          salaryPeriod: input.salaryPeriod === undefined ? undefined : input.salaryPeriod,
          seniorityLabel:
            input.seniorityLabel === undefined
              ? undefined
              : normalizeNullableString(input.seniorityLabel),
          startDate:
            input.startDate === undefined
              ? undefined
              : input.startDate
                ? toDateOnlyOrThrow(input.startDate)
                : null,
          title: input.title === undefined ? undefined : input.title.trim(),
          workModel: input.workModel === undefined ? undefined : input.workModel
        },
        benefits
      );

      if (!updated) {
        throw new OfferStateInvalidError();
      }

      const application = await context.applicationRepository.findById(offer.applicationId);
      const historyStatus = lifecycleHistoryStatus(application?.status ?? 'offer');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedEmployerIdentityId,
        actorType: 'employer',
        applicationId: offer.applicationId,
        eventType: 'note_added',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: `Employer updated offer #${offer.id}.`,
        toStatus: historyStatus.toStatus
      });

      const notificationEvent = this.notificationEventFactory.buildOfferUpdatedEvent({
        actorIdentityId: normalizedEmployerIdentityId,
        offer: updated,
        requestId: input.requestId
      });

      await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
        createOutboxId: () => this.idGenerator.generate()
      });

      return updated;
    });
  }

  async softDeleteOffer(
    employerIdentityId: string,
    offerId: string,
    requestId?: string
  ): Promise<{ deleted: boolean; id: string }> {
    await this.recruitmentRepository.expireOfferIfDue(offerId.trim(), new Date());

    const offer = await this.recruitmentRepository.findOfferByIdAndEmployer(
      offerId.trim(),
      employerIdentityId.trim()
    );

    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    this.ensureEmployerCanMutateOffer(offer.status);

    const now = new Date();
    const normalizedEmployerIdentityId = employerIdentityId.trim();
    const offerSnapshot = offer;

    await this.writeTransaction.execute(async (context) => {
      const deleted = await context.recruitmentRepository.softDeleteOfferIfStatus(
        offer.id,
        [offer.status],
        now
      );
      if (!deleted) {
        throw new OfferStateInvalidError();
      }

      const application = await context.applicationRepository.findById(offer.applicationId);
      const historyStatus = lifecycleHistoryStatus(application?.status ?? 'offer');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedEmployerIdentityId,
        actorType: 'employer',
        applicationId: offer.applicationId,
        eventType: 'note_added',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: `Employer soft-deleted offer #${offer.id}.`,
        toStatus: historyStatus.toStatus
      });

      const notificationEvent = this.notificationEventFactory.buildOfferWithdrawnEvent({
        actorIdentityId: normalizedEmployerIdentityId,
        offer: offerSnapshot,
        requestId
      });

      await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
        createOutboxId: () => this.idGenerator.generate()
      });
    });

    return {
      deleted: true,
      id: offerId
    };
  }

  async listEmployerOffersForApplication(
    employerIdentityId: string,
    applicationId: string
  ): Promise<ApplicationOfferRecord[]> {
    const application = await this.applicationRepository.findByIdAndEmployer(
      applicationId.trim(),
      employerIdentityId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    await this.recruitmentRepository.expireOpenOffersForApplication(application.id, new Date());
    return this.recruitmentRepository.listOffersByApplicationId(application.id);
  }

  async getEmployerOfferDetail(
    employerIdentityId: string,
    offerId: string
  ): Promise<ApplicationOfferRecord> {
    await this.recruitmentRepository.expireOfferIfDue(offerId.trim(), new Date());

    const offer = await this.recruitmentRepository.findOfferByIdAndEmployer(
      offerId.trim(),
      employerIdentityId.trim()
    );

    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    return offer;
  }

  async listCandidateOffersForApplication(
    candidateIdentityId: string,
    applicationId: string
  ): Promise<ApplicationOfferRecord[]> {
    const application = await this.applicationRepository.findByIdAndCandidate(
      applicationId.trim(),
      candidateIdentityId.trim()
    );

    if (!application) {
      throw new ApplicationNotFoundError(applicationId);
    }

    await this.recruitmentRepository.expireOpenOffersForApplication(application.id, new Date());
    return this.recruitmentRepository.listOffersByApplicationId(application.id);
  }

  async getCandidateOfferDetail(
    candidateIdentityId: string,
    offerId: string
  ): Promise<ApplicationOfferRecord> {
    await this.recruitmentRepository.expireOfferIfDue(offerId.trim(), new Date());

    let offer = await this.recruitmentRepository.findOfferByIdAndCandidate(
      offerId.trim(),
      candidateIdentityId.trim()
    );

    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    if (offer.status === OFFER_STATUS.sent) {
      const now = new Date();
      const updated = await this.recruitmentRepository.updateOffer(offer.id, {
        status: OFFER_STATUS.viewed,
        viewedAt: now
      });

      if (updated) {
        const application = await this.applicationRepository.findById(offer.applicationId);
        const historyStatus = lifecycleHistoryStatus(application?.status ?? 'offer');
        await this.applicationRepository.createHistory({
          actorIdentityId: candidateIdentityId.trim(),
          actorType: 'candidate',
          applicationId: offer.applicationId,
          eventType: 'offer_viewed',
          fromStatus: historyStatus.fromStatus,
          id: this.idGenerator.generate(),
          note: `Candidate viewed offer #${offer.id}.`,
          toStatus: historyStatus.toStatus
        });
        offer = updated;
      }
    }

    return offer;
  }

  async acceptOffer(
    candidateIdentityId: string,
    offerId: string,
    input: CandidateOfferDecisionInput & { requestId?: string }
  ): Promise<ApplicationOfferRecord> {
    await this.recruitmentRepository.expireOfferIfDue(offerId.trim(), new Date());

    const offer = await this.recruitmentRepository.findOfferByIdAndCandidate(
      offerId.trim(),
      candidateIdentityId.trim()
    );

    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    if (offer.status !== OFFER_STATUS.sent && offer.status !== OFFER_STATUS.viewed) {
      throw new OfferAcceptStateInvalidError();
    }

    const application = await this.applicationRepository.findById(offer.applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(offer.applicationId);
    }

    const now = new Date();
    const noteSuffix = input.note?.trim() ? ` Note: ${input.note.trim()}` : '';
    const normalizedCandidateIdentityId = candidateIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateOfferIfStatus(
        offer.id,
        [offer.status],
        {
          respondedAt: now,
          status: OFFER_STATUS.accepted
        }
      );

      if (!updated) {
        throw new OfferAcceptStateInvalidError();
      }

      await context.applicationRepository.updateStatus(application.id, 'hired');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedCandidateIdentityId,
        actorType: 'candidate',
        applicationId: application.id,
        eventType: 'status_change',
        fromStatus: application.status,
        id: this.idGenerator.generate(),
        note: `Candidate accepted offer #${offer.id}.${noteSuffix}`,
        toStatus: 'hired'
      });

      const historyStatus = lifecycleHistoryStatus('hired');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedCandidateIdentityId,
        actorType: 'candidate',
        applicationId: application.id,
        eventType: 'offer_accepted',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: `Candidate accepted offer #${offer.id}.${noteSuffix}`,
        toStatus: historyStatus.toStatus
      });

      const notificationEvent = this.notificationEventFactory.buildOfferAcceptedEvent({
        actorIdentityId: normalizedCandidateIdentityId,
        offer: updated,
        requestId: input.requestId
      });

      await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
        createOutboxId: () => this.idGenerator.generate()
      });

      return updated;
    });
  }

  async declineOffer(
    candidateIdentityId: string,
    offerId: string,
    input: CandidateOfferDecisionInput & { requestId?: string }
  ): Promise<ApplicationOfferRecord> {
    await this.recruitmentRepository.expireOfferIfDue(offerId.trim(), new Date());

    const offer = await this.recruitmentRepository.findOfferByIdAndCandidate(
      offerId.trim(),
      candidateIdentityId.trim()
    );

    if (!offer) {
      throw new OfferNotFoundError(offerId);
    }

    if (offer.status !== OFFER_STATUS.sent && offer.status !== OFFER_STATUS.viewed) {
      throw new OfferDeclineStateInvalidError();
    }

    const application = await this.applicationRepository.findById(offer.applicationId);
    if (!application) {
      throw new ApplicationNotFoundError(offer.applicationId);
    }

    const now = new Date();
    const noteSuffix = input.note?.trim() ? ` Note: ${input.note.trim()}` : '';
    const normalizedCandidateIdentityId = candidateIdentityId.trim();

    return this.writeTransaction.execute(async (context) => {
      const updated = await context.recruitmentRepository.updateOfferIfStatus(
        offer.id,
        [offer.status],
        {
          respondedAt: now,
          status: OFFER_STATUS.rejected
        }
      );

      if (!updated) {
        throw new OfferDeclineStateInvalidError();
      }

      await context.applicationRepository.updateStatus(application.id, 'rejected');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedCandidateIdentityId,
        actorType: 'candidate',
        applicationId: application.id,
        eventType: 'status_change',
        fromStatus: application.status,
        id: this.idGenerator.generate(),
        note: `Candidate declined offer #${offer.id}.${noteSuffix}`,
        toStatus: 'rejected'
      });

      const historyStatus = lifecycleHistoryStatus('rejected');
      await context.applicationRepository.createHistory({
        actorIdentityId: normalizedCandidateIdentityId,
        actorType: 'candidate',
        applicationId: application.id,
        eventType: 'offer_rejected',
        fromStatus: historyStatus.fromStatus,
        id: this.idGenerator.generate(),
        note: `Candidate declined offer #${offer.id}.${noteSuffix}`,
        toStatus: historyStatus.toStatus
      });

      const notificationEvent = this.notificationEventFactory.buildOfferDeclinedEvent({
        actorIdentityId: normalizedCandidateIdentityId,
        offer: updated,
        requestId: input.requestId
      });

      await persistNotificationOutbox(context.outboxRepository, notificationEvent, {
        createOutboxId: () => this.idGenerator.generate()
      });

      return updated;
    });
  }

  private ensureEmployerCanMutateOffer(status: string): void {
    if (!EMPLOYER_MUTABLE_OFFER_STATUSES.has(status)) {
      throw new OfferStateInvalidError();
    }
  }
}
