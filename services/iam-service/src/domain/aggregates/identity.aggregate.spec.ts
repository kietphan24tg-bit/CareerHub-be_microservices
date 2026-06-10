import assert from 'node:assert/strict';
import test from 'node:test';
import { UniqueEntityID, ValidationError } from '@careerhub/shared-kernel';
import { Identity } from './identity.aggregate';
import {
  IdentityDisabledEvent,
  UserRegisteredEvent,
  UserRoleChangedEvent
} from '../events';
import {
  Email,
  IdentityStatus,
  PasswordHash,
  Role
} from '../value-objects';
import { IdentityDisabledError } from '../errors';

const ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$ZmFrZWhhc2gxMjM0NTY3ODkw';
const NEXT_ARGON2ID_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$bmV4dHNhbHQ$bmV4dGZha2VoYXNoMTIzNDU2';

test('registers a valid identity without emitting UserRegisteredEvent yet', () => {
  const identity = Identity.register({
    acceptedTerms: true,
    id: new UniqueEntityID('identity-1'),
    email: new Email('user@example.com'),
    passwordHash: new PasswordHash(ARGON2ID_HASH),
    role: new Role('candidate')
  });

  assert.equal(identity.email.value, 'user@example.com');
  assert.equal(identity.role.value, 'candidate');
  assert.equal(identity.status.value, 'pending_profile');
  assert.equal(identity.acceptedTerms, true);

  const events = identity.pullDomainEvents();
  assert.equal(events.length, 0);
  assert.equal(identity.pullDomainEvents().length, 0);
});

test('activates a pending identity and emits UserRegisteredEvent', () => {
  const identity = Identity.reconstitute({
    id: new UniqueEntityID('identity-activate-registered-1'),
    props: {
      acceptedTerms: true,
      email: new Email('user@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('candidate'),
      status: IdentityStatus.pendingProfile()
    }
  });

  identity.enable();

  assert.equal(identity.status.value, 'active');
  const events = identity.pullDomainEvents();
  assert.equal(events.length, 1);
  assert.ok(events[0] instanceof UserRegisteredEvent);
  assert.equal((events[0] as UserRegisteredEvent).acceptedTerms, true);
});

test('fails when email is invalid', () => {
  assert.throws(() => new Email('invalid-email'), ValidationError);
});

test('changes role and emits UserRoleChangedEvent', () => {
  const identity = Identity.reconstitute({
    id: new UniqueEntityID('identity-2'),
    props: {
      acceptedTerms: true,
      email: new Email('user@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('candidate'),
      status: IdentityStatus.active()
    }
  });

  identity.changeRole(new Role('employer'));

  assert.equal(identity.role.value, 'employer');
  const events = identity.pullDomainEvents();
  assert.equal(events.length, 1);
  assert.ok(events[0] instanceof UserRoleChangedEvent);
});

test('disables identity and emits IdentityDisabledEvent', () => {
  const identity = Identity.reconstitute({
    id: new UniqueEntityID('identity-3'),
    props: {
      acceptedTerms: true,
      email: new Email('user@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('employer'),
      status: IdentityStatus.active()
    }
  });

  identity.disable();

  assert.equal(identity.status.value, 'disabled');
  const events = identity.pullDomainEvents();
  assert.equal(events.length, 1);
  assert.ok(events[0] instanceof IdentityDisabledEvent);
});

test('changes password for active identity', () => {
  const identity = Identity.reconstitute({
    id: new UniqueEntityID('identity-4'),
    props: {
      acceptedTerms: true,
      email: new Email('user@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('candidate'),
      status: IdentityStatus.active()
    }
  });

  identity.changePassword(new PasswordHash(NEXT_ARGON2ID_HASH));

  assert.equal(identity.passwordHash.value, NEXT_ARGON2ID_HASH);
});

test('does not allow password changes for disabled identity', () => {
  const identity = Identity.reconstitute({
    id: new UniqueEntityID('identity-5'),
    props: {
      acceptedTerms: true,
      email: new Email('user@example.com'),
      passwordHash: new PasswordHash(ARGON2ID_HASH),
      role: new Role('candidate'),
      status: IdentityStatus.disabled()
    }
  });

  assert.throws(
    () => identity.changePassword(new PasswordHash(NEXT_ARGON2ID_HASH)),
    IdentityDisabledError
  );
});

test('fails when accepted terms is false', () => {
  assert.throws(
    () =>
      Identity.register({
        acceptedTerms: false,
        id: new UniqueEntityID('identity-6'),
        email: new Email('user@example.com'),
        passwordHash: new PasswordHash(ARGON2ID_HASH),
        role: new Role('candidate')
      }),
    ValidationError
  );
});

test('fails when password hash is not argon2id encoded', () => {
  assert.throws(() => new PasswordHash('plain-password'), ValidationError);
});
