import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ResumeTemplateListItemRecord,
  ResumeTemplateRepository
} from '../../ports';
import { ListResumeTemplatesQueryHandler } from './list-resume-templates.query-handler';

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

test('returns the active resume templates', async () => {
  const templates: ResumeTemplateListItemRecord[] = [
    {
      category: 'modern',
      id: 'template-1',
      name: 'Modern',
      thumbnail: 'https://example.test/modern.png'
    },
    {
      category: null,
      id: 'template-2',
      name: 'Classic',
      thumbnail: null
    }
  ];

  const handler = new ListResumeTemplatesQueryHandler(
    createRepository({
      async listActive() {
        return templates;
      }
    })
  );

  const result = await handler.execute();

  assert.deepEqual(result, templates);
});

test('returns an empty list when there are no active templates', async () => {
  const handler = new ListResumeTemplatesQueryHandler(createRepository());

  const result = await handler.execute();

  assert.deepEqual(result, []);
});
