import {
  createPrismaModule,
  createRuntimeConfigModule,
  InMemoryMetricsRegistry,
  type MetricsRegistry
} from '@careerhub/infrastructure';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  COMMUNICATION_PORT_TOKENS,
  NotificationOperationsService
} from './application';
import { validateCommunicationEnvironment, type CommunicationEnvironmentVariables } from './config';
import {
  COMMUNICATION_PRISMA_TOKENS,
  CommunicationNotificationConsumer,
  CommunicationPrismaService,
  createCommunicationPrismaClient,
  IamGrpcIdentityLookup,
  PrismaNotificationRepository,
  PrismaRecruitmentMailDeliveryRepository,
  RecruitmentMailConsumer,
  RecruitmentMailService
} from './infrastructure';
import { COMMUNICATION_METRICS_TOKENS } from './infrastructure/metrics/communication-metrics.constants';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { CommunicationGrpcController } from './presentation';

@Module({
  controllers: [CommunicationGrpcController],
  imports: [
    createRuntimeConfigModule({
      validate: validateCommunicationEnvironment
    }),
    createPrismaModule({
      clientToken: COMMUNICATION_PRISMA_TOKENS.client,
      createClient: createCommunicationPrismaClient,
      createService: (client) => new CommunicationPrismaService(client),
      readinessCheckName: 'communication-prisma',
      readinessCheckToken: COMMUNICATION_PRISMA_TOKENS.readinessCheck,
      serviceToken: COMMUNICATION_PRISMA_TOKENS.service
    })
  ],
  providers: [
    {
      provide: COMMUNICATION_METRICS_TOKENS.registry,
      useFactory: (): MetricsRegistry => new InMemoryMetricsRegistry()
    },
    {
      provide: COMMUNICATION_PORT_TOKENS.notificationRepository,
      inject: [COMMUNICATION_PRISMA_TOKENS.service],
      useFactory: (prismaService: CommunicationPrismaService) =>
        new PrismaNotificationRepository(prismaService)
    },
    {
      provide: COMMUNICATION_PORT_TOKENS.recruitmentMailDeliveryRepository,
      inject: [COMMUNICATION_PRISMA_TOKENS.service],
      useFactory: (prismaService: CommunicationPrismaService) =>
        new PrismaRecruitmentMailDeliveryRepository(prismaService)
    },
    {
      provide: COMMUNICATION_PORT_TOKENS.identityLookup,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<CommunicationEnvironmentVariables, true>) =>
        new IamGrpcIdentityLookup(configService.getOrThrow('GRPC_IAM_URL'))
    },
    {
      provide: COMMUNICATION_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: NotificationOperationsService,
      inject: [
        COMMUNICATION_PORT_TOKENS.notificationRepository,
        COMMUNICATION_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        notificationRepository: PrismaNotificationRepository,
        idGenerator: UuidIdGenerator
      ) =>
        new NotificationOperationsService(notificationRepository, idGenerator)
    },
    CommunicationNotificationConsumer,
    RecruitmentMailService,
    RecruitmentMailConsumer
  ]
})
export class CommunicationModule {}
