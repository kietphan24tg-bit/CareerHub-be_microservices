import assert from 'node:assert/strict';
import test from 'node:test';
import { OfferAcceptStateInvalidError } from '../errors/offer-accept-state-invalid.error';
import { OfferAlreadyExistsError } from '../errors/offer-already-exists.error';
import { OfferApplicationStateInvalidError } from '../errors/offer-application-state-invalid.error';
import { OfferExpirationRequiredError } from '../errors/offer-expiration-required.error';
import { OfferSendStateInvalidError } from '../errors/offer-send-state-invalid.error';
import { OfferStateInvalidError } from '../errors/offer-state-invalid.error';
import { ApplicationNotificationEventFactory } from '../notifications/application-notification-event.factory';
import { ApplicationMailEventFactory } from '../mail/application-mail-event.factory';
import { ApplicationMailContextQuery } from '../mail/application-mail-context.query';
import type { ApplicationOfferRecord, ApplicationRecord } from '../ports';
import { OfferOperations } from './offer-operations.service';

const baseApplication: ApplicationRecord = {
  candidateIdentityId: 'candidate-1',
  coverLetter: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  employerIdentityId: 'employer-1',
  id: 'application-1',
  jobId: 'job-1',
  resumeId: 'resume-1',
  status: 'interview',
  updatedAt: new Date('2026-01-01T00:00:00.000Z')
};

const baseOffer: ApplicationOfferRecord = {
  applicationId: 'application-1',
  benefits: [],
  bonusDetails: null,
  candidateIdentityId: 'candidate-1',
  contractDocumentUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  createdByIdentityId: 'employer-1',
  currency: 'USD',
  deletedAt: null,
  departmentTeam: null,
  employerIdentityId: 'employer-1',
  employmentType: 'full_time',
  expiresAt: new Date('2026-12-31T23:59:59.000Z'),
  id: 'offer-1',
  jobId: 'job-1',
  location: 'Ho Chi Minh City',
  message: null,
  probationCustom: null,
  probationType: null,
  reportingTo: null,
  respondedAt: null,
  salary: '5000',
  salaryPeriod: 'monthly',
  seniorityLabel: null,
  sentAt: null,
  startDate: '2026-07-01',
  status: 'draft',
  title: 'Senior Engineer',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  viewedAt: null,
  workModel: 'hybrid'
};

function createOperations(overrides: {
  applicationRepository?: Record<string, unknown>;
  recruitmentRepository?: Record<string, unknown>;
}) {
  let idCounter = 0;
  const histories: Array<{ eventType: string; toStatus: string }> = [];
  const outboxEvents: unknown[] = [];

  const applicationRepository = {
    async createHistory(data: { eventType: string; toStatus: string }) {
      histories.push({ eventType: data.eventType, toStatus: data.toStatus });
      return data;
    },
    async findById(id: string) {
      if (id === 'application-1') {
        return baseApplication;
      }
      return null;
    },
    async findByIdAndCandidate(applicationId: string, candidateIdentityId: string) {
      if (applicationId === 'application-1' && candidateIdentityId === 'candidate-1') {
        return baseApplication;
      }
      return null;
    },
    async findByIdAndEmployer(applicationId: string, employerIdentityId: string) {
      if (applicationId === 'application-1' && employerIdentityId === 'employer-1') {
        return baseApplication;
      }
      return null;
    },
    async updateStatus(_applicationId: string, status: string) {
      return { ...baseApplication, status: status as ApplicationRecord['status'] };
    },
    ...overrides.applicationRepository
  };

  const recruitmentRepository = {
    async createOffer(data: Record<string, unknown>) {
      return { ...baseOffer, ...data, id: 'offer-new' } as ApplicationOfferRecord;
    },
    async expireOfferIfDue(_offerId: string) {
      return undefined;
    },
    async expireOpenOffersForApplication(_applicationId: string) {
      return undefined;
    },
    async findOfferByApplicationId(applicationId: string) {
      return applicationId === 'application-1' ? null : null;
    },
    async findOfferByIdAndCandidate(offerId: string, candidateIdentityId: string) {
      if (offerId === 'offer-1' && candidateIdentityId === 'candidate-1') {
        return { ...baseOffer, status: 'sent', sentAt: new Date() };
      }
      return null;
    },
    async findOfferByIdAndEmployer(offerId: string, employerIdentityId: string) {
      if (offerId === 'offer-1' && employerIdentityId === 'employer-1') {
        return baseOffer;
      }
      return null;
    },
    async listBenefitCatalog() {
      return [];
    },
    async listOffersByApplicationId() {
      return [baseOffer];
    },
    async loadOfferWithBenefits(offerId: string) {
      return offerId === 'offer-1' ? { ...baseOffer, status: 'sent', sentAt: new Date() } : null;
    },
    async updateOfferIfStatus(
      _id: string,
      _expectedStatuses: string[],
      data: Record<string, unknown>
    ) {
      return { ...baseOffer, ...data } as ApplicationOfferRecord;
    },
    async softDeleteOfferIfStatus() {
      return true;
    },
    ...overrides.recruitmentRepository
  };

  const mailContextQuery = new ApplicationMailContextQuery({
    appBaseUrl: 'http://localhost:4000',
    jobMailContextLookup: {
      async findByJobId() {
        return {
          companyName: 'Acme Corp',
          jobTitle: 'Software Engineer'
        };
      }
    }
  });
  const mailEventFactory = new ApplicationMailEventFactory({
    createSourceEventId: () => 'mail-source-1',
    mailContextQuery
  });

  const operations = new OfferOperations(
    applicationRepository as never,
    recruitmentRepository as never,
    {
      async execute(work) {
        return work({
          applicationRepository: applicationRepository as never,
          outboxRepository: {
            async create(record: unknown) {
              outboxEvents.push(record);
            }
          } as never,
          recruitmentRepository: recruitmentRepository as never
        });
      }
    },
    new ApplicationNotificationEventFactory({
      createSourceEventId: () => 'source-event-1'
    }),
    mailEventFactory,
    {
      generate() {
        idCounter += 1;
        return `generated-${idCounter}`;
      }
    }
  );

  return { histories, operations, outboxEvents };
}

