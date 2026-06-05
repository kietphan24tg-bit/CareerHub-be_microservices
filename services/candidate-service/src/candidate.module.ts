import {
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/nest-common';
import { Module } from '@nestjs/common';
import { CandidateProfileAlreadyExistsError } from './application/errors/candidate-profile-already-exists.error';
import {
  CANDIDATE_PORT_TOKENS,
  CreateCandidateProfileUseCase
} from './application';
import { getCandidateRuntimeConfig, validateCandidateEnvironment } from './config';
import {
  CandidatePrismaService,
  CANDIDATE_PRISMA_TOKENS,
  createCandidatePrismaClient,
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
      provide: CANDIDATE_PORT_TOKENS.candidateProfileRepository,
      inject: [CANDIDATE_PRISMA_TOKENS.service],
      useFactory: (prismaService: CandidatePrismaService) =>
        new PrismaCandidateProfileRepository(prismaService)
    },
    {
      provide: CANDIDATE_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: CreateCandidateProfileUseCase,
      inject: [
        CANDIDATE_PORT_TOKENS.candidateProfileRepository,
        CANDIDATE_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        candidateProfileRepository: PrismaCandidateProfileRepository,
        idGenerator: UuidIdGenerator
      ) =>
        new CreateCandidateProfileUseCase(candidateProfileRepository, idGenerator)
    }
  ]
})
export class CandidateModule {}
