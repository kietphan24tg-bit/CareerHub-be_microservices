import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewayOffersService } from './gateway-offers.service';

const baseOfferMessage = {
  application_id: 'application-1',
  benefits: [],
  bonus_details: null,
  candidate_identity_id: 'candidate-1',
  contract_document_url: null,
  created_at: '2026-06-12T00:00:00.000Z',
  created_by_identity_id: 'employer-1',
  currency: 'USD',
  department_team: null,
  employer_identity_id: 'employer-1',
  employment_type: 'full_time',
  expires_at: '2026-12-31T23:59:59.000Z',
  id: 'offer-1',
  job_id: 'job-1',
  location: 'Ho Chi Minh City',
  message: null,
  null_fields: [],
  probation_custom: null,
  probation_type: null,
  reporting_to: null,
  responded_at: null,
  salary: '5000',
  salary_period: 'monthly',
  seniority_label: null,
  sent_at: null,
  start_date: '2026-07-01',
  status: 'draft',
  title: 'Senior Engineer',
  updated_at: '2026-06-12T00:00:00.000Z',
  viewed_at: null,
  work_model: 'hybrid'
};

function createService(
  applicationClient: Record<string, unknown>,
  candidateClient: Record<string, unknown> = {
    async getCandidateProfileByIdentityId() {
      return { profile: { full_name: 'Jane Candidate' } };
    }
  },
  jobClient: Record<string, unknown> = {
    async listJobsByIds() {
      return {
        items: [
          {
            city: 'Ho Chi Minh City',
            country: 'VN',
            currency: 'USD',
            id: 'job-1',
            is_remote: false,
            salary_max: '6000',
            salary_min: '4000',
            status: 'published',
            title: 'Senior Engineer'
          }
        ]
      };
    }
  }
) {
  return new GatewayOffersService(
    applicationClient as never,
    candidateClient as never,
    jobClient as never
  );
}

function unusedApplicationClient(overrides: Record<string, unknown> = {}) {
  return {
    async acceptOffer() {
      throw new Error('unused');
    },
    async createOffer() {
      throw new Error('unused');
    },
    async declineOffer() {
      throw new Error('unused');
    },
    async getCandidateOffer() {
      throw new Error('unused');
    },
    async getEmployerOffer() {
      throw new Error('unused');
    },
    async listBenefitCatalog() {
      return { items: [] };
    },
    async listCandidateOffersForApplication() {
      throw new Error('unused');
    },
    async listEmployerOffers() {
      throw new Error('unused');
    },
    async listEmployerOffersForApplication() {
      throw new Error('unused');
    },
    async sendOffer() {
      throw new Error('unused');
    },
    async softDeleteOffer() {
      throw new Error('unused');
    },
    async updateOffer() {
      throw new Error('unused');
    },
    ...overrides
  };
}

test('gateway offers list benefit catalog maps items', async () => {
  const service = createService(
    unusedApplicationClient({
      async listBenefitCatalog(_payload: Record<string, unknown>, requestId?: string) {
        assert.equal(requestId, 'req-1');
        return {
          items: [
            {
              code: 'annual_leave',
              description: 'Paid time off days in addition to public holidays',
              has_monetary_value_default: false,
              id: 'bc-annual_leave',
              is_active: true,
              is_selectable: true,
              label: 'Annual Leave',
              null_fields: [],
              requires_amount: false,
              requires_annual_leave_days: true,
              requires_frequency: false,
              sort_order: 5
            }
          ]
        };
      }
    })
  );

  const result = await service.listBenefitCatalog('req-1');

  assert.equal(result.length, 1);
  assert.equal(result[0]?.code, 'annual_leave');
  assert.equal(result[0]?.requiresAnnualLeaveDays, true);
});

test('gateway offers list employer enriches items with candidate and job snapshots', async () => {
  const service = createService(
    unusedApplicationClient({
      async listEmployerOffers(payload: Record<string, unknown>) {
        assert.equal(payload.employer_identity_id, 'employer-1');
        return {
          items: [baseOfferMessage],
          meta: { page: 1, page_size: 20, total: 1 }
        };
      }
    })
  );

  const result = await service.listEmployerOffers({
    identityId: 'employer-1',
    page: 1,
    pageSize: 20,
    requestId: 'req-1'
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.meta.total, 1);
  assert.equal(result.items[0]?.candidateName, 'Jane Candidate');
  assert.equal(result.items[0]?.jobTitle, 'Senior Engineer');
});

test('gateway offers create passes identity and maps offer detail', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = createService(
    unusedApplicationClient({
      async createOffer(payload: Record<string, unknown>, requestId?: string) {
        calls.push({ ...payload, requestId });
        return { offer: baseOfferMessage };
      }
    })
  );

  const result = await service.createOffer({
    applicationId: 'application-1',
    dto: { title: 'Senior Engineer' },
    identityId: 'employer-1',
    requestId: 'req-1'
  });

  assert.equal(calls[0]?.employer_identity_id, 'employer-1');
  assert.equal(calls[0]?.application_id, 'application-1');
  assert.equal(result.id, 'offer-1');
  assert.equal(result.title, 'Senior Engineer');
});

test('gateway offers send passes identity and offer id', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = createService(
    unusedApplicationClient({
      async sendOffer(payload: Record<string, unknown>, requestId?: string) {
        calls.push({ ...payload, requestId });
        return { offer: { ...baseOfferMessage, sent_at: '2026-06-13T00:00:00.000Z', status: 'sent' } };
      }
    })
  );

  const result = await service.sendOffer({
    identityId: 'employer-1',
    offerId: 'offer-1',
    requestId: 'req-1'
  });

  assert.equal(calls[0]?.employer_identity_id, 'employer-1');
  assert.equal(calls[0]?.offer_id, 'offer-1');
  assert.equal(result.status, 'sent');
});
