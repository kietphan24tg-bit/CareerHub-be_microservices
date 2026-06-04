import {
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/nest-common';
import { Module } from '@nestjs/common';
import {
  IAM_PORT_TOKENS,
  RegisterIdentityUseCase
} from './application';
import { Argon2PasswordHasher } from './infrastructure/crypto/argon2-password-hasher';
import {
  createIamPrismaClient,
  IAM_PRISMA_TOKENS,
  IamPrismaService,
  PrismaIdentityRepository
} from './infrastructure';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { validateIamEnvironment } from './config';
import { IamGrpcController } from './presentation';

@Module({
  controllers: [IamGrpcController],
  exports: [RegisterIdentityUseCase],
  imports: [
    createRuntimeConfigModule({
      validate: validateIamEnvironment
    }),
    createPrismaModule({
      clientToken: IAM_PRISMA_TOKENS.client,
      createClient: createIamPrismaClient,
      createService: (client) => new IamPrismaService(client),
      readinessCheckName: 'iam-prisma',
      readinessCheckToken: IAM_PRISMA_TOKENS.readinessCheck,
      serviceToken: IAM_PRISMA_TOKENS.service
    })
  ],
  providers: [
    {
      provide: IAM_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: IAM_PORT_TOKENS.identityRepository,
      inject: [IAM_PRISMA_TOKENS.service],
      useFactory: (prismaService: IamPrismaService) =>
        new PrismaIdentityRepository(prismaService)
    },
    {
      provide: IAM_PORT_TOKENS.passwordHasher,
      useClass: Argon2PasswordHasher
    },
    {
      provide: RegisterIdentityUseCase,
      useFactory: (
        identityRepository: PrismaIdentityRepository,
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
