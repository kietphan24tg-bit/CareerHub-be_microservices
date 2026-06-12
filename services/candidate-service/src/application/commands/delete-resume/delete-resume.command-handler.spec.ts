import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { createEmptyResumeContent } from '../../../domain/resume/resume-content.types';
import { ResumeOwner, ResumeTitle } from '../../../domain/resume/value-objects';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import type {
  CandidateProfileRepository,
  CandidateWriteTransaction,
  ResumeRepository
} from '../../ports';
import { DeleteResumeCommandHandler } from './delete-resume.command-handler';

function buildResume(input: { id: string; identityId: string; isUsing?: boolean }) {
  return ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID(input.id),
    props: {
      content: createEmptyResumeContent(),
      isUsing: input.isUsing ?? false,
      owner: new ResumeOwner(input.identityId),
      templateId: 'template-1',
      title: new ResumeTitle('My Resume')
    },
    updatedAt: new Date()
  });
}

function createWriteTransaction(
  candidateProfileRepository: CandidateProfileRepository,
  resumeRepository: ResumeRepository
): CandidateWriteTransaction {
  return {
    async execute(work) {
      return work({
        candidateProfileRepository,
        outboxRepository: {
          async claimPending() {
            return null;
          },
          async create() {},
          async deleteProcessedBatch() {
            return 0;
          },
          async findPendingBatch() {
            return [];
          },
          async markFailed() {},
          async markProcessed() {},
          async requeueRetryableFailed() {
            return 0;
          },
          async requeueStaleProcessing() {
            return 0;
          },
          async summarizeBacklog() {
            return {
              failed: 0,
              pending: 0,
              processing: 0
            };
          }
        },
        resumeRepository
      });
    }
  };
}

test('delete resume clears profile link and isUsing before deleting', async () => {
  const resume = buildResume({
    id: 'resume-1',
    identityId: 'identity-1',
    isUsing: true
  });
  const calls: string[] = [];

  const profileRepository: CandidateProfileRepository = {
    async clearResumeIdIfMatches(identityId, resumeId) {
      calls.push(`clear-profile:${identityId}:${resumeId}`);
    },
    async deleteByIdentityId() {
      return false;
    },
    async existsByIdentityId() {
      return true;
    },
    async findByIdentityId() {
      return null;
    },
    async save() {},
    async updateByIdentityId() {
      return null;
    }
  };

  const resumeRepository: ResumeRepository = {
    async clearIsUsingByIdentityId(identityId) {
      calls.push(`clear-is-using:${identityId}`);
    },
    async deleteById(id) {
      calls.push(`delete:${id}`);
    },
    async findById(id) {
      return id === 'resume-1' ? resume : null;
    },
    async findByIdentityAndTemplateId() {
      return null;
    },
    async findByIdentityId() {
      return [];
    },
    async save() {},
    async update() {}
  };

  const handler = new DeleteResumeCommandHandler(
    resumeRepository,
    createWriteTransaction(profileRepository, resumeRepository)
  );

  await handler.execute({
    identityId: 'identity-1',
    resumeId: 'resume-1'
  });

  assert.deepEqual(calls, [
    'clear-profile:identity-1:resume-1',
    'clear-is-using:identity-1',
    'delete:resume-1'
  ]);
});

test('delete resume skips isUsing cleanup when resume is not active', async () => {
  const resume = buildResume({
    id: 'resume-2',
    identityId: 'identity-1',
    isUsing: false
  });
  const calls: string[] = [];

  const profileRepository: CandidateProfileRepository = {
    async clearResumeIdIfMatches(identityId, resumeId) {
      calls.push(`clear-profile:${identityId}:${resumeId}`);
    },
    async deleteByIdentityId() {
      return false;
    },
    async existsByIdentityId() {
      return true;
    },
    async findByIdentityId() {
      return null;
    },
    async save() {},
    async updateByIdentityId() {
      return null;
    }
  };

  const resumeRepository: ResumeRepository = {
    async clearIsUsingByIdentityId() {
      calls.push('clear-is-using');
    },
    async deleteById(id) {
      calls.push(`delete:${id}`);
    },
    async findById(id) {
      return id === 'resume-2' ? resume : null;
    },
    async findByIdentityAndTemplateId() {
      return null;
    },
    async findByIdentityId() {
      return [];
    },
    async save() {},
    async update() {}
  };

  const handler = new DeleteResumeCommandHandler(
    resumeRepository,
    createWriteTransaction(profileRepository, resumeRepository)
  );

  await handler.execute({
    identityId: 'identity-1',
    resumeId: 'resume-2'
  });

  assert.deepEqual(calls, ['clear-profile:identity-1:resume-2', 'delete:resume-2']);
});

test('delete resume throws when resume does not belong to candidate', async () => {
  const handler = new DeleteResumeCommandHandler(
    {
      async clearIsUsingByIdentityId() {},
      async deleteById() {},
      async findById() {
        return null;
      },
      async findByIdentityAndTemplateId() {
        return null;
      },
      async findByIdentityId() {
        return [];
      },
      async save() {},
      async update() {}
    },
    createWriteTransaction(
      {
        async clearResumeIdIfMatches() {},
        async deleteByIdentityId() {
          return false;
        },
        async existsByIdentityId() {
          return true;
        },
        async findByIdentityId() {
          return null;
        },
        async save() {},
        async updateByIdentityId() {
          return null;
        }
      },
      {
        async clearIsUsingByIdentityId() {},
        async deleteById() {},
        async findById() {
          return null;
        },
        async findByIdentityAndTemplateId() {
          return null;
        },
        async findByIdentityId() {
          return [];
        },
        async save() {},
        async update() {}
      }
    )
  );

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1',
        resumeId: 'resume-missing'
      }),
    ResumeNotFoundError
  );
});

test('delete resume rejects blank resume id', async () => {
  const handler = new DeleteResumeCommandHandler(
    {
      async clearIsUsingByIdentityId() {},
      async deleteById() {},
      async findById() {
        return null;
      },
      async findByIdentityAndTemplateId() {
        return null;
      },
      async findByIdentityId() {
        return [];
      },
      async save() {},
      async update() {}
    },
    {
      async execute() {
        throw new Error('unused');
      }
    }
  );

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1',
        resumeId: '   '
      }),
    ValidationError
  );
});
