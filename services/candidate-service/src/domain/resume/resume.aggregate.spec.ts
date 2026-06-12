import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { ResumeOwnershipError } from './errors';
import { createEmptyResumeContent } from './resume-content.types';
import { ResumeAggregate } from './resume.aggregate';
import { ResumeOwner, ResumeTitle } from './value-objects';

test('createDraft builds title from template and headline', () => {
  const aggregate = ResumeAggregate.createDraft({
    id: new UniqueEntityID('resume-1'),
    identityId: 'identity-1',
    profile: {
      address: null,
      avatarUrl: null,
      bio: 'Bio',
      createdAt: new Date(),
      fullName: 'Candidate',
      githubUrl: null,
      headline: 'Frontend Engineer',
      id: 'profile-1',
      identityId: 'identity-1',
      linkedinUrl: null,
      phone: '0123456789',
      portfolioUrl: null,
      resumeId: null,
      updatedAt: new Date(),
      yearsExperience: null
    },
    templateId: 'template-1',
    templateName: 'Classic Professional'
  });

  assert.equal(aggregate.title.value, 'Classic Professional - Frontend Engineer');
  assert.equal(aggregate.content.fullName, 'Candidate');
  assert.equal(aggregate.content.summary, 'Bio');
});

test('create builds resume with title and owner', () => {
  const aggregate = ResumeAggregate.create({
    content: createEmptyResumeContent(),
    id: new UniqueEntityID('resume-1'),
    identityId: 'identity-1',
    templateId: 'template-1',
    title: 'My Resume'
  });

  assert.equal(aggregate.title.value, 'My Resume');
  assert.equal(aggregate.identityId, 'identity-1');
});

test('update rejects blank title', () => {
  const aggregate = ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-1',
      title: new ResumeTitle('Draft')
    },
    updatedAt: new Date()
  });

  assert.throws(
    () =>
      aggregate.update({
        content: createEmptyResumeContent(),
        title: '   '
      }),
    ValidationError
  );
});

test('update changes title and content', () => {
  const aggregate = ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-1',
      title: new ResumeTitle('Draft')
    },
    updatedAt: new Date()
  });

  aggregate.update({
    content: { ...createEmptyResumeContent(), summary: 'Updated' },
    title: 'Updated Title'
  });

  assert.equal(aggregate.title.value, 'Updated Title');
  assert.equal(aggregate.content.summary, 'Updated');
});

test('ensureOwnedBy rejects mismatched identity', () => {
  const aggregate = ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-1',
      title: new ResumeTitle('Draft')
    },
    updatedAt: new Date()
  });

  assert.throws(
    () => aggregate.ensureOwnedBy('identity-2'),
    ResumeOwnershipError
  );
});

test('markAsUsing sets isUsing flag', () => {
  const aggregate = ResumeAggregate.reconstitute({
    createdAt: new Date(),
    id: new UniqueEntityID('resume-1'),
    props: {
      content: createEmptyResumeContent(),
      isUsing: false,
      owner: new ResumeOwner('identity-1'),
      templateId: 'template-1',
      title: new ResumeTitle('Draft')
    },
    updatedAt: new Date()
  });

  aggregate.markAsUsing();

  assert.equal(aggregate.isUsing, true);
  aggregate.markAsUsing();
  assert.equal(aggregate.isUsing, true);
});
