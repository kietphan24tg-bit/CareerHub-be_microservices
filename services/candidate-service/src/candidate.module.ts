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
  CreateOrGetTemplateDraftCommandHandler,
  CreateResumeCommandHandler,
  DeleteCandidateProfileCompensationCommandHandler,
  DeleteResumeCommandHandler,
  GetCandidateProfileByIdentityIdQueryHandler,
  GetResumeByIdQueryHandler,
  GetResumeExportPayloadQueryHandler,
  GetResumeTemplateByIdQueryHandler,
  ListResumeTemplatesQueryHandler,
  ListResumesByIdentityIdQueryHandler,
  ListSavedJobsByIdentityIdQueryHandler,
  RemoveSavedJobCommandHandler,
  SaveJobCommandHandler,
  UpdateCandidateProfileCommandHandler,
  UpdateResumeCommandHandler
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
  PrismaCandidateProfileRepository,
  PrismaResumeRepository,
  PrismaResumeTemplateRepository,
  PrismaSavedJobRepository
} from './infrastructure';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { CandidateGrpcController, CandidateResumeGrpcController } from './presentation';

@Module({
  controllers: [CandidateGrpcController, CandidateResumeGrpcController],
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
      provide: CANDIDATE_PORT_TOKENS.savedJobRepository,
      inject: [CANDIDATE_PRISMA_TOKENS.service],
      useFactory: (prismaService: CandidatePrismaService) =>
        new PrismaSavedJobRepository(prismaService.prisma)
    },
    {
      provide: CANDIDATE_PORT_TOKENS.resumeRepository,
      inject: [CANDIDATE_PRISMA_TOKENS.service],
      useFactory: (prismaService: CandidatePrismaService) =>
        new PrismaResumeRepository(prismaService.prisma)
    },
    {
      provide: CANDIDATE_PORT_TOKENS.resumeTemplateRepository,
      inject: [CANDIDATE_PRISMA_TOKENS.service],
      useFactory: (prismaService: CandidatePrismaService) =>
        new PrismaResumeTemplateRepository(prismaService.prisma)
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
      provide: DeleteCandidateProfileCompensationCommandHandler,
      inject: [CANDIDATE_PORT_TOKENS.candidateProfileRepository],
      useFactory: (
        candidateProfileRepository: PrismaCandidateProfileRepository
      ) =>
        new DeleteCandidateProfileCompensationCommandHandler(
          candidateProfileRepository
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
        CANDIDATE_PORT_TOKENS.candidateProfileRepository,
        CANDIDATE_PORT_TOKENS.writeTransaction
      ],
      useFactory: (
        candidateProfileRepository: PrismaCandidateProfileRepository,
        writeTransaction: PrismaCandidateWriteTransaction
      ) =>
        new UpdateCandidateProfileCommandHandler(
          candidateProfileRepository,
          writeTransaction
        )
    },
    {
      provide: ListSavedJobsByIdentityIdQueryHandler,
      inject: [CANDIDATE_PORT_TOKENS.savedJobRepository],
      useFactory: (savedJobRepository: PrismaSavedJobRepository) =>
        new ListSavedJobsByIdentityIdQueryHandler(savedJobRepository)
    },
    {
      provide: SaveJobCommandHandler,
      inject: [
        CANDIDATE_PORT_TOKENS.savedJobRepository,
        CANDIDATE_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        savedJobRepository: PrismaSavedJobRepository,
        idGenerator: UuidIdGenerator
      ) => new SaveJobCommandHandler(savedJobRepository, idGenerator)
    },
    {
      provide: RemoveSavedJobCommandHandler,
      inject: [CANDIDATE_PORT_TOKENS.savedJobRepository],
      useFactory: (savedJobRepository: PrismaSavedJobRepository) =>
        new RemoveSavedJobCommandHandler(savedJobRepository)
    },
    {
      provide: ListResumeTemplatesQueryHandler,
      inject: [CANDIDATE_PORT_TOKENS.resumeTemplateRepository],
      useFactory: (resumeTemplateRepository: PrismaResumeTemplateRepository) =>
        new ListResumeTemplatesQueryHandler(resumeTemplateRepository)
    },
    {
      provide: GetResumeTemplateByIdQueryHandler,
      inject: [CANDIDATE_PORT_TOKENS.resumeTemplateRepository],
      useFactory: (resumeTemplateRepository: PrismaResumeTemplateRepository) =>
        new GetResumeTemplateByIdQueryHandler(resumeTemplateRepository)
    },
    {
      provide: ListResumesByIdentityIdQueryHandler,
      inject: [CANDIDATE_PORT_TOKENS.resumeRepository],
      useFactory: (resumeRepository: PrismaResumeRepository) =>
        new ListResumesByIdentityIdQueryHandler(resumeRepository)
    },
    {
      provide: GetResumeByIdQueryHandler,
      inject: [CANDIDATE_PORT_TOKENS.resumeRepository],
      useFactory: (resumeRepository: PrismaResumeRepository) =>
        new GetResumeByIdQueryHandler(resumeRepository)
    },
    {
      provide: CreateOrGetTemplateDraftCommandHandler,
      inject: [
        CANDIDATE_PORT_TOKENS.resumeRepository,
        CANDIDATE_PORT_TOKENS.resumeTemplateRepository,
        CANDIDATE_PORT_TOKENS.candidateProfileRepository,
        CANDIDATE_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        resumeRepository: PrismaResumeRepository,
        resumeTemplateRepository: PrismaResumeTemplateRepository,
        candidateProfileRepository: PrismaCandidateProfileRepository,
        idGenerator: UuidIdGenerator
      ) =>
        new CreateOrGetTemplateDraftCommandHandler(
          resumeRepository,
          resumeTemplateRepository,
          candidateProfileRepository,
          idGenerator
        )
    },
    {
      provide: CreateResumeCommandHandler,
      inject: [
        CANDIDATE_PORT_TOKENS.resumeRepository,
        CANDIDATE_PORT_TOKENS.resumeTemplateRepository,
        CANDIDATE_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        resumeRepository: PrismaResumeRepository,
        resumeTemplateRepository: PrismaResumeTemplateRepository,
        idGenerator: UuidIdGenerator
      ) =>
        new CreateResumeCommandHandler(
          resumeRepository,
          resumeTemplateRepository,
          idGenerator
        )
    },
    {
      provide: UpdateResumeCommandHandler,
      inject: [CANDIDATE_PORT_TOKENS.resumeRepository],
      useFactory: (resumeRepository: PrismaResumeRepository) =>
        new UpdateResumeCommandHandler(resumeRepository)
    },
    {
      provide: DeleteResumeCommandHandler,
      inject: [
        CANDIDATE_PORT_TOKENS.resumeRepository,
        CANDIDATE_PORT_TOKENS.writeTransaction
      ],
      useFactory: (
        resumeRepository: PrismaResumeRepository,
        writeTransaction: PrismaCandidateWriteTransaction
      ) => new DeleteResumeCommandHandler(resumeRepository, writeTransaction)
    },
    {
      provide: GetResumeExportPayloadQueryHandler,
      inject: [
        CANDIDATE_PORT_TOKENS.resumeRepository,
        CANDIDATE_PORT_TOKENS.resumeTemplateRepository
      ],
      useFactory: (
        resumeRepository: PrismaResumeRepository,
        resumeTemplateRepository: PrismaResumeTemplateRepository
      ) =>
        new GetResumeExportPayloadQueryHandler(
          resumeRepository,
          resumeTemplateRepository
        )
    },
    CandidateOutboxPublisher,
    CandidateOutboxProcessor
  ]
})
export class CandidateModule {}
