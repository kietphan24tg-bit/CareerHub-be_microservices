import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { createEmptyResumeContent } from '../../../domain/resume/resume-content.types';
import { ResumeOwner, ResumeTitle } from '../../../domain/resume/value-objects';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import { UpdateResumeCommandHandler } from './update-resume.command-handler';

function buildResume() {
  return ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-1',
      title: new ResumeTitle('Old Title')
    },
    updatedAt: new Date()
  });
}

test('update resume changes title and content', async () => {
  const resume = buildResume();
  const updatedTitles: string[] = [];

  const handler = new UpdateResumeCommandHandler({
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
    async update(updatedResume) {
      updatedTitles.push(updatedResume.title.value);
    }
  });

  const content = createEmptyResumeContent();
  content.summary = 'Updated summary';

  const result = await handler.execute({
    content,
    identityId: 'identity-1',
    resumeId: 'resume-1',
    title: 'Updated Title'
  });

  assert.equal(result.title, 'Updated Title');
  assert.equal(result.summary, 'Updated summary');
  assert.deepEqual(updatedTitles, ['Updated Title']);
});

test('update resume throws when resume is not owned by candidate', async () => {
  const handler = new UpdateResumeCommandHandler({
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
        content: createEmptyResumeContent(),
        identityId: 'identity-1',
        resumeId: 'resume-missing',
        title: 'Updated Title'
      }),
    ResumeNotFoundError
  );
});

test('update resume rejects blank identity id', async () => {
  const handler = new UpdateResumeCommandHandler({
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
        content: createEmptyResumeContent(),
        identityId: '   ',
        resumeId: 'resume-1',
        title: 'Updated Title'
      }),
    ValidationError
  );
});
