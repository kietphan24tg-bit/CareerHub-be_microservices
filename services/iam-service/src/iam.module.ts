import { Module } from '@nestjs/common';
import {
  IAM_PORT_TOKENS,
  RegisterIdentityUseCase
} from './application';
import { Argon2PasswordHasher } from './infrastructure/crypto/argon2-password-hasher';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { InMemoryIdentityRepository } from './infrastructure/identity/in-memory-identity-repository';

@Module({
  exports: [RegisterIdentityUseCase],
  providers: [
    {
      provide: IAM_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: IAM_PORT_TOKENS.identityRepository,
      useClass: InMemoryIdentityRepository
    },
    {
      provide: IAM_PORT_TOKENS.passwordHasher,
      useClass: Argon2PasswordHasher
    },
    {
      provide: RegisterIdentityUseCase,
      useFactory: (
        identityRepository: InMemoryIdentityRepository,
        idGenerator: UuidIdGenerator,
        passwordHasher: Argon2PasswordHasher
      ) =>
        new RegisterIdentityUseCase(
          identityRepository,
          idGenerator,
          passwordHasher
        ),
      inject: [
        IAM_PORT_TOKENS.identityRepository,
        IAM_PORT_TOKENS.idGenerator,
        IAM_PORT_TOKENS.passwordHasher
      ]
    }
  ]
})
export class IamModule {}