test('create draft offer blocks duplicate offers', async () => {
  const { operations } = createOperations({
    recruitmentRepository: {
      async findOfferByApplicationId() {
        return baseOffer;
      }
    }
  });

  await assert.rejects(
    () =>
      operations.createDraftOffer('employer-1', 'application-1', {
        title: 'Senior Engineer'
      }),
    OfferAlreadyExistsError
  );
});

test('create draft offer blocks terminal application', async () => {
  const { operations } = createOperations({
    applicationRepository: {
      async findByIdAndEmployer() {
        return { ...baseApplication, status: 'withdrawn' as const };
      }
    }
  });

  await assert.rejects(
    () =>
      operations.createDraftOffer('employer-1', 'application-1', {
        title: 'Senior Engineer'
      }),
    OfferApplicationStateInvalidError
  );
});

test('send offer requires draft status and expiration', async () => {
  const { operations } = createOperations({
    recruitmentRepository: {
      async findOfferByIdAndEmployer() {
        return { ...baseOffer, expiresAt: null };
      }
    }
  });

  await assert.rejects(
    () => operations.sendOffer('employer-1', 'offer-1'),
    OfferExpirationRequiredError
  );

  const { operations: sentOps } = createOperations({
    recruitmentRepository: {
      async findOfferByIdAndEmployer() {
        return { ...baseOffer, status: 'sent' };
      }
    }
  });

  await assert.rejects(() => sentOps.sendOffer('employer-1', 'offer-1'), OfferSendStateInvalidError);
});

test('send offer moves application to offer', async () => {
  const { histories, operations, outboxEvents } = createOperations({});

  const result = await operations.sendOffer('employer-1', 'offer-1');

  assert.equal(result.status, 'sent');
  assert.ok(histories.some((item) => item.eventType === 'status_change' && item.toStatus === 'offer'));
  assert.ok(histories.some((item) => item.eventType === 'offer_sent'));
  assert.equal(outboxEvents.length, 2);
  assert.equal((outboxEvents[0] as { eventName: string }).eventName, 'notifications.offer-sent.v1');
  assert.equal((outboxEvents[1] as { eventName: string }).eventName, 'mail.offer-sent.v1');
});

test('soft delete offer enforces mutable status', async () => {
  const { operations, outboxEvents } = createOperations({
    recruitmentRepository: {
      async findOfferByIdAndEmployer() {
        return { ...baseOffer, status: 'accepted' };
      }
    }
  });

  await assert.rejects(() => operations.softDeleteOffer('employer-1', 'offer-1'), OfferStateInvalidError);
  assert.equal(outboxEvents.length, 0);
});

test('accept offer updates application to hired', async () => {
  const { histories, operations, outboxEvents } = createOperations({});

  const result = await operations.acceptOffer('candidate-1', 'offer-1', {});

  assert.equal(result.status, 'accepted');
  assert.ok(histories.some((item) => item.eventType === 'status_change' && item.toStatus === 'hired'));
  assert.ok(histories.some((item) => item.eventType === 'offer_accepted'));
  assert.equal(outboxEvents.length, 1);
  assert.equal((outboxEvents[0] as { eventName: string }).eventName, 'notifications.offer-accepted.v1');
});

test('accept offer rejects invalid status', async () => {
  const { operations, outboxEvents } = createOperations({
    recruitmentRepository: {
      async findOfferByIdAndCandidate() {
        return { ...baseOffer, status: 'draft' };
      }
    }
  });

  await assert.rejects(() => operations.acceptOffer('candidate-1', 'offer-1', {}), OfferAcceptStateInvalidError);
  assert.equal(outboxEvents.length, 0);
});

