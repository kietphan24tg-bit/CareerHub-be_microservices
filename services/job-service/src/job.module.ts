import {
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/infrastructure';
import { Module } from '@nestjs/common';
import {
  ArchiveJobCommandHandler,
  CloseJobCommandHandler,
  CreateJobCommandHandler,
  GetEmployerJobByIdQueryHandler,
  GetPublicJobBySlugQueryHandler,
  JOB_PORT_TOKENS,
  JobExistsQueryHandler,
  ListEmployerJobsQueryHandler,
  ListJobsByIdsQueryHandler,
  ListPublicJobsQueryHandler,
  PublishJobCommandHandler,
  ReopenJobCommandHandler,
  UpdateJobCommandHandler
} from './application';
import { validateJobEnvironment } from './config';
import {
  createJobPrismaClient,
  JOB_PRISMA_TOKENS,
  JobPrismaService,
  PrismaJobRepository
} from './infrastructure';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { JobGrpcController } from './presentation';

@Module({
  controllers: [JobGrpcController],
  imports: [
    createRuntimeConfigModule({
      validate: validateJobEnvironment
    }),
    createPrismaModule({
      clientToken: JOB_PRISMA_TOKENS.client,
      createClient: createJobPrismaClient,
      createService: (client) => new JobPrismaService(client),
      readinessCheckName: 'job-prisma',
      readinessCheckToken: JOB_PRISMA_TOKENS.readinessCheck,
      serviceToken: JOB_PRISMA_TOKENS.service
    })
  ],
  providers: [
    {
      provide: JOB_PORT_TOKENS.jobRepository,
      inject: [JOB_PRISMA_TOKENS.service],
      useFactory: (prismaService: JobPrismaService) =>
        new PrismaJobRepository(prismaService)
    },
    {
      provide: JOB_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: CreateJobCommandHandler,
      inject: [JOB_PORT_TOKENS.jobRepository, JOB_PORT_TOKENS.idGenerator],
      useFactory: (
        jobRepository: PrismaJobRepository,
        idGenerator: UuidIdGenerator
      ) => new CreateJobCommandHandler(jobRepository, idGenerator)
    },
    {
      provide: UpdateJobCommandHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new UpdateJobCommandHandler(jobRepository)
    },
    {
      provide: PublishJobCommandHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new PublishJobCommandHandler(jobRepository)
    },
    {
      provide: CloseJobCommandHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new CloseJobCommandHandler(jobRepository)
    },
    {
      provide: ArchiveJobCommandHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new ArchiveJobCommandHandler(jobRepository)
    },
    {
      provide: ReopenJobCommandHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new ReopenJobCommandHandler(jobRepository)
    },
    {
      provide: ListPublicJobsQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new ListPublicJobsQueryHandler(jobRepository)
    },
    {
      provide: GetPublicJobBySlugQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new GetPublicJobBySlugQueryHandler(jobRepository)
    },
    {
      provide: ListEmployerJobsQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new ListEmployerJobsQueryHandler(jobRepository)
    },
    {
      provide: GetEmployerJobByIdQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new GetEmployerJobByIdQueryHandler(jobRepository)
    },
    {
      provide: ListJobsByIdsQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new ListJobsByIdsQueryHandler(jobRepository)
    },
    {
      provide: JobExistsQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new JobExistsQueryHandler(jobRepository)
    }
  ]
})
export class JobModule {}
