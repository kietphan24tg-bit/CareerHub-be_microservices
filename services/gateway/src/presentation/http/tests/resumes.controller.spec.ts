import assert from 'node:assert/strict';
import test from 'node:test';
import { ResumesController } from '../resumes/resumes.controller';

test('resumes controller lists templates', async () => {
  const controller = new ResumesController(
    {
      async createOrGetTemplateDraft() {
        throw new Error('unused');
      },
      async createResume() {
        throw new Error('unused');
      },
      async deleteResume() {
        throw new Error('unused');
      },
      async getExportPayload() {
        throw new Error('unused');
      },
      async getResumeDetail() {
        throw new Error('unused');
      },
      async getTemplateDetail() {
        throw new Error('unused');
      },
      async listResumes() {
        throw new Error('unused');
      },
      async listTemplates() {
        return [
          {
            category: 'professional',
            id: 'template-1',
            name: 'Classic Professional',
            thumbnail: null
          }
        ];
      },
      async updateResume() {
        throw new Error('unused');
      }
    } as never,
    {
      async exportResumePdf() {
        throw new Error('unused');
      },
      async getExportPayloadByToken() {
        throw new Error('unused');
      },
      signExportToken() {
        return 'token';
      },
      verifyExportToken() {
        throw new Error('unused');
      }
    } as never
  );

  const response = await controller.listTemplates('req-1');

  assert.equal(response.data.length, 1);
  assert.equal(response.data[0]?.id, 'template-1');
});

test('resumes controller returns export payload by token', async () => {
  const controller = new ResumesController(
    {
      async createOrGetTemplateDraft() {
        throw new Error('unused');
      },
      async createResume() {
        throw new Error('unused');
      },
      async deleteResume() {
        throw new Error('unused');
      },
      async getExportPayload() {
        throw new Error('unused');
      },
      async getResumeDetail() {
        throw new Error('unused');
      },
      async getTemplateDetail() {
        throw new Error('unused');
      },
      async listResumes() {
        throw new Error('unused');
      },
      async listTemplates() {
        throw new Error('unused');
      },
      async updateResume() {
        throw new Error('unused');
      }
    } as never,
    {
      async exportResumePdf() {
        throw new Error('unused');
      },
      async getExportPayloadByToken() {
        return {
          resume: {
            id: 'resume-1',
            isUsing: true,
            templateId: 'template-1',
            title: 'Resume',
            updatedAt: '2026-06-12T00:00:00.000Z',
            userId: 'identity-1'
          },
          template: {
            id: 'template-1',
            layoutData: { version: 1 },
            name: 'Classic Professional',
            thumbnail: 'http://localhost:4000/templates/thumb.png'
          }
        };
      },
      signExportToken() {
        return 'token';
      },
      verifyExportToken() {
        throw new Error('unused');
      }
    } as never
  );

  const response = await controller.getExportPayload('token-1');

  assert.equal(response.data.resume.id, 'resume-1');
  assert.equal(response.data.template.id, 'template-1');
});