test('decline offer updates application to rejected', async () => {
  const { histories, operations, outboxEvents } = createOperations({});

  const result = await operations.declineOffer('candidate-1', 'offer-1', { note: 'Comp too low' });

  assert.equal(result.status, 'rejected');
  assert.ok(histories.some((item) => item.eventType === 'status_change' && item.toStatus === 'rejected'));
  assert.ok(histories.some((item) => item.eventType === 'offer_rejected'));
  assert.equal(outboxEvents.length, 1);
  assert.equal((outboxEvents[0] as { eventName: string }).eventName, 'notifications.offer-declined.v1');
});

test('list benefit catalog returns active catalog rows', async () => {
  const catalog = [
    {
      code: 'annual_leave',
      description: 'Paid time off',
      hasMonetaryValueDefault: false,
      id: 'bc-annual_leave',
      isActive: true,
      isSelectable: true,
      label: 'Annual Leave',
      requiresAmount: false,
      requiresAnnualLeaveDays: true,
      requiresFrequency: false,
      sortOrder: 5
    }
  ];

  const { operations } = createOperations({
    recruitmentRepository: {
      async listBenefitCatalog() {
        return catalog;
      }
    }
  });

  const result = await operations.listBenefitCatalog();

  assert.equal(result.length, 1);
  assert.equal(result[0]?.code, 'annual_leave');
});

test('update offer writes note_added history', async () => {
  const { histories, operations, outboxEvents } = createOperations({});

  const result = await operations.updateOffer('employer-1', 'offer-1', {
    message: 'Updated terms'
  });

  assert.equal(result.message, 'Updated terms');
  assert.ok(histories.some((item) => item.eventType === 'note_added'));
  assert.equal(outboxEvents.length, 1);
  assert.equal((outboxEvents[0] as { eventName: string }).eventName, 'notifications.offer-updated.v1');
});

test('get employer offer expires due offer before returning', async () => {
  let expired = false;
  const { operations } = createOperations({
    recruitmentRepository: {
      async expireOfferIfDue(offerId: string) {
        expired = offerId === 'offer-1';
      },
      async findOfferByIdAndEmployer() {
        return { ...baseOffer, status: 'expired' };
      }
    }
  });

  const result = await operations.getEmployerOfferDetail('employer-1', 'offer-1');

  assert.equal(expired, true);
  assert.equal(result.status, 'expired');
});

test('get candidate offer marks sent offer as viewed and writes history', async () => {
  const { histories, operations } = createOperations({
    recruitmentRepository: {
      async findOfferByIdAndCandidate() {
        return { ...baseOffer, sentAt: new Date(), status: 'sent' };
      },
      async updateOffer(_id: string, data: Record<string, unknown>) {
        return { ...baseOffer, ...data, sentAt: new Date() } as ApplicationOfferRecord;
      }
    }
  });

  const result = await operations.getCandidateOfferDetail('candidate-1', 'offer-1');

  assert.equal(result.status, 'viewed');
  assert.ok(histories.some((item) => item.eventType === 'offer_viewed'));
});

test('list employer offers for application expires open offers first', async () => {
  let expiredApplicationId: string | null = null;
  const { operations } = createOperations({
    recruitmentRepository: {
      async expireOpenOffersForApplication(applicationId: string) {
        expiredApplicationId = applicationId;
      }
    }
  });

  const result = await operations.listEmployerOffersForApplication('employer-1', 'application-1');

  assert.equal(expiredApplicationId, 'application-1');
  assert.equal(result.length, 1);
});

test('send offer fails when conditional update loses race', async () => {
  const { histories, operations, outboxEvents } = createOperations({
    recruitmentRepository: {
      async updateOfferIfStatus() {
        return null;
      }
    }
  });

  await assert.rejects(() => operations.sendOffer('employer-1', 'offer-1'), OfferSendStateInvalidError);
  assert.equal(histories.length, 0);
  assert.equal(outboxEvents.length, 0);
});

test('accept offer fails when conditional update loses race', async () => {
  const { histories, operations, outboxEvents } = createOperations({
    recruitmentRepository: {
      async updateOfferIfStatus() {
        return null;
      }
    }
  });

  await assert.rejects(() => operations.acceptOffer('candidate-1', 'offer-1', {}), OfferAcceptStateInvalidError);
  assert.equal(histories.length, 0);
  assert.equal(outboxEvents.length, 0);
});

test('soft delete offer enqueues notification only', async () => {
  const { operations, outboxEvents } = createOperations({});

  const result = await operations.softDeleteOffer('employer-1', 'offer-1');

  assert.equal(result.deleted, true);
  assert.equal(outboxEvents.length, 1);
  assert.equal((outboxEvents[0] as { eventName: string }).eventName, 'notifications.offer-withdrawn.v1');
});
