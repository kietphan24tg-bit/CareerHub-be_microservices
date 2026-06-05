import {
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/nest-common';
import { Module } from '@nestjs/common';
import {
  CreateEmployerProfileUseCase,
  EMPLOYER_PORT_TOKENS
} from './application';
import { validateEmployerEnvironment } from './config';
import {
  createEmployerPrismaClient,
  EmployerPrismaService,
  EMPLOYER_PRISMA_TOKENS,
  PrismaEmployerProfileRepository
} from './infrastructure';
import { UuidIdGenerator } from './infrastructure/id/uuid-id-generator';
import { EmployerGrpcController } from './presentation';

@Module({
  controllers: [EmployerGrpcController],
  imports: [
    createRuntimeConfigModule({
      validate: validateEmployerEnvironment
    }),
    createPrismaModule({
      clientToken: EMPLOYER_PRISMA_TOKENS.client,
      createClient: createEmployerPrismaClient,
      createService: (client) => new EmployerPrismaService(client),
      readinessCheckName: 'employer-prisma',
      readinessCheckToken: EMPLOYER_PRISMA_TOKENS.readinessCheck,
      serviceToken: EMPLOYER_PRISMA_TOKENS.service
    })
  ],
  providers: [
    {
      provide: EMPLOYER_PORT_TOKENS.employerProfileRepository,
      inject: [EMPLOYER_PRISMA_TOKENS.service],
      useFactory: (prismaService: EmployerPrismaService) =>
        new PrismaEmployerProfileRepository(prismaService)
    },
    {
      provide: EMPLOYER_PORT_TOKENS.idGenerator,
      useClass: UuidIdGenerator
    },
    {
      provide: CreateEmployerProfileUseCase,
      inject: [
        EMPLOYER_PORT_TOKENS.employerProfileRepository,
        EMPLOYER_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        employerProfileRepository: PrismaEmployerProfileRepository,
        idGenerator: UuidIdGenerator
      ) =>
        new CreateEmployerProfileUseCase(employerProfileRepository, idGenerator)
    }
  ]
})
export class EmployerModule {}
