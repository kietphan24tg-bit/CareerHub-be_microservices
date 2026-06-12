import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { createEmptyResumeContent } from '../../../domain/resume/resume-content.types';
import { ResumeOwner, ResumeTitle } from '../../../domain/resume/value-objects';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import { GetResumeByIdQueryHandler } from './get-resume-by-id.query-handler';

test('get resume by id returns owned resume', async () => {
  const resume = ResumeAggregate.reconstitute({
    createdAt: new Date('2026-06-06T00:00:00.000Z'),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: true,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-1',
      title: new ResumeTitle('My Resume')
    },
    updatedAt: new Date('2026-06-06T01:00:00.000Z')
  });

  const handler = new GetResumeByIdQueryHandler({
    async clearIsUsingByIdentityId() {},
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
    async update() {}
  });

  const result = await handler.execute({
    identityId: 'identity-1',
    resumeId: 'resume-1'
  });

  assert.equal(result.id, 'resume-1');
  assert.equal(result.title, 'My Resume');
  assert.equal(result.isUsing, true);
});

test('get resume by id throws when resume is missing', async () => {
  const handler = new GetResumeByIdQueryHandler({
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
  });

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1',
        resumeId: 'resume-missing'
      }),
    ResumeNotFoundError
  );
});

test('get resume by id rejects blank resume id', async () => {
  const handler = new GetResumeByIdQueryHandler({
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
  });

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1',
        resumeId: '   '
      }),
    ValidationError
  );
});
