import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { createEmptyResumeContent } from '../../../domain/resume/resume-content.types';
import { ResumeTemplateNotFoundError } from '../../errors/resume-template-not-found.error';
import type { ResumeRepository } from '../../ports';
import { CreateResumeCommandHandler } from './create-resume.command-handler';

test('create resume persists aggregate for active template', async () => {
  const saved: Array<{ id: string; identityId: string; title: string }> = [];

  const handler = new CreateResumeCommandHandler(
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
      async save(resume) {
        saved.push({
          id: resume.id.toString(),
          identityId: resume.identityId,
          title: resume.title.value
        });
      },
      async update() {}
    } satisfies ResumeRepository,
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
              thumbnail: null
            }
          : null;
      },
      async listActive() {
        return [];
      }
    },
    {
      generate() {
        return 'resume-new';
      }
    }
  );

  const result = await handler.execute({
    content: createEmptyResumeContent(),
    identityId: 'identity-1',
    templateId: 'template-1',
    title: 'My Resume'
  });

  assert.equal(result.id, 'resume-new');
  assert.equal(result.title, 'My Resume');
  assert.equal(saved.length, 1);
  assert.equal(saved[0]?.identityId, 'identity-1');
});

test('create resume throws when template is missing', async () => {
  const handler = new CreateResumeCommandHandler(
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
      async save() {
        throw new Error('should not save');
      },
      async update() {}
    },
    {
      async findActiveById() {
        return null;
      },
      async listActive() {
        return [];
      }
    },
    {
      generate() {
        return 'unused';
      }
    }
  );

  await assert.rejects(
    () =>
      handler.execute({
        content: createEmptyResumeContent(),
        identityId: 'identity-1',
        templateId: 'missing-template',
        title: 'My Resume'
      }),
    ResumeTemplateNotFoundError
  );
});

test('create resume rejects blank title', async () => {
  const handler = new CreateResumeCommandHandler(
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
        return {
          category: null,
          createdAt: new Date(),
          id: 'template-1',
          isActive: true,
          layoutData: {},
          name: 'Classic',
          thumbnail: null
        };
      },
      async listActive() {
        return [];
      }
    },
    {
      generate() {
        return 'unused';
      }
    }
  );

  await assert.rejects(
    () =>
      handler.execute({
        content: createEmptyResumeContent(),
        identityId: 'identity-1',
        templateId: 'template-1',
        title: '   '
      }),
    ValidationError
  );
});
