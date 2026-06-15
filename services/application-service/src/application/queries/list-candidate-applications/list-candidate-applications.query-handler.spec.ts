import assert from 'node:assert/strict';
import test from 'node:test';
import { ListCandidateApplicationsQueryHandler } from './list-candidate-applications.query-handler';

test('list candidate applications returns grouped summary with shortlisted rolled into reviewed', async () => {
  const handler = new ListCandidateApplicationsQueryHandler({
    async countCandidateByStatus() {
      return [
        { count: 2, status: 'applied' },
        { count: 3, status: 'reviewed' },
        { count: 4, status: 'shortlisted' },
        { count: 1, status: 'offer' },
        { count: 5, status: 'withdrawn' }
      ];
    },
    async create() {
      throw new Error('unused');
    },
    async createWithHistory() {
      throw new Error('unused');
    },
    async createHistory() {
      throw new Error('unused');
    },
    async findById() {
      throw new Error('unused');
    },
    async findByIdAndCandidate() {
      throw new Error('unused');
    },
    async findByIdAndEmployer() {
      throw new Error('unused');
    },
    async findByJobAndCandidate() {
      throw new Error('unused');
    },
    async findLatestInterviewByApplicationId() {
      throw new Error('unused');
    },
    async findLatestOfferByApplicationId() {
      throw new Error('unused');
    },
    async listCandidate() {
      return {
        items: [],
        total: 0
      };
    },
    async listCountsByJobIds() {
      throw new Error('unused');
    },
    async listHistory() {
      throw new Error('unused');
    },
    async listLatestInterviewsByApplicationIds() {
      throw new Error('unused');
    },
    async listLatestOffersByApplicationIds() {
      throw new Error('unused');
    },
    async listJobApplications() {
      throw new Error('unused');
    },
    async updateStatus() {
      throw new Error('unused');
    },
    async transitionStatusWithHistory() {
      throw new Error('unused');
    },
    async countByEmployer() {
      throw new Error('unused');
    },
    async listEmployerDashboardPipeline() {
      throw new Error('unused');
    },
    async listEmployerDashboardRecentActivities() {
      throw new Error('unused');
    },
    async listRecruiterNotesByApplication() {
      throw new Error('unused');
    },
    async findRecruiterNoteById() {
      throw new Error('unused');
    },
    async createRecruiterNote() {
      throw new Error('unused');
    },
    async updateRecruiterNote() {
      throw new Error('unused');
    },
    async deleteRecruiterNote() {
      throw new Error('unused');
    }
  });

  const result = await handler.execute({
    candidateIdentityId: 'candidate-1',
    page: 1,
    pageSize: 20,
    sort: 'newest',
    status: 'all'
  });

  assert.deepEqual(result.summary, {
    all: 15,
    applied: 2,
    interview: 0,
    offer: 1,
    rejected: 0,
    reviewed: 7,
    withdrawn: 5
  });
});
