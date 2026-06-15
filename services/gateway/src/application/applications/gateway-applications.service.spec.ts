import assert from 'node:assert/strict';
import test from 'node:test';
import { GatewayApplicationsService } from './gateway-applications.service';

test('apply to job resolves employer identity from job rpc', async () => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
  const service = new GatewayApplicationsService(
    {
      async applyToJob(payload: Record<string, unknown>) {
        calls.push({ method: 'applyToJob', payload });
        return {
          application: {
            candidate_identity_id: 'candidate-1',
            cover_letter: '',
            created_at: '2026-06-12T00:00:00.000Z',
            employer_identity_id: 'employer-1',
            id: 'application-1',
            job_id: 'job-1',
            null_fields: ['cover_letter'],
            resume_id: 'resume-1',
            status: 'applied',
            updated_at: '2026-06-12T00:00:00.000Z'
          }
        };
      },
      async getApplicationHistory() {
        return { items: [] };
      },
      async getCandidateApplicationById() {
        throw new Error('unused');
      },
      async getEmployerApplicationById() {
        throw new Error('unused');
      },
      async getApplicationCountsByJobIds() {
        throw new Error('unused');
      },
      async listCandidateApplications() {
        throw new Error('unused');
      },
      async listJobApplications() {
        throw new Error('unused');
      },
      async updateApplicationStatus() {
        throw new Error('unused');
      },
      async withdrawApplication() {
        throw new Error('unused');
      }
    } as never,
    {
      async getResumeById(payload: Record<string, unknown>) {
        calls.push({ method: 'getResumeById', payload });
        return { resume: { id: 'resume-1' } };
      }
    } as never,
    {
      async getJobForApplication(payload: Record<string, unknown>) {
        calls.push({ method: 'getJobForApplication', payload });
        return {
          employer_identity_id: 'employer-1',
          expires_at: '',
          job_id: 'job-1',
          null_fields: ['expires_at'],
          status: 'published'
        };
      },
      async getEmployerJobById() {
        throw new Error('unused');
      }
    } as never
  );

  const result = await service.applyToJob({
    coverLetter: 'Hello',
    identityId: 'candidate-1',
    jobId: 'job-1',
    resumeId: 'resume-1'
  });

  assert.equal(result.id, 'application-1');
  assert.equal(result.candidateUserId, 'candidate-1');
  assert.equal(calls[0]?.method, 'getJobForApplication');
  assert.equal(calls[1]?.method, 'getResumeById');
  assert.equal(calls[2]?.method, 'applyToJob');
  assert.equal(calls[2]?.payload.employer_identity_id, 'employer-1');
});

test('update application status returns mapped application shape', async () => {
  let receivedNote: string | undefined;
  const service = new GatewayApplicationsService(
    {
      async updateApplicationStatus(payload: { note?: string }) {
        receivedNote = payload.note;
        return {
          application: {
            candidate_identity_id: 'candidate-1',
            cover_letter: 'Updated note',
            created_at: '2026-06-12T00:00:00.000Z',
            employer_identity_id: 'employer-1',
            id: 'application-2',
            job_id: 'job-2',
            null_fields: [],
            resume_id: 'resume-2',
            status: 'reviewed',
            updated_at: '2026-06-13T00:00:00.000Z'
          }
        };
      },
      async applyToJob() {
        throw new Error('unused');
      },
      async getApplicationHistory() {
        throw new Error('unused');
      },
      async getCandidateApplicationById() {
        throw new Error('unused');
      },
      async getEmployerApplicationById() {
        return {
          application: {
            candidate_identity_id: 'candidate-1',
            cover_letter: 'Updated note',
            created_at: '2026-06-12T00:00:00.000Z',
            employer_identity_id: 'employer-1',
            id: 'application-2',
            job_id: 'job-2',
            null_fields: [],
            resume_id: 'resume-2',
            status: 'applied',
            updated_at: '2026-06-12T00:00:00.000Z'
          }
        };
      },
      async getApplicationCountsByJobIds() {
        throw new Error('unused');
      },
      async listCandidateApplications() {
        throw new Error('unused');
      },
      async listJobApplications() {
        throw new Error('unused');
      },
      async withdrawApplication() {
        throw new Error('unused');
      }
    } as never,
    {
      async getResumeById() {
        throw new Error('unused');
      }
    } as never,
    {
      async getJobForApplication() {
        throw new Error('unused');
      },
      async getEmployerJobById() {
        throw new Error('unused');
      }
    } as never
  );

  const result = await service.updateApplicationStatus({
    applicationId: 'application-2',
    identityId: 'employer-1',
    note: 'Move in ATS',
    status: 'reviewed'
  });

  assert.equal(result.id, 'application-2');
  assert.equal(result.status, 'reviewed');
  assert.equal(result.appliedAt, '2026-06-12T00:00:00.000Z');
  assert.equal(receivedNote, 'Move in ATS');
});

