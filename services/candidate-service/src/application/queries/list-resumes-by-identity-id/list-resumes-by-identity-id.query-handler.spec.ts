import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { createEmptyResumeContent } from '../../../domain/resume/resume-content.types';
import { ResumeOwner, ResumeTitle } from '../../../domain/resume/value-objects';
import { ListResumesByIdentityIdQueryHandler } from './list-resumes-by-identity-id.query-handler';

test('lists resumes by identity id', async () => {
  const resumes = [
    ResumeAggregate.reconstitute({
      createdAt: new Date(),
      id: new UniqueEntityID('resume-1'),
      props: {
        content: createEmptyResumeContent(),
        isUsing: true,
        owner: new ResumeOwner('identity-1'),
        templateId: 'template-1',
        title: new ResumeTitle('Primary Resume')
      },
      updatedAt: new Date()
    }),
    ResumeAggregate.reconstitute({
      createdAt: new Date(),
      id: new UniqueEntityID('resume-2'),
      props: {
        content: createEmptyResumeContent(),
        isUsing: false,
        owner: new ResumeOwner('identity-1'),
        templateId: 'template-2',
        title: new ResumeTitle('Secondary Resume')
      },
      updatedAt: new Date()
    })
  ];

  const handler = new ListResumesByIdentityIdQueryHandler({
    async clearIsUsingByIdentityId() {},
    async deleteById() {},
    async findById() {
      return null;
    },
    async findByIdentityAndTemplateId() {
      return null;
    },
    async findByIdentityId(identityId) {
      return identityId === 'identity-1' ? resumes : [];
    },
    async save() {},
    async update() {}
  });

  const result = await handler.execute({
    identityId: 'identity-1'
  });

  assert.equal(result.length, 2);
  assert.equal(result[0]?.id, 'resume-1');
  assert.equal(result[1]?.title, 'Secondary Resume');
});

test('rejects blank identity id when listing resumes', async () => {
  const handler = new ListResumesByIdentityIdQueryHandler({
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
        identityId: '   '
      }),
    ValidationError
  );
});
