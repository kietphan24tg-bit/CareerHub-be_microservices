import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { createEmptyResumeContent } from '../../../domain/resume/resume-content.types';
import { ResumeOwner, ResumeTitle } from '../../../domain/resume/value-objects';
import { ResumeNotFoundError } from '../../errors/resume-not-found.error';
import { ResumeTemplateNotFoundError } from '../../errors/resume-template-not-found.error';
import { GetResumeExportPayloadQueryHandler } from './get-resume-export-payload.query-handler';

test('get resume export payload returns resume and template', async () => {
  const resume = ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-1',
      title: new ResumeTitle('Export Resume')
    },
    updatedAt: new Date()
  });

  const handler = new GetResumeExportPayloadQueryHandler(
    {
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
    },
    {
      async findActiveById(templateId) {
        return templateId === 'template-1'
          ? {
              category: 'professional',
              createdAt: new Date(),
              id: 'template-1',
              isActive: true,
              layoutData: { version: 1 },
              name: 'Classic Professional',
              thumbnail: '/templates/thumb.png'
            }
          : null;
      },
      async listActive() {
        return [];
      }
    }
  );

  const result = await handler.execute({
    identityId: 'identity-1',
    resumeId: 'resume-1'
  });

  assert.equal(result.resume.id, 'resume-1');
  assert.equal(result.template.id, 'template-1');
  assert.equal(result.template.name, 'Classic Professional');
});

test('get resume export payload throws when resume is missing', async () => {
  const handler = new GetResumeExportPayloadQueryHandler(
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
      async findActiveById() {
        return null;
      },
      async listActive() {
        return [];
      }
    }
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

test('get resume export payload throws when template is missing', async () => {
  const resume = ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-missing',
      title: new ResumeTitle('Export Resume')
    },
    updatedAt: new Date()
  });

  const handler = new GetResumeExportPayloadQueryHandler(
    {
      async clearIsUsingByIdentityId() {},
      async deleteById() {},
      async findById() {
        return resume;
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
      async findActiveById() {
        return null;
      },
      async listActive() {
        return [];
      }
    }
  );

  await assert.rejects(
    () =>
      handler.execute({
        identityId: 'identity-1',
        resumeId: 'resume-1'
      }),
    ResumeTemplateNotFoundError
  );
});
