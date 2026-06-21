import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REGISTRATION_SAGA_STEP_NAMES,
  type CreateRegistrationSagaInput,
  type RegistrationSagaRecord,
  type UpdateRegistrationSagaPatch,
  type UpdateRegistrationSagaStepPatch
} from '../index';
import { RegistrationSagaOrchestrator } from './registration-saga.orchestrator';

function createSagaRecord(
  input: CreateRegistrationSagaInput
): RegistrationSagaRecord {
  const now = new Date('2026-06-20T00:00:00.000Z');

  return {
    compensatedAt: null,
    completedAt: null,
    createdAt: now,
    email: input.email,
    failureCode: null,
    failureMessage: null,
    flow: input.flow,
    id: input.id,
    identityId: null,
    lastStep: null,
    profileId: null,
    profilePayload: input.profilePayload,
    requestId: input.requestId ?? null,
    role: input.role,
    status: 'PENDING',
    steps: input.steps.map((step) => ({
      attempts: 0,
      compensatedAt: null,
      compensationStatus: 'NOT_REQUIRED',
      completedAt: null,
      createdAt: now,
      id: step.id,
      lastError: null,
      resultSnapshot: null,
      sagaId: input.id,
      startedAt: null,
      status: 'PENDING',
      stepName: step.stepName,
      updatedAt: now
    })),
    updatedAt: now
  };
}

function createRepository(options?: {
  existingSaga?: RegistrationSagaRecord | null;
  recoverableSagas?: RegistrationSagaRecord[];
}) {
  const createInputs: CreateRegistrationSagaInput[] = [];
  const recoveryClaims: Array<{
    limit: number;
    staleBefore: Date;
  }> = [];
  const sagaPatches: Array<{
    patch: UpdateRegistrationSagaPatch;
    sagaId: string;
  }> = [];
  const stepPatches: Array<{
    patch: UpdateRegistrationSagaStepPatch;
    sagaId: string;
    stepName: string;
  }> = [];

  return {
    createInputs,
    recoveryClaims,
    repository: {
      async createSaga(input: CreateRegistrationSagaInput) {
        createInputs.push(input);
        return createSagaRecord(input);
      },
      async findAndClaimRecoverableBatch(input: {
        limit: number;
        staleBefore: Date;
      }) {
        recoveryClaims.push(input);
        return options?.recoverableSagas ?? [];
      },
      async findByRequestId() {
        return options?.existingSaga ?? null;
      },
      async updateSaga(sagaId: string, patch: UpdateRegistrationSagaPatch) {
        sagaPatches.push({ patch, sagaId });
      },
      async updateStep(
        sagaId: string,
        stepName: string,
        patch: UpdateRegistrationSagaStepPatch
      ) {
        stepPatches.push({ patch, sagaId, stepName });
      }
    },
    sagaPatches,
    stepPatches
  };
}

function createOrchestrator(input: {
  candidateClient: Record<string, unknown>;
  employerClient: Record<string, unknown>;
  iamClient: Record<string, unknown>;
  existingSaga?: RegistrationSagaRecord | null;
  recoverableSagas?: RegistrationSagaRecord[];
}) {
  const repositoryState = createRepository({
    existingSaga: input.existingSaga,
    recoverableSagas: input.recoverableSagas
  });
  let sequence = 0;

  return {
    orchestrator: new RegistrationSagaOrchestrator(
      repositoryState.repository as never,
      {
        generate() {
          sequence += 1;
          return `generated-${sequence}`;
        }
      },
      input.iamClient as never,
      input.candidateClient as never,
      input.employerClient as never
    ),
    repositoryState
  };
}

test('registerCandidate completes the happy path through IAM, profile creation, and activation', async () => {
  const calls: string[] = [];
  const { orchestrator, repositoryState } = createOrchestrator({
    candidateClient: {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-1',
          profile_id: 'candidate-profile-1'
        };
      },
      async deleteCandidateProfileCompensation() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    employerClient: {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    iamClient: {
      async activateIdentity() {
        calls.push('iam.activate');
        return {
          identity_id: 'identity-1',
          status: 'active'
        };
      },
      async cancelPendingIdentity() {
        throw new Error('unused');
      },
      async getCurrentIdentity() {
        throw new Error('unused');
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-20T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-1',
          role: 'candidate',
          status: 'pending_profile'
        };
      }
    }
  });

  const result = await orchestrator.registerCandidate({
    acceptTerms: true,
    email: 'candidate@example.com',
    fullName: 'Candidate User',
    password: '12345678',
    phone: '0123456789',
    requestId: 'req-candidate-1'
  });

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'iam.activate'
  ]);
  assert.deepEqual(result, {
    email: 'candidate@example.com',
    identityId: 'identity-1',
    role: 'candidate',
    sagaId: 'generated-1',
    status: 'COMPLETED'
  });
  assert.equal(repositoryState.createInputs.length, 1);
  assert.deepEqual(repositoryState.createInputs[0]?.profilePayload, {
    kind: 'candidate',
    payload: {
      fullName: 'Candidate User',
      phone: '0123456789'
    }
  });
  assert.ok(
    repositoryState.sagaPatches.some(
      ({ patch }) => patch.status === 'COMPLETED'
    )
  );
});

