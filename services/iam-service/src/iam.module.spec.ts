import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Test } from '@nestjs/testing';
import { RegisterIdentityUseCase } from './application';
import { IamModule } from './iam.module';

test('compiles the iam module and resolves RegisterIdentityUseCase', async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [IamModule]
  }).compile();

  const useCase = moduleRef.get(RegisterIdentityUseCase);
  const result = await useCase.execute({
    acceptedTerms: true,
    email: 'user@example.com',
    password: 'plain-password',
    role: 'candidate'
  });

  assert.ok(useCase instanceof RegisterIdentityUseCase);
  assert.equal(result.email, 'user@example.com');
  assert.equal(result.role, 'candidate');
  assert.equal(result.status, 'active');

  await moduleRef.close();
});
