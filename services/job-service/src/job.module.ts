import {
  InMemoryMetricsRegistry,
  type MetricsRegistry,
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/infrastructure';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  ArchiveJobCommandHandler,
  CloseJobCommandHandler,
  CreateJobCommandHandler,
  DeleteJobCommandHandler,
  GetEmployerDashboardJobsSummaryQueryHandler,
  GetEmployerJobByIdQueryHandler,
  GetJobForApplicationQueryHandler,
  GetPublicJobBySlugQueryHandler,
  JOB_PORT_TOKENS,
  JobExistsQueryHandler,
  ListEmployerJobsQueryHandler,
  ListJobsByIdsQueryHandler,
  ListPublicJobsQueryHandler,
  PublishJobCommandHandler,
  ReopenJobCommandHandler,
  UpdateJobCommandHandler,
  type JobSearchCache,
  type JobSearchIndexer,
  type JobSearchRepository,
  type JobSlugCache
} from './application';
import { getJobRuntimeConfig, validateJobEnvironment } from './config';
import {
  JobSearchIndexConsumer,
  JobSlugCacheInvalidationConsumer,
  MeilisearchJobRepository,
  RedisJobSearchCache,
  RedisJobSlugCache,
  createJobPrismaClient,
  JOB_METRICS_TOKENS,
  JOB_PRISMA_TOKENS,
  JobOutboxProcessor,
  JobOutboxPublisher,
  JobPrismaService,
  PrismaJobOutboxRepository,
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
      provide: JOB_METRICS_TOKENS.registry,
      useFactory: (): MetricsRegistry => new InMemoryMetricsRegistry()
    },
    {
      provide: JOB_PORT_TOKENS.jobRepository,
      inject: [JOB_PRISMA_TOKENS.service],
      useFactory: (prismaService: JobPrismaService) =>
        new PrismaJobRepository(prismaService)
    },
    {
      provide: JOB_PORT_TOKENS.outboxRepository,
      inject: [JOB_PRISMA_TOKENS.service],
      useFactory: (prismaService: JobPrismaService) =>
        new PrismaJobOutboxRepository(prismaService.prisma)
    },
    {
      provide: JOB_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: JOB_PORT_TOKENS.slugCache,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JobSlugCache | null => {
        const cfg = getJobRuntimeConfig(configService);
        if (!cfg.redisUrl) return null;
        const redis = new Redis(cfg.redisUrl, { lazyConnect: false });
        return new RedisJobSlugCache(redis, cfg.redisSlugCacheTtlS);
      }
    },
    {
      provide: JOB_PORT_TOKENS.jobSearchCache,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JobSearchCache | null => {
        const cfg = getJobRuntimeConfig(configService);
        if (!cfg.redisUrl) return null;
        const redis = new Redis(cfg.redisUrl, { lazyConnect: false });
        return new RedisJobSearchCache(redis, cfg.redisSearchCacheTtlS);
      }
    },
    {
      provide: JOB_PORT_TOKENS.jobSearchRepository,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JobSearchRepository | null => {
        const cfg = getJobRuntimeConfig(configService);
        if (!cfg.meilisearchHost) return null;
        return new MeilisearchJobRepository(cfg.meilisearchHost, cfg.meilisearchApiKey);
      }
    },
    {
      provide: JOB_PORT_TOKENS.jobSearchIndexer,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JobSearchIndexer | null => {
        const cfg = getJobRuntimeConfig(configService);
        if (!cfg.meilisearchHost) return null;
        return new MeilisearchJobRepository(cfg.meilisearchHost, cfg.meilisearchApiKey);
      }
    },
    JobOutboxPublisher,
    JobOutboxProcessor,
    JobSlugCacheInvalidationConsumer,
    JobSearchIndexConsumer,
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
      inject: [
        JOB_PORT_TOKENS.jobRepository,
        JOB_PORT_TOKENS.outboxRepository,
        JOB_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        jobRepository: PrismaJobRepository,
        outboxRepository: PrismaJobOutboxRepository,
        idGenerator: UuidIdGenerator
      ) => new UpdateJobCommandHandler(jobRepository, outboxRepository, idGenerator)
    },
    {
      provide: PublishJobCommandHandler,
      inject: [
        JOB_PORT_TOKENS.jobRepository,
        JOB_PORT_TOKENS.outboxRepository,
        JOB_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        jobRepository: PrismaJobRepository,
        outboxRepository: PrismaJobOutboxRepository,
        idGenerator: UuidIdGenerator
      ) => new PublishJobCommandHandler(jobRepository, outboxRepository, idGenerator)
    },
    {
      provide: CloseJobCommandHandler,
      inject: [
        JOB_PORT_TOKENS.jobRepository,
        JOB_PORT_TOKENS.outboxRepository,
        JOB_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        jobRepository: PrismaJobRepository,
        outboxRepository: PrismaJobOutboxRepository,
        idGenerator: UuidIdGenerator
      ) => new CloseJobCommandHandler(jobRepository, outboxRepository, idGenerator)
    },
    {
      provide: ArchiveJobCommandHandler,
      inject: [
        JOB_PORT_TOKENS.jobRepository,
        JOB_PORT_TOKENS.outboxRepository,
        JOB_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        jobRepository: PrismaJobRepository,
        outboxRepository: PrismaJobOutboxRepository,
        idGenerator: UuidIdGenerator
      ) => new ArchiveJobCommandHandler(jobRepository, outboxRepository, idGenerator)
    },
    {
      provide: ReopenJobCommandHandler,
      inject: [
        JOB_PORT_TOKENS.jobRepository,
        JOB_PORT_TOKENS.outboxRepository,
        JOB_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        jobRepository: PrismaJobRepository,
        outboxRepository: PrismaJobOutboxRepository,
        idGenerator: UuidIdGenerator
      ) => new ReopenJobCommandHandler(jobRepository, outboxRepository, idGenerator)
    },
    {
      provide: DeleteJobCommandHandler,
      inject: [
        JOB_PORT_TOKENS.jobRepository,
        JOB_PORT_TOKENS.outboxRepository,
        JOB_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        jobRepository: PrismaJobRepository,
        outboxRepository: PrismaJobOutboxRepository,
        idGenerator: UuidIdGenerator
      ) => new DeleteJobCommandHandler(jobRepository, outboxRepository, idGenerator)
    },
    {
      provide: ListPublicJobsQueryHandler,
      inject: [
        JOB_PORT_TOKENS.jobRepository,
        JOB_PORT_TOKENS.jobSearchRepository,
        JOB_PORT_TOKENS.jobSearchCache
      ],
      useFactory: (
        jobRepository: PrismaJobRepository,
        jobSearchRepository: JobSearchRepository | null,
        jobSearchCache: JobSearchCache | null
      ) =>
        new ListPublicJobsQueryHandler(
          jobRepository,
          jobSearchRepository ?? undefined,
          jobSearchCache ?? undefined
        )
    },
    {
      provide: GetPublicJobBySlugQueryHandler,
      inject: [
        JOB_PORT_TOKENS.jobRepository,
        JOB_PORT_TOKENS.slugCache,
        JOB_PORT_TOKENS.jobSearchRepository
      ],
      useFactory: (
        jobRepository: PrismaJobRepository,
        slugCache: JobSlugCache | null,
        jobSearchRepository: JobSearchRepository | null
      ) =>
        new GetPublicJobBySlugQueryHandler(
          jobRepository,
          slugCache ?? undefined,
          jobSearchRepository ?? undefined
        )
    },
    {
      provide: ListEmployerJobsQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new ListEmployerJobsQueryHandler(jobRepository)
    },
    {
      provide: GetEmployerDashboardJobsSummaryQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new GetEmployerDashboardJobsSummaryQueryHandler(jobRepository)
    },
    {
      provide: GetEmployerJobByIdQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new GetEmployerJobByIdQueryHandler(jobRepository)
    },
    {
      provide: GetJobForApplicationQueryHandler,
      inject: [JOB_PORT_TOKENS.jobRepository],
      useFactory: (jobRepository: PrismaJobRepository) =>
        new GetJobForApplicationQueryHandler(jobRepository)
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