test('registerEmployer compensates the pending identity when profile creation fails and no profile exists', async () => {
  const calls: string[] = [];
  const { orchestrator, repositoryState } = createOrchestrator({
    candidateClient: {
      async createCandidateProfile() {
        throw new Error('unused');
      },
      async deleteCandidateProfileCompensation() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    employerClient: {
      async createEmployerProfile() {
        calls.push('employer.createProfile');
        throw new Error('profile create failed');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        calls.push('employer.getProfile');
        throw Object.assign(new Error('profile missing'), {
          code: 'NOT_FOUND'
        });
      }
    },
    iamClient: {
      async activateIdentity() {
        throw new Error('unused');
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return {
          cancelled: true
        };
      },
      async getCurrentIdentity() {
        throw new Error('unused');
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-20T00:00:00.000Z',
          email: 'employer@example.com',
          identity_id: 'identity-2',
          role: 'employer',
          status: 'pending_profile'
        };
      }
    }
  });

  await assert.rejects(
    () =>
      orchestrator.registerEmployer({
        acceptTerms: true,
        address: '123 Street',
        companyEmail: 'employer@example.com',
        companyName: 'CareerHub',
        fullName: 'Employer User',
        industry: 'technology',
        password: '12345678',
        phone: '0987654321',
        requestId: 'req-employer-1'
      }),
    /profile create failed/
  );

  assert.deepEqual(calls, [
    'iam.register',
    'employer.createProfile',
    'employer.getProfile',
    'iam.cancelPending'
  ]);
  assert.ok(
    repositoryState.sagaPatches.some(
      ({ patch }) => patch.status === 'COMPENSATED'
    )
  );
  assert.ok(
    repositoryState.stepPatches.some(
      ({ patch, stepName }) =>
        stepName === REGISTRATION_SAGA_STEP_NAMES.registerIdentity &&
        patch.compensationStatus === 'COMPENSATED'
    )
  );
});

test('registerCandidate treats activation as successful when IAM reports the identity is already active', async () => {
  const calls: string[] = [];
  const { orchestrator } = createOrchestrator({
    candidateClient: {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-3',
          profile_id: 'candidate-profile-3'
        };
      },
      async deleteCandidateProfileCompensation() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    employerClient: {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    iamClient: {
      async activateIdentity() {
        calls.push('iam.activate');
        throw new Error('activation failed');
      },
      async cancelPendingIdentity() {
        throw new Error('unused');
      },
      async getCurrentIdentity() {
        calls.push('iam.getCurrentIdentity');
        return {
          email: 'candidate@example.com',
          identity_id: 'identity-3',
          role: 'candidate',
          status: 'active'
        };
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-20T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-3',
          role: 'candidate',
          status: 'pending_profile'
        };
      }
    }
  });

  const result = await orchestrator.registerCandidate({
    acceptTerms: true,
    email: 'candidate@example.com',
    fullName: 'Candidate User',
    password: '12345678',
    phone: '0123456789',
    requestId: 'req-candidate-2'
  });

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'iam.activate',
    'iam.getCurrentIdentity'
  ]);
  assert.deepEqual(result, {
    email: 'candidate@example.com',
    identityId: 'identity-3',
    role: 'candidate',
    sagaId: 'generated-1',
    status: 'COMPLETED'
  });
});