test('list candidate applications uses grpc summary payload directly', async () => {
  let listCalls = 0;
  const service = new GatewayApplicationsService(
    {
      async applyToJob() {
        throw new Error('unused');
      },
      async getApplicationHistory() {
        throw new Error('unused');
      },
      async getCandidateApplicationById() {
        throw new Error('unused');
      },
      async getEmployerApplicationById() {
        throw new Error('unused');
      },
      async getApplicationCountsByJobIds() {
        throw new Error('unused');
      },
      async listCandidateApplications() {
        listCalls += 1;
        return {
          items: [
            {
              candidate_identity_id: 'candidate-1',
              cover_letter: '',
              created_at: '2026-06-12T00:00:00.000Z',
              employer_identity_id: 'employer-1',
              id: 'application-1',
              job_id: 'job-1',
              null_fields: ['cover_letter'],
              resume_id: 'resume-1',
              status: 'applied',
              updated_at: '2026-06-12T00:00:00.000Z'
            }
          ],
          meta: {
            page: 1,
            page_size: 20,
            total: 1
          },
          summary: {
            all: 4,
            applied: 1,
            interview: 0,
            offer: 1,
            rejected: 0,
            reviewed: 2,
            withdrawn: 0
          }
        };
      },
      async listJobApplications() {
        throw new Error('unused');
      },
      async updateApplicationStatus() {
        throw new Error('unused');
      },
      async withdrawApplication() {
        throw new Error('unused');
      }
    } as never,
    {
      async getResumeById() {
        throw new Error('unused');
      }
    } as never,
    {
      async getEmployerJobById() {
        throw new Error('unused');
      },
      async getJobForApplication() {
        throw new Error('unused');
      },
      async listJobsByIds() {
        return {
          items: [
            {
              city: 'Ho Chi Minh City',
              company_logo_url: '',
              company_name: 'CareerHub',
              country: 'Vietnam',
              currency: 'USD',
              employment_type: 'fulltime',
              expires_at: '',
              id: 'job-1',
              is_remote: false,
              null_fields: ['company_logo_url', 'expires_at'],
              salary_max: 3000,
              salary_min: 2000,
              slug: 'careerhub-job',
              status: 'published',
              title: 'Backend Engineer'
            }
          ]
        };
      }
    } as never
  );

  const result = await service.listCandidateApplications({
    identityId: 'candidate-1'
  });

  assert.equal(listCalls, 1);
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.summary, {
    all: 4,
    applied: 1,
    interview: 0,
    offer: 1,
    rejected: 0,
    reviewed: 2,
    withdrawn: 0
  });
});

