import {
  InMemoryMetricsRegistry,
  type MetricsRegistry,
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/infrastructure';
import { Module } from '@nestjs/common';
import { CandidateProfileAlreadyExistsError } from './application/errors/candidate-profile-already-exists.error';
import {
  CANDIDATE_PORT_TOKENS,
  CreateCandidateProfileCommandHandler,
  GetCandidateProfileByIdentityIdQueryHandler,
  UpdateCandidateProfileCommandHandler
} from './application';
import { getCandidateRuntimeConfig, validateCandidateEnvironment } from './config';
import {
  CandidatePrismaService,
  CANDIDATE_METRICS_TOKENS,
  CandidateOutboxProcessor,
  CandidateOutboxPublisher,
  CANDIDATE_PRISMA_TOKENS,
  createCandidatePrismaClient,
  PrismaCandidateOutboxRepository,
  PrismaCandidateWriteTransaction,
  PrismaCandidateProfileRepository
} from './infrastructure';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { CandidateGrpcController } from './presentation';

@Module({
  controllers: [CandidateGrpcController],
  imports: [
    createRuntimeConfigModule({
      validate: validateCandidateEnvironment
    }),
    createPrismaModule({
      clientToken: CANDIDATE_PRISMA_TOKENS.client,
      createClient: createCandidatePrismaClient,
      createService: (client) => new CandidatePrismaService(client),
      readinessCheckName: 'candidate-prisma',
      readinessCheckToken: CANDIDATE_PRISMA_TOKENS.readinessCheck,
      serviceToken: CANDIDATE_PRISMA_TOKENS.service
    })
  ],
  providers: [
    {
      provide: CANDIDATE_METRICS_TOKENS.registry,
      useFactory: (): MetricsRegistry => new InMemoryMetricsRegistry()
    },
    {
      provide: CANDIDATE_PORT_TOKENS.candidateProfileRepository,
      inject: [CANDIDATE_PRISMA_TOKENS.service],
      useFactory: (prismaService: CandidatePrismaService) =>
        new PrismaCandidateProfileRepository(prismaService.prisma)
    },
    {
      provide: CANDIDATE_PORT_TOKENS.outboxRepository,
      inject: [CANDIDATE_PRISMA_TOKENS.service],
      useFactory: (prismaService: CandidatePrismaService) =>
        new PrismaCandidateOutboxRepository(prismaService.prisma)
    },
    {
      provide: CANDIDATE_PORT_TOKENS.writeTransaction,
      inject: [CANDIDATE_PRISMA_TOKENS.service],
      useFactory: (prismaService: CandidatePrismaService) =>
        new PrismaCandidateWriteTransaction(prismaService)
    },
    {
      provide: CANDIDATE_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: CreateCandidateProfileCommandHandler,
      inject: [
        CANDIDATE_PORT_TOKENS.candidateProfileRepository,
        CANDIDATE_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        candidateProfileRepository: PrismaCandidateProfileRepository,
        idGenerator: UuidIdGenerator
      ) =>
        new CreateCandidateProfileCommandHandler(
          candidateProfileRepository,
          idGenerator
        )
    },
    {
      provide: GetCandidateProfileByIdentityIdQueryHandler,
      inject: [CANDIDATE_PORT_TOKENS.candidateProfileRepository],
      useFactory: (
        candidateProfileRepository: PrismaCandidateProfileRepository
      ) =>
        new GetCandidateProfileByIdentityIdQueryHandler(candidateProfileRepository)
    },
    {
      provide: UpdateCandidateProfileCommandHandler,
      inject: [
        CANDIDATE_PORT_TOKENS.writeTransaction,
        CANDIDATE_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        writeTransaction: PrismaCandidateWriteTransaction,
        idGenerator: UuidIdGenerator
      ) =>
        new UpdateCandidateProfileCommandHandler(writeTransaction, idGenerator)
    },
    CandidateOutboxPublisher,
    CandidateOutboxProcessor
  ]
})
export class CandidateModule {}
