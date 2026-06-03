import assert from 'node:assert/strict';
import test from 'node:test';
import { PasswordHash } from '../../domain';
import { Argon2PasswordHasher } from './argon2-password-hasher';

test('hashes passwords using argon2id', async () => {
  const hasher = new Argon2PasswordHasher();

  const hashedPassword = await hasher.hash('plain-password');

  assert.match(hashedPassword, /^\$argon2id\$/);
  assert.doesNotThrow(() => new PasswordHash(hashedPassword));
});
