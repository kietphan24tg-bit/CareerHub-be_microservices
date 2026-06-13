import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewayInterviewsService } from './gateway-interviews.service';

test('gateway interviews create passes identity and maps response envelope fields', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new GatewayInterviewsService(
    {
      async createInterview(payload: Record<string, unknown>, requestId?: string) {
        calls.push({ ...payload, requestId });
        return {
          interview: {
            application_id: 'application-1',
            candidate_identity_id: 'candidate-1',
            created_at: '2026-06-12T00:00:00.000Z',
            date: '2026-06-20',
            duration_minutes: 60,
            employer_identity_id: 'employer-1',
            end_time: '11:00',
            id: 'interview-1',
            interviewers: [],
            job_id: 'job-1',
            null_fields: [],
            round: 'Technical',
            start_time: '10:00',
            status: 'scheduled',
            type: 'online',
            updated_at: '2026-06-12T00:00:00.000Z'
          }
        };
      },
      async listEmployerInterviews() {
        throw new Error('unused');
      },
      async updateInterview() {
        throw new Error('unused');
      },
      async cancelInterview() {
        throw new Error('unused');
      },
      async getCandidateInterview() {
        throw new Error('unused');
      },
      async confirmInterview() {
        throw new Error('unused');
      },
      async declineInterview() {
        throw new Error('unused');
      },
      async requestInterviewReschedule() {
        throw new Error('unused');
      }
    } as never,
    {
      async getCandidateProfileByIdentityId() {
        return { profile: { avatar_url: '', full_name: 'Candidate', headline: '' } };
      }
    } as never,
    {
      async getEmployerProfileByIdentityId() {
        return { profile: { company_name: 'Acme', logo_url: '' } };
      }
    } as never,
    {
      async listJobsByIds() {
        return { items: [] };
      }
    } as never
  );

  const result = await service.createInterview({
    applicationId: 'application-1',
    dto: {
      date: '2026-06-20',
      durationMinutes: 60,
      round: 'Technical',
      startTime: '10:00',
      type: 'online'
    },
    identityId: 'employer-1',
    requestId: 'req-1'
  });

  assert.equal(calls[0]?.employer_identity_id, 'employer-1');
  assert.equal(calls[0]?.application_id, 'application-1');
  assert.equal(result.id, 'interview-1');
  assert.equal(result.status, 'scheduled');
});

test('gateway interviews list employer enriches items with job and candidate snapshots', async () => {
  const service = new GatewayInterviewsService(
    {
      async listEmployerInterviews(payload: Record<string, unknown>) {
        assert.equal(payload.employer_identity_id, 'employer-1');
        return {
          items: [
            {
              application_id: 'application-1',
              candidate_identity_id: 'candidate-1',
              created_at: '2026-06-12T00:00:00.000Z',
              date: '2026-06-20',
              duration_minutes: 60,
              employer_identity_id: 'employer-1',
              end_time: '11:00',
              id: 'interview-1',
              interviewers: [],
              job_id: 'job-1',
              null_fields: [],
              round: 'Technical',
              start_time: '10:00',
              status: 'scheduled',
              type: 'online',
              updated_at: '2026-06-12T00:00:00.000Z'
            }
          ]
        };
      },
      async createInterview() {
        throw new Error('unused');
      },
      async updateInterview() {
        throw new Error('unused');
      },
      async cancelInterview() {
        throw new Error('unused');
      },
      async getCandidateInterview() {
        throw new Error('unused');
      },
      async confirmInterview() {
        throw new Error('unused');
      },
      async declineInterview() {
        throw new Error('unused');
      },
      async requestInterviewReschedule() {
        throw new Error('unused');
      }
    } as never,
    {
      async getCandidateProfileByIdentityId() {
        return {
          profile: {
            avatar_url: 'https://cdn.test/avatar.png',
            full_name: 'Jane Candidate',
            headline: 'Backend Engineer'
          }
        };
      }
    } as never,
    {
      async getEmployerProfileByIdentityId() {
        return {
          profile: {
            company_name: 'Acme Corp',
            logo_url: 'https://cdn.test/logo.png'
          }
        };
      }
    } as never,
    {
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
    } as never
  );

  const result = await service.listEmployerInterviews({
    identityId: 'employer-1',
    requestId: 'req-1'
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, 'interview-1');
  assert.equal(result[0]?.candidate?.fullName, 'Jane Candidate');
  assert.equal(result[0]?.job?.title, 'Senior Engineer');
  assert.equal(result[0]?.company?.companyName, 'Acme Corp');
});
