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

test('gateway offers list benefit catalog maps items', async () => {
  const service = new GatewayOffersService({
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
    },
    async createOffer() {
      throw new Error('unused');
    },
    async sendOffer() {
      throw new Error('unused');
    },
    async updateOffer() {
      throw new Error('unused');
    },
    async softDeleteOffer() {
      throw new Error('unused');
    },
    async listEmployerOffersForApplication() {
      throw new Error('unused');
    },
    async getEmployerOffer() {
      throw new Error('unused');
    },
    async listCandidateOffersForApplication() {
      throw new Error('unused');
    },
    async getCandidateOffer() {
      throw new Error('unused');
    },
    async acceptOffer() {
      throw new Error('unused');
    },
    async declineOffer() {
      throw new Error('unused');
    }
  } as never);

  const result = await service.listBenefitCatalog('req-1');

  assert.equal(result.length, 1);
  assert.equal(result[0]?.code, 'annual_leave');
  assert.equal(result[0]?.requiresAnnualLeaveDays, true);
});

test('gateway offers create passes identity and maps offer detail', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new GatewayOffersService({
    async listBenefitCatalog() {
      return { items: [] };
    },
    async createOffer(payload: Record<string, unknown>, requestId?: string) {
      calls.push({ ...payload, requestId });
      return { offer: baseOfferMessage };
    },
    async sendOffer() {
      throw new Error('unused');
    },
    async updateOffer() {
      throw new Error('unused');
    },
    async softDeleteOffer() {
      throw new Error('unused');
    },
    async listEmployerOffersForApplication() {
      throw new Error('unused');
    },
    async getEmployerOffer() {
      throw new Error('unused');
    },
    async listCandidateOffersForApplication() {
      throw new Error('unused');
    },
    async getCandidateOffer() {
      throw new Error('unused');
    },
    async acceptOffer() {
      throw new Error('unused');
    },
    async declineOffer() {
      throw new Error('unused');
    }
  } as never);

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
  const service = new GatewayOffersService({
    async listBenefitCatalog() {
      return { items: [] };
    },
    async createOffer() {
      throw new Error('unused');
    },
    async sendOffer(payload: Record<string, unknown>, requestId?: string) {
      calls.push({ ...payload, requestId });
      return { offer: { ...baseOfferMessage, sent_at: '2026-06-13T00:00:00.000Z', status: 'sent' } };
    },
    async updateOffer() {
      throw new Error('unused');
    },
    async softDeleteOffer() {
      throw new Error('unused');
    },
    async listEmployerOffersForApplication() {
      throw new Error('unused');
    },
    async getEmployerOffer() {
      throw new Error('unused');
    },
    async listCandidateOffersForApplication() {
      throw new Error('unused');
    },
    async getCandidateOffer() {
      throw new Error('unused');
    },
    async acceptOffer() {
      throw new Error('unused');
    },
    async declineOffer() {
      throw new Error('unused');
    }
  } as never);

  const result = await service.sendOffer({
    identityId: 'employer-1',
    offerId: 'offer-1',
    requestId: 'req-1'
  });

  assert.equal(calls[0]?.employer_identity_id, 'employer-1');
  assert.equal(calls[0]?.offer_id, 'offer-1');
  assert.equal(result.status, 'sent');
});
