import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { CandidateProfileNotFoundError } from '../../errors/candidate-profile-not-found.error';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import type {
  CandidateProfileRecord,
  CandidateProfileRepository,
  CandidateWriteTransaction,
  ResumeRepository,
  UpdateCandidateProfilePatch
} from '../../ports';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { createEmptyResumeContent } from '../../../domain/resume/resume-content.types';
import { ResumeOwner, ResumeTitle } from '../../../domain/resume/value-objects';
import { CandidateProfileOperationsService } from '../../services/candidate-profile-operations.service';
import { UpdateCandidateProfileCommandHandler } from './update-candidate-profile.command-handler';

const candidateProfileOperations = new CandidateProfileOperationsService();

function buildOwnedResume(resumeId: string, identityId: string) {
  return ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID(resumeId),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner(identityId),
      templateId: 'template-1',
      title: new ResumeTitle('Default Resume')
    },
    updatedAt: new Date()
  });
}

function createProfileRecord(
  identityId: string,
  patch: UpdateCandidateProfilePatch = {}
): CandidateProfileRecord {
  return {
    address: patch.address ?? null,
    avatarUrl: patch.avatarUrl ?? null,
    bio: patch.bio ?? null,
    createdAt: new Date('2026-06-06T00:00:00.000Z'),
    fullName: patch.fullName ?? 'Candidate',
    githubUrl: patch.githubUrl ?? null,
    headline: patch.headline ?? null,
    id: 'candidate-profile-1',
    identityId,
    linkedinUrl: patch.linkedinUrl ?? null,
    phone: patch.phone ?? null,
    portfolioUrl: patch.portfolioUrl ?? null,
    resumeId: patch.resumeId ?? null,
    updatedAt: new Date('2026-06-06T01:00:00.000Z'),
    yearsExperience: patch.yearsExperience ?? null
  };
}

function createRepository(
  updateByIdentityId: (
    identityId: string,
    patch: UpdateCandidateProfilePatch
  ) => Promise<CandidateProfileRecord | null>
): CandidateProfileRepository {
  return {
    async clearResumeIdIfMatches() {},
    async existsByIdentityId() {
      return true;
    },
    async findByIdentityId() {
      return null;
    },
    async save() {},
    async deleteByIdentityId() {
      return false;
    },
    updateByIdentityId
  };
}

function createWriteTransaction(
  candidateProfileRepository: CandidateProfileRepository,
  resumeRepository: ResumeRepository
): CandidateWriteTransaction {
  return {
    async execute(work) {
      return work({
        candidateProfileRepository,
        resumeRepository
      });
    }
  };
}

test('updates candidate profile successfully', async () => {
  const repository = createRepository(async (identityId, patch) =>
    createProfileRecord(identityId, patch)
  );
  const handler = new UpdateCandidateProfileCommandHandler(
    repository,
    createWriteTransaction(repository, {
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
    }),
    candidateProfileOperations
  );

  const result = await handler.execute({
    fullName: 'Updated Candidate',
    githubUrl: 'https://github.com/candidate',
    identityId: 'identity-1',
    requestId: 'req-candidate-1',
    yearsExperience: 3
  });

  assert.equal(result.fullName, 'Updated Candidate');
  assert.equal(result.githubUrl, 'https://github.com/candidate');
  assert.equal(result.yearsExperience, 3);
});

test('throws when updated candidate profile does not exist', async () => {
  const repository = createRepository(async () => null);
  const handler = new UpdateCandidateProfileCommandHandler(
    repository,
    createWriteTransaction(repository, {
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
    }),
    candidateProfileOperations
  );

  await assert.rejects(
    () =>
      handler.execute({
        headline: 'Updated',
        identityId: 'identity-missing'
      }),
    CandidateProfileNotFoundError
  );
});

test('throws when candidate update payload is empty', async () => {
  const repository = createRepository(async () => null);
  const handler = new UpdateCandidateProfileCommandHandler(
    repository,
    createWriteTransaction(repository, {
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
    }),
    candidateProfileOperations
  );

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1'
      }),
    ValidationError
  );
});

test('throws when resume id does not belong to candidate', async () => {
  const repository = createRepository(async (identityId, patch) =>
    createProfileRecord(identityId, patch)
  );
  const handler = new UpdateCandidateProfileCommandHandler(
    repository,
    createWriteTransaction(repository, {
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
    }),
    candidateProfileOperations
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

test('syncs isUsing when resume id is set on profile', async () => {
  const resume = buildOwnedResume('resume-1', 'identity-1');
  const calls: string[] = [];

  const repository = createRepository(async (identityId, patch) =>
    createProfileRecord(identityId, patch)
  );
  const resumeRepository: ResumeRepository = {
    async clearIsUsingByIdentityId(identityId, exceptResumeId) {
      calls.push(`clear:${identityId}:${exceptResumeId ?? ''}`);
    },
    async deleteById() {},
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
    async update(updatedResume) {
      calls.push(`update:${updatedResume.id.toString()}:${updatedResume.isUsing}`);
    }
  };

  const handler = new UpdateCandidateProfileCommandHandler(
    repository,
    createWriteTransaction(repository, resumeRepository),
    candidateProfileOperations
  );

  const result = await handler.execute({
    identityId: 'identity-1',
    resumeId: 'resume-1'
  });

  assert.equal(result.resumeId, 'resume-1');
  assert.deepEqual(calls, ['clear:identity-1:resume-1', 'update:resume-1:true']);
});

test('clears isUsing when resume id is cleared on profile', async () => {
  const calls: string[] = [];

  const repository = createRepository(async (identityId, patch) =>
    createProfileRecord(identityId, patch)
  );
  const resumeRepository: ResumeRepository = {
    async clearIsUsingByIdentityId(identityId) {
      calls.push(`clear-all:${identityId}`);
    },
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
  };

  const handler = new UpdateCandidateProfileCommandHandler(
    repository,
    createWriteTransaction(repository, resumeRepository),
    candidateProfileOperations
  );

  const result = await handler.execute({
    identityId: 'identity-1',
    resumeId: null
  });

  assert.equal(result.resumeId, null);
  assert.deepEqual(calls, ['clear-all:identity-1']);
});