test('registerCandidate compensates both profile and identity when activation fails for real', async () => {
  const calls: string[] = [];
  const { orchestrator, repositoryState } = createOrchestrator({
    candidateClient: {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-4',
          profile_id: 'candidate-profile-4'
        };
      },
      async deleteCandidateProfileCompensation() {
        calls.push('candidate.deleteCompensation');
        return {
          compensated: true
        };
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    employerClient: {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    iamClient: {
      async activateIdentity() {
        calls.push('iam.activate');
        throw new Error('activation failed');
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return {
          cancelled: true
        };
      },
      async getCurrentIdentity() {
        calls.push('iam.getCurrentIdentity');
        throw Object.assign(new Error('not active'), {
          code: 'NOT_FOUND'
        });
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-20T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-4',
          role: 'candidate',
          status: 'pending_profile'
        };
      }
    }
  });

  await assert.rejects(
    () =>
      orchestrator.registerCandidate({
        acceptTerms: true,
        email: 'candidate@example.com',
        fullName: 'Candidate User',
        password: '12345678',
        phone: '0123456789',
        requestId: 'req-candidate-3'
      }),
    /activation failed/
  );

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'iam.activate',
    'iam.getCurrentIdentity',
    'candidate.deleteCompensation',
    'iam.cancelPending'
  ]);
  assert.ok(
    repositoryState.sagaPatches.some(
      ({ patch }) => patch.status === 'COMPENSATED'
    )
  );
});

