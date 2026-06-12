import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID } from '@careerhub/shared-kernel';
import { createEmptyResumeContent } from '../../../domain/resume/resume-content.types';
import { ResumeAggregate } from '../../../domain/resume/resume.aggregate';
import { ResumeOwner, ResumeTitle } from '../../../domain/resume/value-objects';
import { CreateOrGetTemplateDraftCommandHandler } from './create-or-get-template-draft.command-handler';

function buildExistingAggregate() {
  return ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-1',
      title: new ResumeTitle('Existing Draft')
    },
    updatedAt: new Date()
  });
}

test('create or get template draft returns existing draft', async () => {
  const existing = buildExistingAggregate();

  const handler = new CreateOrGetTemplateDraftCommandHandler(
    {
      async clearIsUsingByIdentityId() {},
      async deleteById() {},
      async findById() {
        return null;
      },
      async findByIdentityAndTemplateId() {
        return existing;
      },
      async findByIdentityId() {
        return [];
      },
      async save() {
        throw new Error('should not create');
      },
      async update() {
        throw new Error('unused');
      }
    },
    {
      async findActiveById() {
        throw new Error('unused');
      },
      async listActive() {
        return [];
      }
    },
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
      generate() {
        return 'unused';
      }
    }
  );

  const result = await handler.execute({
    identityId: 'identity-1',
    templateId: 'template-1'
  });

  assert.equal(result.id, 'resume-1');
  assert.equal(result.title, 'Existing Draft');
});

test('create or get template draft creates a new draft from template', async () => {
  const handler = new CreateOrGetTemplateDraftCommandHandler(
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
        return undefined;
      },
      async update() {
        throw new Error('unused');
      }
    },
    {
      async findActiveById(templateId) {
        return {
          category: 'professional',
          createdAt: new Date(),
          id: templateId,
          isActive: true,
          layoutData: { version: 1 },
          name: 'Classic Professional',
          thumbnail: null
        };
      },
      async listActive() {
        return [];
      }
    },
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
      generate() {
        return 'resume-new';
      }
    }
  );

  const result = await handler.execute({
    identityId: 'identity-1',
    templateId: 'template-1'
  });

  assert.equal(result.id, 'resume-new');
  assert.equal(result.templateId, 'template-1');
  assert.equal(result.title, 'Classic Professional');
});
