import assert from 'node:assert/strict';
import test from 'node:test';
import { CandidateOffersController } from '../offers/candidate-offers.controller';
import { EmployerOffersController } from '../offers/employer-offers.controller';

const employerUser = { email: 'employer@example.com', id: 'employer-1', role: 'employer' as const };
const candidateUser = { email: 'candidate@example.com', id: 'candidate-1', role: 'candidate' as const };

const offerDetail = {
  id: 'offer-1',
  status: 'draft',
  title: 'Senior Engineer'
};

test('employer offers controller returns response envelope for catalog and send', async () => {
  const calls: string[] = [];
  const controller = new EmployerOffersController({
    async listBenefitCatalog() {
      calls.push('catalog');
      return [{ code: 'annual_leave', id: 'bc-annual_leave', label: 'Annual Leave' }];
    },
    async listEmployerOffers() {
      calls.push('list');
      return {
        items: [{ id: 'offer-1', status: 'draft', title: 'Senior Engineer' }],
        meta: { page: 1, pageSize: 20, total: 1 }
      };
    },
    async createOffer() {
      throw new Error('unused');
    },
    async sendOffer() {
      calls.push('send');
      return { ...offerDetail, status: 'sent' };
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
    }
  } as never);

  const catalog = await controller.listBenefitCatalog('req-1');
  const listed = await controller.listEmployerOffers(
    employerUser,
    { page: 1, pageSize: 20 },
    'req-2'
  );
  const sent = await controller.sendOffer(employerUser, 'offer-1', 'req-3');

  assert.equal(catalog.message, 'Offer benefit catalog loaded successfully');
  assert.equal(catalog.data[0]?.code, 'annual_leave');
  assert.equal(listed.message, 'Offers loaded successfully');
  assert.equal(listed.data.items[0]?.id, 'offer-1');
  assert.equal(sent.message, 'Offer sent successfully');
  assert.equal(sent.data.status, 'sent');
  assert.deepEqual(calls, ['catalog', 'list', 'send']);
});

test('candidate offers controller returns response envelope for accept and decline', async () => {
  const calls: string[] = [];
  const controller = new CandidateOffersController({
    async listCandidateOffersForApplication() {
      throw new Error('unused');
    },
    async getCandidateOffer() {
      throw new Error('unused');
    },
    async acceptOffer() {
      calls.push('accept');
      return { ...offerDetail, status: 'accepted' };
    },
    async declineOffer() {
      calls.push('decline');
      return { ...offerDetail, status: 'rejected' };
    }
  } as never);

  const accepted = await controller.acceptOffer(candidateUser, 'offer-1', {}, 'req-1');
  const declined = await controller.declineOffer(candidateUser, 'offer-1', { note: 'Too low' }, 'req-2');

  assert.equal(accepted.message, 'Offer accepted successfully');
  assert.equal(accepted.data.status, 'accepted');
  assert.equal(declined.message, 'Offer declined successfully');
  assert.equal(declined.data.status, 'rejected');
  assert.deepEqual(calls, ['accept', 'decline']);
});
