import {
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/infrastructure';
import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
  ActivateIdentityUseCase,
  GetCurrentIdentityUseCase,
  IAM_PORT_TOKENS,
  LoginIdentityUseCase,
  LogoutSessionUseCase,
  RefreshSessionUseCase,
  RegisterIdentityUseCase
} from './application';
import { ValidateAccessTokenUseCase } from './application/auth';
import { Argon2PasswordHasher } from './infrastructure/crypto/argon2-password-hasher';
import {
  createIamPrismaClient,
  IAM_PRISMA_TOKENS,
  IamPrismaService,
  JwtTokenService,
  PrismaAuthSessionRepository,
  PrismaIdentityRepository
} from './infrastructure';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { getIamRuntimeConfig, validateIamEnvironment } from './config';
import { IamGrpcController } from './presentation';
import { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from './config';

@Module({
  controllers: [IamGrpcController],
  exports: [RegisterIdentityUseCase],
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<IamEnvironmentVariables, true>
      ) => ({
        secret: getIamRuntimeConfig(configService).jwtSecret
      })
    }),
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
      provide: IAM_PORT_TOKENS.authSessionRepository,
      inject: [IAM_PRISMA_TOKENS.service],
      useFactory: (prismaService: IamPrismaService) =>
        new PrismaAuthSessionRepository(prismaService)
    },
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
      provide: IAM_PORT_TOKENS.tokenService,
      inject: [JwtService, ConfigService],
      useFactory: (
        jwtService: JwtService,
        configService: ConfigService<IamEnvironmentVariables, true>
      ) =>
        new JwtTokenService(jwtService, {
          accessTokenExpiresIn: getIamRuntimeConfig(configService).jwtExpiresIn,
          refreshTokenExpiresIn:
            getIamRuntimeConfig(configService).jwtRefreshExpiresIn
        })
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
    },
    {
      provide: LoginIdentityUseCase,
      inject: [
        IAM_PORT_TOKENS.identityRepository,
        IAM_PORT_TOKENS.passwordHasher,
        IAM_PORT_TOKENS.authSessionRepository,
        IAM_PORT_TOKENS.tokenService,
        IAM_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        identityRepository: PrismaIdentityRepository,
        passwordHasher: Argon2PasswordHasher,
        authSessionRepository: PrismaAuthSessionRepository,
        tokenService: JwtTokenService,
        idGenerator: UuidIdGenerator
      ) =>
        new LoginIdentityUseCase(
          identityRepository,
          passwordHasher,
          authSessionRepository,
          tokenService,
          idGenerator
        )
    },
    {
      provide: RefreshSessionUseCase,
      inject: [
        IAM_PORT_TOKENS.authSessionRepository,
        IAM_PORT_TOKENS.identityRepository,
        IAM_PORT_TOKENS.tokenService
      ],
      useFactory: (
        authSessionRepository: PrismaAuthSessionRepository,
        identityRepository: PrismaIdentityRepository,
        tokenService: JwtTokenService
      ) =>
        new RefreshSessionUseCase(
          authSessionRepository,
          identityRepository,
          tokenService
        )
    },
    {
      provide: LogoutSessionUseCase,
      inject: [
        IAM_PORT_TOKENS.authSessionRepository,
        IAM_PORT_TOKENS.tokenService
      ],
      useFactory: (
        authSessionRepository: PrismaAuthSessionRepository,
        tokenService: JwtTokenService
      ) => new LogoutSessionUseCase(authSessionRepository, tokenService)
    },
    {
      provide: ValidateAccessTokenUseCase,
      inject: [IAM_PORT_TOKENS.tokenService],
      useFactory: (tokenService: JwtTokenService) =>
        new ValidateAccessTokenUseCase(tokenService)
    },
    {
      provide: GetCurrentIdentityUseCase,
      inject: [IAM_PORT_TOKENS.identityRepository],
      useFactory: (identityRepository: PrismaIdentityRepository) =>
        new GetCurrentIdentityUseCase(identityRepository)
    },
    {
      provide: ActivateIdentityUseCase,
      inject: [IAM_PORT_TOKENS.identityRepository],
      useFactory: (identityRepository: PrismaIdentityRepository) =>
        new ActivateIdentityUseCase(identityRepository)
    }
  ]
})
export class IamModule {}