test('get candidate application maps interview and offer actions from grpc payload', async () => {
  const service = new GatewayApplicationsService(
    {
      async getApplicationHistory() {
        return { items: [] };
      },
      async getCandidateApplicationById() {
        return {
          application: {
            candidate_identity_id: 'candidate-1',
            cover_letter: '',
            created_at: '2026-06-12T00:00:00.000Z',
            employer_identity_id: 'employer-1',
            id: 'application-1',
            interview: {
              application_id: 'application-1',
              caller_info: '',
              candidate_response_note: '',
              contact_info: '',
              created_at: '2026-06-13T00:00:00.000Z',
              date: '2026-06-20',
              end_time: '10:30:00',
              full_address: '',
              id: 'interview-1',
              location_detail: '',
              map_link: '',
              meeting_id: '',
              meeting_link: 'https://meet.test/interview-1',
              notes_to_candidate: '',
              null_fields: [
                'caller_info',
                'candidate_response_note',
                'contact_info',
                'full_address',
                'location_detail',
                'map_link',
                'meeting_id',
                'notes_to_candidate',
                'office_name',
                'passcode',
                'phone_number'
              ],
              office_name: '',
              passcode: '',
              phone_number: '',
              platform: 'Google Meet',
              round: 'technical_round_1',
              start_time: '09:30:00',
              status: 'scheduled',
              timezone: 'Asia/Ho_Chi_Minh',
              type: 'online',
              updated_at: '2026-06-13T00:00:00.000Z'
            },
            job_id: 'job-1',
            null_fields: ['cover_letter'],
            offer: {
              application_id: 'application-1',
              bonus_details: '',
              contract_document_url: '',
              created_at: '2026-06-14T00:00:00.000Z',
              currency: 'USD',
              employment_type: 'fulltime',
              expires_at: '2099-06-30T00:00:00.000Z',
              id: 'offer-1',
              location: 'Ho Chi Minh City',
              message: '',
              null_fields: ['bonus_details', 'contract_document_url', 'message'],
              responded_at: '',
              salary: '3000',
              seniority_label: 'Senior',
              sent_at: '2026-06-14T08:00:00.000Z',
              start_date: '2026-07-01',
              status: 'sent',
              title: 'Backend Engineer',
              updated_at: '2026-06-14T08:00:00.000Z',
              viewed_at: '',
              work_model: 'hybrid'
            },
            resume_id: 'resume-1',
            status: 'offer',
            updated_at: '2026-06-14T08:00:00.000Z'
          }
        };
      },
      async applyToJob() {
        throw new Error('unused');
      },
      async getEmployerApplicationById() {
        throw new Error('unused');
      },
      async getApplicationCountsByJobIds() {
        throw new Error('unused');
      },
      async listCandidateApplications() {
        throw new Error('unused');
      },
      async listJobApplications() {
        throw new Error('unused');
      },
      async updateApplicationStatus() {
        throw new Error('unused');
      },
      async withdrawApplication() {
        throw new Error('unused');
      }
    } as never,
    {
      async getResumeById() {
        return {
          resume: {
            id: 'resume-1',
            title: 'Resume A'
          }
        };
      }
    } as never,
    {
      async getJobForApplication() {
        throw new Error('unused');
      },
      async getEmployerJobById() {
        throw new Error('unused');
      },
      async listJobsByIds() {
        return {
          items: [
            {
              city: 'Ho Chi Minh City',
              company_logo_url: '',
              company_name: 'CareerHub',
              country: 'Vietnam',
              currency: 'USD',
              employment_type: 'fulltime',
              expires_at: '',
              id: 'job-1',
              is_remote: true,
              null_fields: ['company_logo_url', 'expires_at'],
              salary_max: 4000,
              salary_min: 3000,
              slug: 'backend-engineer',
              status: 'published',
              title: 'Backend Engineer'
            }
          ]
        };
      }
    } as never
  );

  const result = await service.getCandidateApplication({
    applicationId: 'application-1',
    identityId: 'candidate-1'
  });

  assert.equal(result.interview.exists, true);
  assert.equal(result.interview.id, 'interview-1');
  assert.equal(result.availableActions.viewInterview, true);
  assert.equal(result.offer.exists, true);
  assert.equal(result.availableActions.acceptOffer, true);
  assert.equal(result.availableActions.declineOffer, true);
});

