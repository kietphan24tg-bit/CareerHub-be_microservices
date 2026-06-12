import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { ResumeTemplateNotFoundError } from '../../errors/resume-template-not-found.error';
import type {
  ResumeTemplateRecord,
  ResumeTemplateRepository
} from '../../ports';
import { GetResumeTemplateByIdQueryHandler } from './get-resume-template-by-id.query-handler';

function createRepository(
  overrides: Partial<ResumeTemplateRepository> = {}
): ResumeTemplateRepository {
  return {
    async findActiveById() {
      return null;
    },
    async listActive() {
      return [];
    },
    ...overrides
  };
}

const template: ResumeTemplateRecord = {
  category: 'modern',
  createdAt: new Date('2026-06-06T00:00:00.000Z'),
  id: 'template-1',
  isActive: true,
  layoutData: { sections: ['header'] },
  name: 'Modern',
  thumbnail: 'https://example.test/modern.png'
};

test('returns the active template by id', async () => {
  const requestedIds: string[] = [];
  const handler = new GetResumeTemplateByIdQueryHandler(
    createRepository({
      async findActiveById(templateId) {
        requestedIds.push(templateId);
        return template;
      }
    })
  );

  const result = await handler.execute({ templateId: '  template-1  ' });

  assert.deepEqual(result, template);
  assert.deepEqual(requestedIds, ['template-1']);
});

test('throws when the template is missing or inactive', async () => {
  const handler = new GetResumeTemplateByIdQueryHandler(
    createRepository({
      async findActiveById() {
        return null;
      }
    })
  );

  await assert.rejects(
    () => handler.execute({ templateId: 'template-missing' }),
    ResumeTemplateNotFoundError
  );
});

test('rejects a blank template id', async () => {
  const handler = new GetResumeTemplateByIdQueryHandler(
    createRepository({
      async findActiveById() {
        throw new Error('findActiveById should not be called');
      }
    })
  );

  await assert.rejects(
    () => handler.execute({ templateId: '   ' }),
    ValidationError
  );
});
