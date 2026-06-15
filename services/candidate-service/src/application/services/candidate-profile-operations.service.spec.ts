import assert from 'node:assert/strict';
import test from 'node:test';
import { ValidationError } from '@careerhub/shared-kernel';
import { ResumeNotFoundError } from '../errors/resume-not-found.error';
import { CandidateProfileOperationsService } from './candidate-profile-operations.service';

const service = new CandidateProfileOperationsService();

test('prepareCreateInput normalizes identityId, fullName, and phone', () => {
  const input = service.prepareCreateInput({
    fullName: '  Test Candidate  ',
    identityId: ' identity-1 ',
    phone: ' 0123456789 '
  });

  assert.deepEqual(input, {
    fullName: 'Test Candidate',
    identityId: 'identity-1',
    phone: '0123456789'
  });
});

test('prepareCreateInput rejects blank identityId', () => {
  assert.throws(
    () =>
      service.prepareCreateInput({
        fullName: 'Test Candidate',
        identityId: '   ',
        phone: '0123456789'
      }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === 'Candidate identity id is required'
  );
});

test('prepareCreateInput rejects blank fullName', () => {
  assert.throws(
    () =>
      service.prepareCreateInput({
        fullName: '   ',
        identityId: 'identity-1',
        phone: '0123456789'
      }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === 'Candidate full name is required'
  );
});

test('prepareCreateInput rejects blank phone', () => {
  assert.throws(
    () =>
      service.prepareCreateInput({
        fullName: 'Test Candidate',
        identityId: 'identity-1',
        phone: ' '
      }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === 'Candidate phone is required'
  );
});

test('prepareUpdateInput normalizes nullable string fields', () => {
  const prepared = service.prepareUpdateInput({
    avatarUrl: '  ',
    bio: ' About me ',
    githubUrl: null,
    headline: undefined,
    identityId: ' identity-1 ',
    linkedinUrl: 'https://linkedin.com/in/candidate',
    phone: ' 0987654321 ',
    portfolioUrl: '   ',
    address: ' 123 Main St '
  });

  assert.equal(prepared.identityId, 'identity-1');
  assert.deepEqual(prepared.patch, {
    address: '123 Main St',
    avatarUrl: null,
    bio: 'About me',
    githubUrl: null,
    linkedinUrl: 'https://linkedin.com/in/candidate',
    phone: '0987654321',
    portfolioUrl: null
  });
  assert.deepEqual(prepared.resumeIdChange, { kind: 'none' });
});

test('prepareUpdateInput rejects negative yearsExperience', () => {
  assert.throws(
    () =>
      service.prepareUpdateInput({
        identityId: 'identity-1',
        yearsExperience: -1
      }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message ===
        'Candidate years experience must be greater than or equal to 0'
  );
});

test('prepareUpdateInput rejects empty update payload', () => {
  assert.throws(
    () =>
      service.prepareUpdateInput({
        identityId: 'identity-1'
      }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === 'At least one candidate profile field must be provided'
  );
});

test('prepareUpdateInput resolves resumeId changes', () => {
  assert.deepEqual(
    service.prepareUpdateInput({
      identityId: 'identity-1',
      resumeId: null
    }).resumeIdChange,
    { kind: 'clear' }
  );

  assert.deepEqual(
    service.prepareUpdateInput({
      identityId: 'identity-1',
      resumeId: ' resume-1 '
    }).resumeIdChange,
    { kind: 'set', resumeId: 'resume-1' }
  );
});

test('prepareUpdateInput rejects blank resumeId', () => {
  assert.throws(
    () =>
      service.prepareUpdateInput({
        identityId: 'identity-1',
        resumeId: '   '
      }),
    (error: unknown) =>
      error instanceof ValidationError &&
      error.message === 'Candidate resume id cannot be blank'
  );
});

test('syncResumeIdChange clears isUsing when resume is cleared', async () => {
  const calls: string[] = [];
  const patch = {};

  await service.syncResumeIdChange(
    'identity-1',
    { kind: 'clear' },
    {
      async clearIsUsingByIdentityId(identityId) {
        calls.push(`clear-all:${identityId}`);
      },
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
    patch
  );

  assert.deepEqual(calls, ['clear-all:identity-1']);
  assert.deepEqual(patch, { resumeId: null });
});

test('syncResumeIdChange rejects resume not owned by identity', async () => {
  await assert.rejects(
    () =>
      service.syncResumeIdChange(
        'identity-1',
        { kind: 'set', resumeId: 'resume-missing' },
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
        {}
      ),
    ResumeNotFoundError
  );
});