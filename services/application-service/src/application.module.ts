import {

  createPrismaModule,

  createRuntimeConfigModule,

  InMemoryMetricsRegistry,

  type MetricsRegistry

} from '@careerhub/infrastructure';

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {

  AcceptOfferCommandHandler,

  APPLICATION_PORT_TOKENS,

  ApplicationOperations,

  ApplyToJobCommandHandler,

  CancelInterviewCommandHandler,

  ConfirmInterviewCommandHandler,

  CreateInterviewCommandHandler,

  CreateOfferCommandHandler,

  CreateRecruiterNoteCommandHandler,

  DeclineInterviewCommandHandler,

  DeclineOfferCommandHandler,

  DeleteRecruiterNoteCommandHandler,

  EmployerDashboardOperations,

  GetApplicationCountsByJobIdsQueryHandler,

  GetApplicationHistoryQueryHandler,

  GetApplicationRelatedDataQueryHandler,

  GetCandidateApplicationByIdQueryHandler,

  GetCandidateInterviewQueryHandler,

  GetCandidateOfferQueryHandler,

  GetEmployerApplicationByIdQueryHandler,

  GetEmployerDashboardRecruitmentDataQueryHandler,

  GetEmployerOfferQueryHandler,

  InterviewOperations,

  ListBenefitCatalogQueryHandler,

  ListCandidateApplicationsQueryHandler,

  ListCandidateOffersForApplicationQueryHandler,

  ListEmployerInterviewsQueryHandler,

  ListEmployerOffersForApplicationQueryHandler,

  ListJobApplicationsQueryHandler,

  ListRecruiterNotesQueryHandler,

  OfferOperations,

  RecruiterNoteOperations,

  RequestInterviewRescheduleCommandHandler,

  SendOfferCommandHandler,

  SoftDeleteOfferCommandHandler,

  UpdateApplicationStatusCommandHandler,

  UpdateInterviewCommandHandler,

  UpdateOfferCommandHandler,

  UpdateRecruiterNoteCommandHandler,

  WithdrawApplicationCommandHandler

} from './application';

import {
  ApplicationNotificationEventFactory,
  createDefaultApplicationNotificationEventFactory
} from './application/notifications/application-notification-event.factory';
import {
  ApplicationMailContextQuery
} from './application/mail/application-mail-context.query';
import {
  ApplicationMailEventFactory,
  createDefaultApplicationMailEventFactory
} from './application/mail/application-mail-event.factory';
import { JobGrpcMailContextLookup } from './infrastructure/transport/grpc/job-grpc-mail-context.lookup';

import { validateApplicationEnvironment } from './config';

import {

  ApplicationPrismaService,

  APPLICATION_METRICS_TOKENS,

  APPLICATION_PRISMA_TOKENS,

  ApplicationOutboxProcessor,

  ApplicationOutboxPublisher,

  createApplicationPrismaClient,

  PrismaApplicationOutboxRepository,

  PrismaApplicationRepository,

  PrismaApplicationWriteTransaction,

  PrismaRecruitmentRepository

} from './infrastructure';

import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';

import { ApplicationGrpcController } from './presentation';