test('registerCandidate does not compensate when activation read recovery fails with a transient error', async () => {
  const calls: string[] = [];
  const { orchestrator, repositoryState } = createOrchestrator({
    candidateClient: {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-5',
          profile_id: 'candidate-profile-5'
        };
      },
      async deleteCandidateProfileCompensation() {
        calls.push('candidate.deleteCompensation');
        return {
          compensated: true
        };
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    employerClient: {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    iamClient: {
      async activateIdentity() {
        calls.push('iam.activate');
        throw new Error('activation failed');
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return {
          cancelled: true
        };
      },
      async getCurrentIdentity() {
        calls.push('iam.getCurrentIdentity');
        throw Object.assign(new Error('iam temporarily unavailable'), {
          code: 'INTERNAL'
        });
      },
      async registerIdentity() {
        calls.push('iam.register');
        return {
          created_at: '2026-06-20T00:00:00.000Z',
          email: 'candidate@example.com',
          identity_id: 'identity-5',
          role: 'candidate',
          status: 'pending_profile'
        };
      }
    }
  });

  await assert.rejects(
    () =>
      orchestrator.registerCandidate({
        acceptTerms: true,
        email: 'candidate@example.com',
        fullName: 'Candidate User',
        password: '12345678',
        phone: '0123456789',
        requestId: 'req-candidate-4'
      }),
    /iam temporarily unavailable/
  );

  assert.deepEqual(calls, [
    'iam.register',
    'candidate.createProfile',
    'iam.activate',
    'iam.getCurrentIdentity'
  ]);
  assert.ok(
    repositoryState.sagaPatches.some(
      ({ patch }) => patch.status === 'FAILED'
    )
  );
  assert.equal(
    repositoryState.sagaPatches.some(
      ({ patch }) =>
        patch.status === 'COMPENSATING' || patch.status === 'COMPENSATED'
    ),
    false
  );
});

test('registerCandidate returns the completed saga result for an idempotent repeated request', async () => {
  const existingSaga: RegistrationSagaRecord = {
    ...createSagaRecord({
      email: 'candidate@example.com',
      flow: 'candidate_registration',
      id: 'saga-existing',
      profilePayload: {
        kind: 'candidate',
        payload: {
          fullName: 'Candidate User',
          phone: '0123456789'
        }
      },
      requestId: 'req-candidate-existing',
      role: 'candidate',
      steps: [
        {
          id: 'step-1',
          stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
        },
        {
          id: 'step-2',
          stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
        },
        {
          id: 'step-3',
          stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
        }
      ]
    }),
    identityId: 'identity-existing',
    status: 'COMPLETED'
  };
  const { orchestrator, repositoryState } = createOrchestrator({
    candidateClient: {},
    employerClient: {},
    existingSaga,
    iamClient: {}
  });

  const result = await orchestrator.registerCandidate({
    acceptTerms: true,
    email: 'candidate@example.com',
    fullName: 'Candidate User',
    password: '12345678',
    phone: '0123456789',
    requestId: 'req-candidate-existing'
  });

  assert.deepEqual(result, {
    email: 'candidate@example.com',
    identityId: 'identity-existing',
    role: 'candidate',
    sagaId: 'saga-existing',
    status: 'COMPLETED'
  });
  assert.equal(repositoryState.createInputs.length, 0);
});

test('recoverStaleSagas resumes forward progress for a stale candidate registration', async () => {
  const recoverableSaga: RegistrationSagaRecord = {
    ...createSagaRecord({
      email: 'candidate@example.com',
      flow: 'candidate_registration',
      id: 'saga-recovery-1',
      profilePayload: {
        kind: 'candidate',
        payload: {
          fullName: 'Candidate User',
          phone: '0123456789'
        }
      },
      requestId: 'req-recovery-1',
      role: 'candidate',
      steps: [
        {
          id: 'step-1',
          stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
        },
        {
          id: 'step-2',
          stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
        },
        {
          id: 'step-3',
          stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
        }
      ]
    }),
    identityId: 'identity-recovery-1',
    lastStep: REGISTRATION_SAGA_STEP_NAMES.registerIdentity,
    status: 'IN_PROGRESS',
    steps: [
      {
        ...createSagaRecord({
          email: 'candidate@example.com',
          flow: 'candidate_registration',
          id: 'saga-recovery-1',
          profilePayload: {
            kind: 'candidate',
            payload: {
              fullName: 'Candidate User',
              phone: '0123456789'
            }
          },
          requestId: 'req-recovery-1',
          role: 'candidate',
          steps: [
            {
              id: 'step-1',
              stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
            },
            {
              id: 'step-2',
              stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
            },
            {
              id: 'step-3',
              stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
            }
          ]
        }).steps[0],
        completedAt: new Date('2026-06-20T00:00:10.000Z'),
        resultSnapshot: {
          identityId: 'identity-recovery-1',
          status: 'pending_profile'
        },
        startedAt: new Date('2026-06-20T00:00:05.000Z'),
        status: 'COMPLETED'
      },
      {
        ...createSagaRecord({
          email: 'candidate@example.com',
          flow: 'candidate_registration',
          id: 'saga-recovery-1',
          profilePayload: {
            kind: 'candidate',
            payload: {
              fullName: 'Candidate User',
              phone: '0123456789'
            }
          },
          requestId: 'req-recovery-1',
          role: 'candidate',
          steps: [
            {
              id: 'step-1',
              stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
            },
            {
              id: 'step-2',
              stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
            },
            {
              id: 'step-3',
              stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
            }
          ]
        }).steps[1],
        status: 'PENDING'
      },
      {
        ...createSagaRecord({
          email: 'candidate@example.com',
          flow: 'candidate_registration',
          id: 'saga-recovery-1',
          profilePayload: {
            kind: 'candidate',
            payload: {
              fullName: 'Candidate User',
              phone: '0123456789'
            }
          },
          requestId: 'req-recovery-1',
          role: 'candidate',
          steps: [
            {
              id: 'step-1',
              stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
            },
            {
              id: 'step-2',
              stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
            },
            {
              id: 'step-3',
              stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
            }
          ]
        }).steps[2],
        status: 'PENDING'
      }
    ]
  };
  const calls: string[] = [];
  const { orchestrator, repositoryState } = createOrchestrator({
    candidateClient: {
      async createCandidateProfile() {
        calls.push('candidate.createProfile');
        return {
          identity_id: 'identity-recovery-1',
          profile_id: 'candidate-profile-recovery-1'
        };
      },
      async deleteCandidateProfileCompensation() {
        throw new Error('unused');
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    employerClient: {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    iamClient: {
      async activateIdentity() {
        calls.push('iam.activate');
        return {
          identity_id: 'identity-recovery-1',
          status: 'active'
        };
      },
      async cancelPendingIdentity() {
        throw new Error('unused');
      },
      async getCurrentIdentity() {
        throw new Error('unused');
      },
      async registerIdentity() {
        throw new Error('unused');
      }
    },
    recoverableSagas: [recoverableSaga]
  });

  const claimed = await orchestrator.recoverStaleSagas({
    limit: 10,
    staleBefore: new Date('2026-06-20T01:00:00.000Z')
  });

  assert.equal(claimed, 1);
  assert.deepEqual(calls, ['candidate.createProfile', 'iam.activate']);
  assert.ok(
    repositoryState.sagaPatches.some(
      ({ patch }) => patch.status === 'COMPLETED'
    )
  );
});

test('recoverStaleSagas retries compensation for a stale activation failure', async () => {
  const recoverableSaga: RegistrationSagaRecord = {
    ...createSagaRecord({
      email: 'candidate@example.com',
      flow: 'candidate_registration',
      id: 'saga-recovery-2',
      profilePayload: {
        kind: 'candidate',
        payload: {
          fullName: 'Candidate User',
          phone: '0123456789'
        }
      },
      requestId: 'req-recovery-2',
      role: 'candidate',
      steps: [
        {
          id: 'step-1',
          stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
        },
        {
          id: 'step-2',
          stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
        },
        {
          id: 'step-3',
          stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
        }
      ]
    }),
    identityId: 'identity-recovery-2',
    lastStep: REGISTRATION_SAGA_STEP_NAMES.activateIdentity,
    profileId: 'candidate-profile-recovery-2',
    status: 'COMPENSATION_FAILED',
    steps: [
      {
        ...createSagaRecord({
          email: 'candidate@example.com',
          flow: 'candidate_registration',
          id: 'saga-recovery-2',
          profilePayload: {
            kind: 'candidate',
            payload: {
              fullName: 'Candidate User',
              phone: '0123456789'
            }
          },
          requestId: 'req-recovery-2',
          role: 'candidate',
          steps: [
            {
              id: 'step-1',
              stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
            },
            {
              id: 'step-2',
              stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
            },
            {
              id: 'step-3',
              stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
            }
          ]
        }).steps[0],
        compensationStatus: 'FAILED',
        completedAt: new Date('2026-06-20T00:00:10.000Z'),
        resultSnapshot: {
          identityId: 'identity-recovery-2',
          status: 'pending_profile'
        },
        startedAt: new Date('2026-06-20T00:00:05.000Z'),
        status: 'COMPLETED'
      },
      {
        ...createSagaRecord({
          email: 'candidate@example.com',
          flow: 'candidate_registration',
          id: 'saga-recovery-2',
          profilePayload: {
            kind: 'candidate',
            payload: {
              fullName: 'Candidate User',
              phone: '0123456789'
            }
          },
          requestId: 'req-recovery-2',
          role: 'candidate',
          steps: [
            {
              id: 'step-1',
              stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
            },
            {
              id: 'step-2',
              stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
            },
            {
              id: 'step-3',
              stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
            }
          ]
        }).steps[1],
        compensationStatus: 'FAILED',
        completedAt: new Date('2026-06-20T00:00:20.000Z'),
        resultSnapshot: {
          profileId: 'candidate-profile-recovery-2'
        },
        startedAt: new Date('2026-06-20T00:00:15.000Z'),
        status: 'COMPLETED'
      },
      {
        ...createSagaRecord({
          email: 'candidate@example.com',
          flow: 'candidate_registration',
          id: 'saga-recovery-2',
          profilePayload: {
            kind: 'candidate',
            payload: {
              fullName: 'Candidate User',
              phone: '0123456789'
            }
          },
          requestId: 'req-recovery-2',
          role: 'candidate',
          steps: [
            {
              id: 'step-1',
              stepName: REGISTRATION_SAGA_STEP_NAMES.registerIdentity
            },
            {
              id: 'step-2',
              stepName: REGISTRATION_SAGA_STEP_NAMES.createProfile
            },
            {
              id: 'step-3',
              stepName: REGISTRATION_SAGA_STEP_NAMES.activateIdentity
            }
          ]
        }).steps[2],
        lastError: 'activation failed',
        startedAt: new Date('2026-06-20T00:00:25.000Z'),
        status: 'FAILED'
      }
    ]
  };
  const calls: string[] = [];
  const { orchestrator, repositoryState } = createOrchestrator({
    candidateClient: {
      async createCandidateProfile() {
        throw new Error('unused');
      },
      async deleteCandidateProfileCompensation() {
        calls.push('candidate.deleteCompensation');
        return {
          compensated: true
        };
      },
      async getCandidateProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    employerClient: {
      async createEmployerProfile() {
        throw new Error('unused');
      },
      async deleteEmployerProfileCompensation() {
        throw new Error('unused');
      },
      async getEmployerProfileByIdentityId() {
        throw new Error('unused');
      }
    },
    iamClient: {
      async activateIdentity() {
        throw new Error('unused');
      },
      async cancelPendingIdentity() {
        calls.push('iam.cancelPending');
        return {
          cancelled: true
        };
      },
      async getCurrentIdentity() {
        throw new Error('unused');
      },
      async registerIdentity() {
        throw new Error('unused');
      }
    },
    recoverableSagas: [recoverableSaga]
  });

  const claimed = await orchestrator.recoverStaleSagas({
    limit: 10,
    staleBefore: new Date('2026-06-20T01:00:00.000Z')
  });

  assert.equal(claimed, 1);
  assert.equal(calls.includes('candidate.deleteCompensation'), true);
  assert.equal(calls.includes('iam.cancelPending'), true);
  assert.ok(
    repositoryState.sagaPatches.some(
      ({ patch }) => patch.status === 'COMPENSATED'
    )
  );
});
