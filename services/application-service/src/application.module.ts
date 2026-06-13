import {

  createPrismaModule,

  createRuntimeConfigModule

} from '@careerhub/infrastructure';

import { Module } from '@nestjs/common';

import {

  AcceptOfferCommandHandler,

  APPLICATION_PORT_TOKENS,

  ApplicationOperations,

  ApplyToJobCommandHandler,

  CancelInterviewCommandHandler,

  ConfirmInterviewCommandHandler,

  CreateInterviewCommandHandler,

  CreateOfferCommandHandler,

  DeclineInterviewCommandHandler,

  DeclineOfferCommandHandler,

  GetApplicationCountsByJobIdsQueryHandler,

  GetApplicationHistoryQueryHandler,

  GetApplicationRelatedDataQueryHandler,

  GetCandidateApplicationByIdQueryHandler,

  GetCandidateInterviewQueryHandler,

  GetCandidateOfferQueryHandler,

  GetEmployerApplicationByIdQueryHandler,

  GetEmployerOfferQueryHandler,

  InterviewOperations,

  ListBenefitCatalogQueryHandler,

  ListCandidateApplicationsQueryHandler,

  ListCandidateOffersForApplicationQueryHandler,

  ListEmployerInterviewsQueryHandler,

  ListEmployerOffersForApplicationQueryHandler,

  ListJobApplicationsQueryHandler,

  OfferOperations,

  RequestInterviewRescheduleCommandHandler,

  SendOfferCommandHandler,

  SoftDeleteOfferCommandHandler,

  UpdateApplicationStatusCommandHandler,

  UpdateInterviewCommandHandler,

  UpdateOfferCommandHandler,

  WithdrawApplicationCommandHandler

} from './application';

import { validateApplicationEnvironment } from './config';

import {

  ApplicationPrismaService,

  APPLICATION_PRISMA_TOKENS,

  createApplicationPrismaClient,

  PrismaApplicationRepository,

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

      provide: APPLICATION_PORT_TOKENS.applicationRepository,

      inject: [APPLICATION_PRISMA_TOKENS.service],

      useFactory: (prismaService: ApplicationPrismaService) =>

        new PrismaApplicationRepository(prismaService)

    },

    {

      provide: APPLICATION_PORT_TOKENS.recruitmentRepository,

      inject: [APPLICATION_PRISMA_TOKENS.service],

      useFactory: (prismaService: ApplicationPrismaService) =>

        new PrismaRecruitmentRepository(prismaService)

    },

    {

      provide: APPLICATION_PORT_TOKENS.idGenerator,

      useClass: UuidIdGenerator

    },

    {

      provide: InterviewOperations,

      inject: [

        APPLICATION_PORT_TOKENS.applicationRepository,

        APPLICATION_PORT_TOKENS.recruitmentRepository,

        APPLICATION_PORT_TOKENS.idGenerator

      ],

      useFactory: (

        applicationRepository: PrismaApplicationRepository,

        recruitmentRepository: PrismaRecruitmentRepository,

        idGenerator: UuidIdGenerator

      ) => new InterviewOperations(applicationRepository, recruitmentRepository, idGenerator)

    },

    {

      provide: OfferOperations,

      inject: [

        APPLICATION_PORT_TOKENS.applicationRepository,

        APPLICATION_PORT_TOKENS.recruitmentRepository,

        APPLICATION_PORT_TOKENS.idGenerator

      ],

      useFactory: (

        applicationRepository: PrismaApplicationRepository,

        recruitmentRepository: PrismaRecruitmentRepository,

        idGenerator: UuidIdGenerator

      ) => new OfferOperations(applicationRepository, recruitmentRepository, idGenerator)

    },

    {

      provide: ApplicationOperations,

      inject: [

        APPLICATION_PORT_TOKENS.applicationRepository,

        APPLICATION_PORT_TOKENS.idGenerator

      ],

      useFactory: (

        applicationRepository: PrismaApplicationRepository,

        idGenerator: UuidIdGenerator

      ) => new ApplicationOperations(applicationRepository, idGenerator)

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

    }

  ]

})

export class ApplicationModule {}