@Module({

  controllers: [ApplicationGrpcController],

  imports: [

    createRuntimeConfigModule({

      validate: validateApplicationEnvironment

    }),

    createPrismaModule({

      clientToken: APPLICATION_PRISMA_TOKENS.client,

      createClient: createApplicationPrismaClient,

      createService: (client) => new ApplicationPrismaService(client),

      readinessCheckName: 'application-prisma',

      readinessCheckToken: APPLICATION_PRISMA_TOKENS.readinessCheck,

      serviceToken: APPLICATION_PRISMA_TOKENS.service

    })

  ],

  providers: [

    {

      provide: APPLICATION_METRICS_TOKENS.registry,

      useFactory: (): MetricsRegistry => new InMemoryMetricsRegistry()

    },

    {

      provide: APPLICATION_PORT_TOKENS.applicationRepository,

      inject: [APPLICATION_PRISMA_TOKENS.service],

      useFactory: (prismaService: ApplicationPrismaService) =>

        new PrismaApplicationRepository(prismaService.prisma)

    },

    {

      provide: APPLICATION_PORT_TOKENS.recruitmentRepository,

      inject: [APPLICATION_PRISMA_TOKENS.service],

      useFactory: (prismaService: ApplicationPrismaService) =>

        new PrismaRecruitmentRepository(prismaService.prisma)

    },

    {

      provide: APPLICATION_PORT_TOKENS.outboxRepository,

      inject: [APPLICATION_PRISMA_TOKENS.service],

      useFactory: (prismaService: ApplicationPrismaService) =>

        new PrismaApplicationOutboxRepository(prismaService.prisma)

    },

    {

      provide: APPLICATION_PORT_TOKENS.writeTransaction,

      inject: [APPLICATION_PRISMA_TOKENS.service],

      useFactory: (prismaService: ApplicationPrismaService) =>

        new PrismaApplicationWriteTransaction(prismaService)

    },

    {

      provide: ApplicationNotificationEventFactory,

      useFactory: () => createDefaultApplicationNotificationEventFactory()

    },

    {

      provide: APPLICATION_PORT_TOKENS.jobMailContextLookup,

      inject: [ConfigService],

      useFactory: (configService: ConfigService) =>
        new JobGrpcMailContextLookup(configService.getOrThrow('GRPC_JOB_URL'))

    },

    {

      provide: ApplicationMailContextQuery,

      inject: [APPLICATION_PORT_TOKENS.jobMailContextLookup, ConfigService],

      useFactory: (
        jobMailContextLookup: JobGrpcMailContextLookup,
        configService: ConfigService
      ) =>
        new ApplicationMailContextQuery({
          appBaseUrl: configService.getOrThrow('APP_BASE_URL'),
          jobMailContextLookup
        })

    },

    {

      provide: ApplicationMailEventFactory,

      inject: [ApplicationMailContextQuery],

      useFactory: (mailContextQuery: ApplicationMailContextQuery) =>
        createDefaultApplicationMailEventFactory(mailContextQuery)

    },

    ApplicationOutboxPublisher,

    ApplicationOutboxProcessor,

    {

      provide: APPLICATION_PORT_TOKENS.idGenerator,

      useClass: UuidIdGenerator

    },

    {

      provide: InterviewOperations,

      inject: [

        APPLICATION_PORT_TOKENS.applicationRepository,

        APPLICATION_PORT_TOKENS.recruitmentRepository,

        APPLICATION_PORT_TOKENS.writeTransaction,

        ApplicationNotificationEventFactory,
        ApplicationMailEventFactory,

        APPLICATION_PORT_TOKENS.idGenerator

      ],

      useFactory: (

        applicationRepository: PrismaApplicationRepository,

        recruitmentRepository: PrismaRecruitmentRepository,

        writeTransaction: PrismaApplicationWriteTransaction,

        notificationEventFactory: ApplicationNotificationEventFactory,
        mailEventFactory: ApplicationMailEventFactory,

        idGenerator: UuidIdGenerator

      ) =>
        new InterviewOperations(
          applicationRepository,
          recruitmentRepository,
          writeTransaction,
          notificationEventFactory,
          mailEventFactory,
          idGenerator
        )

    },

    {

      provide: OfferOperations,

      inject: [

        APPLICATION_PORT_TOKENS.applicationRepository,

        APPLICATION_PORT_TOKENS.recruitmentRepository,

        APPLICATION_PORT_TOKENS.writeTransaction,

        ApplicationNotificationEventFactory,
        ApplicationMailEventFactory,

        APPLICATION_PORT_TOKENS.idGenerator

      ],

      useFactory: (

        applicationRepository: PrismaApplicationRepository,

        recruitmentRepository: PrismaRecruitmentRepository,

        writeTransaction: PrismaApplicationWriteTransaction,

        notificationEventFactory: ApplicationNotificationEventFactory,
        mailEventFactory: ApplicationMailEventFactory,

        idGenerator: UuidIdGenerator

      ) =>
        new OfferOperations(
          applicationRepository,
          recruitmentRepository,
          writeTransaction,
          notificationEventFactory,
          mailEventFactory,
          idGenerator
        )

    },

    {

      provide: ApplicationOperations,

      inject: [

        APPLICATION_PORT_TOKENS.applicationRepository,

        APPLICATION_PORT_TOKENS.writeTransaction,

        ApplicationNotificationEventFactory,

        APPLICATION_PORT_TOKENS.idGenerator

      ],

      useFactory: (

        applicationRepository: PrismaApplicationRepository,

        writeTransaction: PrismaApplicationWriteTransaction,

        notificationEventFactory: ApplicationNotificationEventFactory,

        idGenerator: UuidIdGenerator

      ) =>
        new ApplicationOperations(
          applicationRepository,
          writeTransaction,
          notificationEventFactory,
          idGenerator
        )

    },

    {

      provide: ApplyToJobCommandHandler,

      inject: [ApplicationOperations],

      useFactory: (applicationOperations: ApplicationOperations) =>

        new ApplyToJobCommandHandler(applicationOperations)

    },

    {

      provide: WithdrawApplicationCommandHandler,

      inject: [ApplicationOperations],

      useFactory: (applicationOperations: ApplicationOperations) =>

        new WithdrawApplicationCommandHandler(applicationOperations)

    },

    {

      provide: UpdateApplicationStatusCommandHandler,

      inject: [ApplicationOperations],

      useFactory: (applicationOperations: ApplicationOperations) =>

        new UpdateApplicationStatusCommandHandler(applicationOperations)

    },

    {

      provide: CreateInterviewCommandHandler,

      inject: [InterviewOperations],

      useFactory: (interviewOperations: InterviewOperations) =>

        new CreateInterviewCommandHandler(interviewOperations)

    },

    {

      provide: UpdateInterviewCommandHandler,

      inject: [InterviewOperations],

      useFactory: (interviewOperations: InterviewOperations) =>

        new UpdateInterviewCommandHandler(interviewOperations)

    },

    {

      provide: CancelInterviewCommandHandler,

      inject: [InterviewOperations],

      useFactory: (interviewOperations: InterviewOperations) =>

        new CancelInterviewCommandHandler(interviewOperations)

    },

    {

      provide: ConfirmInterviewCommandHandler,

      inject: [InterviewOperations],

      useFactory: (interviewOperations: InterviewOperations) =>

        new ConfirmInterviewCommandHandler(interviewOperations)

    },

    {

      provide: DeclineInterviewCommandHandler,

      inject: [InterviewOperations],

      useFactory: (interviewOperations: InterviewOperations) =>

        new DeclineInterviewCommandHandler(interviewOperations)

    },

    {

      provide: RequestInterviewRescheduleCommandHandler,

      inject: [InterviewOperations],

      useFactory: (interviewOperations: InterviewOperations) =>

        new RequestInterviewRescheduleCommandHandler(interviewOperations)

    },

    {

      provide: CreateOfferCommandHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new CreateOfferCommandHandler(offerOperations)

    },

    {

      provide: SendOfferCommandHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new SendOfferCommandHandler(offerOperations)

    },

    {

      provide: UpdateOfferCommandHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new UpdateOfferCommandHandler(offerOperations)

    },

    {

      provide: SoftDeleteOfferCommandHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new SoftDeleteOfferCommandHandler(offerOperations)

    },

    {

      provide: AcceptOfferCommandHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new AcceptOfferCommandHandler(offerOperations)

    },

    {

      provide: DeclineOfferCommandHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new DeclineOfferCommandHandler(offerOperations)

    },

    {

      provide: ListCandidateApplicationsQueryHandler,

      inject: [APPLICATION_PORT_TOKENS.applicationRepository],

      useFactory: (applicationRepository: PrismaApplicationRepository) =>

        new ListCandidateApplicationsQueryHandler(applicationRepository)

    },

    {

      provide: GetCandidateApplicationByIdQueryHandler,

      inject: [APPLICATION_PORT_TOKENS.applicationRepository],

      useFactory: (applicationRepository: PrismaApplicationRepository) =>

        new GetCandidateApplicationByIdQueryHandler(applicationRepository)

    },

    {

      provide: ListJobApplicationsQueryHandler,

      inject: [APPLICATION_PORT_TOKENS.applicationRepository],

      useFactory: (applicationRepository: PrismaApplicationRepository) =>

        new ListJobApplicationsQueryHandler(applicationRepository)

    },

    {

      provide: GetEmployerApplicationByIdQueryHandler,

      inject: [APPLICATION_PORT_TOKENS.applicationRepository],

      useFactory: (applicationRepository: PrismaApplicationRepository) =>

        new GetEmployerApplicationByIdQueryHandler(applicationRepository)

    },

    {

      provide: GetApplicationHistoryQueryHandler,

      inject: [APPLICATION_PORT_TOKENS.applicationRepository],

      useFactory: (applicationRepository: PrismaApplicationRepository) =>

        new GetApplicationHistoryQueryHandler(applicationRepository)

    },

    {

      provide: GetApplicationRelatedDataQueryHandler,

      inject: [APPLICATION_PORT_TOKENS.applicationRepository],

      useFactory: (applicationRepository: PrismaApplicationRepository) =>

        new GetApplicationRelatedDataQueryHandler(applicationRepository)

    },

    {

      provide: GetApplicationCountsByJobIdsQueryHandler,

      inject: [APPLICATION_PORT_TOKENS.applicationRepository],

      useFactory: (applicationRepository: PrismaApplicationRepository) =>

        new GetApplicationCountsByJobIdsQueryHandler(applicationRepository)

    },

    {

      provide: ListEmployerInterviewsQueryHandler,

      inject: [InterviewOperations],

      useFactory: (interviewOperations: InterviewOperations) =>

        new ListEmployerInterviewsQueryHandler(interviewOperations)

    },

    {

      provide: GetCandidateInterviewQueryHandler,

      inject: [InterviewOperations],

      useFactory: (interviewOperations: InterviewOperations) =>

        new GetCandidateInterviewQueryHandler(interviewOperations)

    },

    {

      provide: ListBenefitCatalogQueryHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new ListBenefitCatalogQueryHandler(offerOperations)

    },

    {

      provide: ListEmployerOffersForApplicationQueryHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new ListEmployerOffersForApplicationQueryHandler(offerOperations)

    },

    {

      provide: GetEmployerOfferQueryHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new GetEmployerOfferQueryHandler(offerOperations)

    },

    {

      provide: ListCandidateOffersForApplicationQueryHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new ListCandidateOffersForApplicationQueryHandler(offerOperations)

    },

    {

      provide: GetCandidateOfferQueryHandler,

      inject: [OfferOperations],

      useFactory: (offerOperations: OfferOperations) =>

        new GetCandidateOfferQueryHandler(offerOperations)

    },

    {

      provide: EmployerDashboardOperations,

      inject: [

        APPLICATION_PORT_TOKENS.applicationRepository,

        APPLICATION_PORT_TOKENS.recruitmentRepository

      ],

      useFactory: (

        applicationRepository: PrismaApplicationRepository,

        recruitmentRepository: PrismaRecruitmentRepository

      ) => new EmployerDashboardOperations(applicationRepository, recruitmentRepository)

    },

    {

      provide: RecruiterNoteOperations,

      inject: [

        APPLICATION_PORT_TOKENS.applicationRepository,

        APPLICATION_PORT_TOKENS.idGenerator

      ],

      useFactory: (

        applicationRepository: PrismaApplicationRepository,

        idGenerator: UuidIdGenerator

      ) => new RecruiterNoteOperations(applicationRepository, idGenerator)

    },

    {

      provide: GetEmployerDashboardRecruitmentDataQueryHandler,

      inject: [EmployerDashboardOperations],

      useFactory: (employerDashboardOperations: EmployerDashboardOperations) =>

        new GetEmployerDashboardRecruitmentDataQueryHandler(employerDashboardOperations)

    },

    {

      provide: ListRecruiterNotesQueryHandler,

      inject: [RecruiterNoteOperations],

      useFactory: (recruiterNoteOperations: RecruiterNoteOperations) =>

        new ListRecruiterNotesQueryHandler(recruiterNoteOperations)

    },

    {

      provide: CreateRecruiterNoteCommandHandler,

      inject: [RecruiterNoteOperations],

      useFactory: (recruiterNoteOperations: RecruiterNoteOperations) =>

        new CreateRecruiterNoteCommandHandler(recruiterNoteOperations)

    },

    {

      provide: UpdateRecruiterNoteCommandHandler,

      inject: [RecruiterNoteOperations],

      useFactory: (recruiterNoteOperations: RecruiterNoteOperations) =>

        new UpdateRecruiterNoteCommandHandler(recruiterNoteOperations)

    },

    {

      provide: DeleteRecruiterNoteCommandHandler,

      inject: [RecruiterNoteOperations],

      useFactory: (recruiterNoteOperations: RecruiterNoteOperations) =>

        new DeleteRecruiterNoteCommandHandler(recruiterNoteOperations)

    }

  ]

})

export class ApplicationModule {}

