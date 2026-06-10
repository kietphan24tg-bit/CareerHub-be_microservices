import {
  InMemoryMetricsRegistry,
  type MetricsRegistry,
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/infrastructure';
import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import {
  ActivateIdentityCommandHandler,
  GetCurrentIdentityQueryHandler,
  IAM_PORT_TOKENS,
  LoginIdentityCommandHandler,
  LogoutSessionCommandHandler,
  RequestPasswordResetCommandHandler,
  RefreshSessionCommandHandler,
  RegisterIdentityCommandHandler,
  ResetPasswordCommandHandler,
  ValidateAccessTokenQueryHandler
} from './application';
import { Argon2PasswordHasher } from './infrastructure/crypto/argon2-password-hasher';
import {
  createIamPrismaClient,
  IAM_METRICS_TOKENS,
  IAM_PRISMA_TOKENS,
  IamPrismaService,
  IamOutboxProcessor,
  IamOutboxPublisher,
  IamPasswordResetMailConsumer,
  JwtTokenService,
  MailService,
  PasswordResetTokenFactory,
  PrismaAuthSessionRepository,
  PrismaIamWriteTransaction,
  PrismaIdentityRepository,
  PrismaOutboxRepository,
  PrismaPasswordResetTokenRepository
} from './infrastructure';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { getIamRuntimeConfig, validateIamEnvironment } from './config';
import { IamGrpcController } from './presentation';
import { ConfigService } from '@nestjs/config';
import type { IamEnvironmentVariables } from './config';

@Module({
  controllers: [IamGrpcController],
  exports: [RegisterIdentityCommandHandler],
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
      provide: IAM_METRICS_TOKENS.registry,
      useFactory: (): MetricsRegistry => new InMemoryMetricsRegistry()
    },
    {
      provide: IAM_PORT_TOKENS.authSessionRepository,
      inject: [IAM_PRISMA_TOKENS.service],
      useFactory: (prismaService: IamPrismaService) =>
        new PrismaAuthSessionRepository(prismaService.prisma)
    },
    {
      provide: IAM_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: IAM_PORT_TOKENS.identityRepository,
      inject: [IAM_PRISMA_TOKENS.service],
      useFactory: (prismaService: IamPrismaService) =>
        new PrismaIdentityRepository(prismaService.prisma)
    },
    {
      provide: IAM_PORT_TOKENS.outboxRepository,
      inject: [IAM_PRISMA_TOKENS.service],
      useFactory: (prismaService: IamPrismaService) =>
        new PrismaOutboxRepository(prismaService.prisma)
    },
    {
      provide: IAM_PORT_TOKENS.passwordResetTokenRepository,
      inject: [IAM_PRISMA_TOKENS.service],
      useFactory: (prismaService: IamPrismaService) =>
        new PrismaPasswordResetTokenRepository(prismaService.prisma)
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
      provide: IAM_PORT_TOKENS.writeTransaction,
      inject: [IAM_PRISMA_TOKENS.service],
      useFactory: (prismaService: IamPrismaService) =>
        new PrismaIamWriteTransaction(prismaService)
    },
    {
      provide: RegisterIdentityCommandHandler,
      useFactory: (
        identityRepository: PrismaIdentityRepository,
        writeTransaction: PrismaIamWriteTransaction,
        idGenerator: UuidIdGenerator,
        passwordHasher: Argon2PasswordHasher
      ) =>
        new RegisterIdentityCommandHandler(
          identityRepository,
          writeTransaction,
          idGenerator,
          passwordHasher
        ),
      inject: [
        IAM_PORT_TOKENS.identityRepository,
        IAM_PORT_TOKENS.writeTransaction,
        IAM_PORT_TOKENS.idGenerator,
        IAM_PORT_TOKENS.passwordHasher
      ]
    },
    {
      provide: RequestPasswordResetCommandHandler,
      inject: [
        IAM_PORT_TOKENS.identityRepository,
        IAM_PORT_TOKENS.writeTransaction,
        IAM_PORT_TOKENS.idGenerator,
        IAM_PORT_TOKENS.tokenService,
        PasswordResetTokenFactory,
        ConfigService
      ],
      useFactory: (
        identityRepository: PrismaIdentityRepository,
        writeTransaction: PrismaIamWriteTransaction,
        idGenerator: UuidIdGenerator,
        tokenService: JwtTokenService,
        passwordResetTokenFactory: PasswordResetTokenFactory,
        configService: ConfigService<IamEnvironmentVariables, true>
      ) =>
        new RequestPasswordResetCommandHandler(
          identityRepository,
          writeTransaction,
          idGenerator,
          tokenService,
          passwordResetTokenFactory,
          getIamRuntimeConfig(configService).passwordResetTokenTtlMs
        )
    },
    {
      provide: PasswordResetTokenFactory,
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<IamEnvironmentVariables, true>
      ) =>
        new PasswordResetTokenFactory(
          getIamRuntimeConfig(configService).passwordResetSecret
        )
    },
    {
      provide: LoginIdentityCommandHandler,
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
        new LoginIdentityCommandHandler(
          identityRepository,
          passwordHasher,
          authSessionRepository,
          tokenService,
          idGenerator
        )
    },
    {
      provide: ResetPasswordCommandHandler,
      inject: [
        IAM_PORT_TOKENS.passwordResetTokenRepository,
        IAM_PORT_TOKENS.identityRepository,
        IAM_PORT_TOKENS.writeTransaction,
        IAM_PORT_TOKENS.passwordHasher,
        IAM_PORT_TOKENS.tokenService
      ],
      useFactory: (
        passwordResetTokenRepository: PrismaPasswordResetTokenRepository,
        identityRepository: PrismaIdentityRepository,
        writeTransaction: PrismaIamWriteTransaction,
        passwordHasher: Argon2PasswordHasher,
        tokenService: JwtTokenService
      ) =>
        new ResetPasswordCommandHandler(
          passwordResetTokenRepository,
          identityRepository,
          writeTransaction,
          passwordHasher,
          tokenService
        )
    },
    {
      provide: RefreshSessionCommandHandler,
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
        new RefreshSessionCommandHandler(
          authSessionRepository,
          identityRepository,
          tokenService
        )
    },
    {
      provide: LogoutSessionCommandHandler,
      inject: [
        IAM_PORT_TOKENS.authSessionRepository,
        IAM_PORT_TOKENS.tokenService
      ],
      useFactory: (
        authSessionRepository: PrismaAuthSessionRepository,
        tokenService: JwtTokenService
      ) => new LogoutSessionCommandHandler(authSessionRepository, tokenService)
    },
    {
      provide: ValidateAccessTokenQueryHandler,
      inject: [IAM_PORT_TOKENS.tokenService],
      useFactory: (tokenService: JwtTokenService) =>
        new ValidateAccessTokenQueryHandler(tokenService)
    },
    {
      provide: GetCurrentIdentityQueryHandler,
      inject: [IAM_PORT_TOKENS.identityRepository],
      useFactory: (identityRepository: PrismaIdentityRepository) =>
        new GetCurrentIdentityQueryHandler(identityRepository)
    },
    {
      provide: ActivateIdentityCommandHandler,
      inject: [IAM_PORT_TOKENS.identityRepository],
      useFactory: (identityRepository: PrismaIdentityRepository) =>
        new ActivateIdentityCommandHandler(identityRepository)
    },
    MailService,
    IamPasswordResetMailConsumer,
    IamOutboxPublisher,
    IamOutboxProcessor
  ]
})
export class IamModule {}
