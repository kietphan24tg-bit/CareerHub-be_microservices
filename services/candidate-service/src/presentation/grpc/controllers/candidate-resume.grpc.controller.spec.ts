import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResumeResponseShape } from '../../../application/mappers/resume-response.mapper';
import type { ResumeTemplateListItemRecord, ResumeTemplateRecord } from '../../../application';
import { ResumeNotFoundError } from '../../../application/errors/resume-not-found.error';
import { CandidateResumeGrpcController } from './candidate-resume.grpc.controller';

const sampleResume: ResumeResponseShape = {
  address: null,
  avatarUrl: null,
  awards: [],
  certifications: [],
  educations: [],
  email: 'candidate@example.com',
  experiences: [],
  fullName: 'Candidate Name',
  githubUrl: null,
  headline: 'Backend Engineer',
  id: 'resume-1',
  identityId: 'identity-1',
  isUsing: true,
  linkedinUrl: null,
  phone: '0900111222',
  portfolioUrl: null,
  projects: [],
  skills: [],
  summary: 'Summary text',
  templateId: 'template-1',
  title: 'My Resume',
  updatedAt: '2026-06-06T01:00:00.000Z'
};

const sampleTemplateListItem: ResumeTemplateListItemRecord = {
  category: 'classic',
  id: 'template-1',
  name: 'Classic',
  thumbnail: '/assets/template-1.png'
};

const sampleTemplateDetail: ResumeTemplateRecord = {
  category: 'classic',
  createdAt: new Date('2026-06-06T00:00:00.000Z'),
  id: 'template-1',
  isActive: true,
  layoutData: { sections: [] },
  name: 'Classic',
  thumbnail: '/assets/template-1.png'
};

function createController(
  handlers: Partial<{
    listResumeTemplates: { execute: () => Promise<ResumeTemplateListItemRecord[]> };
    getResumeTemplateById: { execute: (input: { templateId: string }) => Promise<ResumeTemplateRecord> };
    listResumesByIdentityId: { execute: (input: { identityId: string }) => Promise<ResumeResponseShape[]> };
    getResumeById: { execute: (input: { identityId: string; resumeId: string }) => Promise<ResumeResponseShape> };
    createOrGetTemplateDraft: { execute: (input: { identityId: string; templateId: string }) => Promise<ResumeResponseShape> };
    createResume: { execute: (input: Record<string, unknown>) => Promise<ResumeResponseShape> };
    updateResume: { execute: (input: Record<string, unknown>) => Promise<ResumeResponseShape> };
    deleteResume: { execute: (input: { identityId: string; resumeId: string }) => Promise<void> };
    getResumeExportPayload: { execute: (input: { identityId: string; resumeId: string }) => Promise<{ resume: ResumeResponseShape; template: ResumeTemplateRecord }> };
  }> = {}
) {
  return new CandidateResumeGrpcController(
    (handlers.listResumeTemplates ?? { execute: async () => [sampleTemplateListItem] }) as never,
    (handlers.getResumeTemplateById ?? { execute: async () => sampleTemplateDetail }) as never,
    (handlers.listResumesByIdentityId ?? { execute: async () => [sampleResume] }) as never,
    (handlers.getResumeById ?? { execute: async () => sampleResume }) as never,
    (handlers.createOrGetTemplateDraft ?? { execute: async () => sampleResume }) as never,
    (handlers.createResume ?? { execute: async () => sampleResume }) as never,
    (handlers.updateResume ?? { execute: async () => sampleResume }) as never,
    (handlers.deleteResume ?? { execute: async () => undefined }) as never,
    (handlers.getResumeExportPayload ?? {
      execute: async () => ({
        resume: sampleResume,
        template: sampleTemplateDetail
      })
    }) as never
  );
}

test('maps list resume templates response', async () => {
  const controller = createController();

  const response = await controller.listResumeTemplates({});

  assert.equal(response.templates.length, 1);
  assert.equal(response.templates[0]?.id, 'template-1');
  assert.equal(response.templates[0]?.name, 'Classic');
});

test('maps get resume by id request and response', async () => {
  const controller = createController({
    getResumeById: {
      execute: async (input: { identityId: string; resumeId: string }) => {
        assert.equal(input.identityId, 'identity-1');
        assert.equal(input.resumeId, 'resume-1');

        return sampleResume;
      }
    } as never
  });

  const response = await controller.getResumeById({
    identity_id: 'identity-1',
    resume_id: 'resume-1'
  });

  assert.equal(response.resume?.id, 'resume-1');
  assert.equal(response.resume?.title, 'My Resume');
  assert.equal(response.resume?.is_using, true);
});

test('maps create resume request fields to command handler', async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const controller = createController({
    createResume: {
      execute: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return sampleResume;
      }
    } as never
  });

  await controller.createResume({
    content_json: JSON.stringify({ summary: 'Updated summary' }),
    identity_id: 'identity-1',
    template_id: 'template-1',
    title: 'New Resume'
  });

  assert.equal(capturedInput?.identityId, 'identity-1');
  assert.equal(capturedInput?.templateId, 'template-1');
  assert.equal(capturedInput?.title, 'New Resume');
});

test('maps delete resume response', async () => {
  const controller = createController({
    deleteResume: {
      execute: async (input: { identityId: string; resumeId: string }) => {
        assert.equal(input.identityId, 'identity-1');
        assert.equal(input.resumeId, 'resume-1');
      }
    } as never
  });

  const response = await controller.deleteResume({
    identity_id: 'identity-1',
    resume_id: 'resume-1'
  });

  assert.equal(response.deleted, true);
});

test('maps get resume export payload response', async () => {
  const controller = createController();

  const response = await controller.getResumeExportPayload({
    identity_id: 'identity-1',
    resume_id: 'resume-1'
  });

  assert.equal(response.resume?.id, 'resume-1');
  assert.equal(response.template?.id, 'template-1');
});

test('converts resume not found errors into NOT_FOUND gRPC payloads', async () => {
  const controller = createController({
    getResumeById: {
      execute: async () => {
        throw new ResumeNotFoundError('resume-missing');
      }
    } as never
  });

  await assert.rejects(
    async () =>
      controller.getResumeById({
        identity_id: 'identity-1',
        resume_id: 'resume-missing'
      }),
    (error: unknown) => {
      if (
        typeof error !== 'object' ||
        error === null ||
        !('getError' in error) ||
        typeof (error as { getError?: unknown }).getError !== 'function'
      ) {
        return false;
      }

      const payload = (error as { getError: () => unknown }).getError() as {
        code?: string;
      };

      return payload.code === 'NOT_FOUND';
    }
  );
});