test('ats board derives stage context from interview and offer payloads', async () => {
  const service = new GatewayApplicationsService(
    {
      async listJobApplications() {
        return {
          items: [
            {
              candidate_identity_id: 'candidate-1',
              cover_letter: '',
              created_at: '2026-06-12T00:00:00.000Z',
              employer_identity_id: 'employer-1',
              id: 'application-1',
              interview: {
                application_id: 'application-1',
                caller_info: '',
                candidate_response_note: '',
                contact_info: '',
                created_at: '2026-06-13T00:00:00.000Z',
                date: '2026-06-20',
                end_time: '',
                full_address: '',
                id: 'interview-1',
                location_detail: '',
                map_link: '',
                meeting_id: '',
                meeting_link: '',
                notes_to_candidate: '',
                null_fields: [
                  'caller_info',
                  'candidate_response_note',
                  'contact_info',
                  'end_time',
                  'full_address',
                  'location_detail',
                  'map_link',
                  'meeting_id',
                  'meeting_link',
                  'notes_to_candidate',
                  'office_name',
                  'passcode',
                  'phone_number',
                  'platform',
                  'timezone'
                ],
                office_name: '',
                passcode: '',
                phone_number: '',
                platform: '',
                round: 'technical_round_1',
                start_time: '09:30:00',
                status: 'scheduled',
                timezone: '',
                type: 'online',
                updated_at: '2026-06-13T00:00:00.000Z'
              },
              job_id: 'job-1',
              null_fields: ['cover_letter'],
              resume_id: 'resume-1',
              status: 'interview',
              updated_at: '2026-06-13T00:00:00.000Z'
            },
            {
              candidate_identity_id: 'candidate-2',
              cover_letter: '',
              created_at: '2026-06-12T00:00:00.000Z',
              employer_identity_id: 'employer-1',
              id: 'application-2',
              job_id: 'job-1',
              null_fields: ['cover_letter'],
              offer: {
                application_id: 'application-2',
                bonus_details: '',
                contract_document_url: '',
                created_at: '2026-06-14T00:00:00.000Z',
                currency: 'USD',
                employment_type: 'fulltime',
                expires_at: '2099-06-30T00:00:00.000Z',
                id: 'offer-1',
                location: 'Ho Chi Minh City',
                message: '',
                null_fields: ['bonus_details', 'contract_document_url', 'message'],
                responded_at: '',
                salary: '3000',
                seniority_label: 'Senior',
                sent_at: '2026-06-14T08:00:00.000Z',
                start_date: '2026-07-01',
                status: 'sent',
                title: 'Backend Engineer',
                updated_at: '2026-06-14T08:00:00.000Z',
                viewed_at: '',
                work_model: 'hybrid'
              },
              resume_id: 'resume-2',
              status: 'offer',
              updated_at: '2026-06-14T08:00:00.000Z'
            }
          ],
          meta: {
            page: 1,
            page_size: 20,
            total: 2
          }
        };
      },
      async applyToJob() {
        throw new Error('unused');
      },
      async getApplicationHistory() {
        throw new Error('unused');
      },
      async getCandidateApplicationById() {
        throw new Error('unused');
      },
      async getEmployerApplicationById() {
        throw new Error('unused');
      },
      async getApplicationCountsByJobIds() {
        throw new Error('unused');
      },
      async listCandidateApplications() {
        throw new Error('unused');
      },
      async updateApplicationStatus() {
        throw new Error('unused');
      },
      async withdrawApplication() {
        throw new Error('unused');
      }
    } as never,
    {
      async getCandidateProfileByIdentityId(payload: { identity_id: string }) {
        return {
          profile: {
            address: 'Ho Chi Minh City',
            full_name: payload.identity_id === 'candidate-1' ? 'Alice' : 'Bob',
            headline: 'Engineer',
            null_fields: [],
            years_experience: 3
          }
        };
      },
      async getResumeById(payload: { resume_id: string }) {
        return {
          resume: {
            content_json: JSON.stringify({
              fullName: payload.resume_id === 'resume-1' ? 'Alice' : 'Bob',
              headline: 'Engineer',
              skills: [{ name: 'Node.js' }]
            }),
            title: 'Resume'
          }
        };
      }
    } as never,
    {
      async getEmployerJobById() {
        return {
          job: {
            city: 'Ho Chi Minh City',
            country: 'Vietnam',
            currency: 'USD',
            id: 'job-1',
            is_remote: false,
            null_fields: [],
            salary_max: 4000,
            salary_min: 3000,
            status: 'published',
            title: 'Backend Engineer'
          }
        };
      },
      async getJobForApplication() {
        throw new Error('unused');
      }
    } as never
  );

  const result = await service.getAtsBoard({
    identityId: 'employer-1',
    jobId: 'job-1'
  });

  assert.equal(result.applications[0]?.stageContext?.type, 'interview');
  assert.equal(result.applications[0]?.stageContext?.label, 'Interview: 20/06, 09:30');
  assert.equal(result.applications[1]?.stageContext?.type, 'offer');
  assert.equal(result.applications[1]?.stageContext?.label, 'Offer: 14/06, 08:00');
});
