import {
  createPrismaModule,
  createRuntimeConfigModule
} from '@careerhub/infrastructure';
import { Module } from '@nestjs/common';
import {
  CreateDepartmentCommandHandler,
  CreateEmployerProfileCommandHandler,
  DeleteDepartmentCommandHandler,
  DeleteEmployerProfileCompensationCommandHandler,
  EMPLOYER_PORT_TOKENS,
  GetEmployerProfileByIdentityIdQueryHandler,
  ListDepartmentsByCompanyQueryHandler,
  UpdateDepartmentCommandHandler,
  UpdateEmployerProfileCommandHandler
} from './application';
import { validateEmployerEnvironment } from './config';
import {
  createEmployerPrismaClient,
  EmployerPrismaService,
  EMPLOYER_PRISMA_TOKENS,
  PrismaDepartmentRepository,
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
      provide: CreateEmployerProfileCommandHandler,
      inject: [
        EMPLOYER_PORT_TOKENS.employerProfileRepository,
        EMPLOYER_PORT_TOKENS.idGenerator
      ],
      useFactory: (
        employerProfileRepository: PrismaEmployerProfileRepository,
        idGenerator: UuidIdGenerator
      ) =>
        new CreateEmployerProfileCommandHandler(
          employerProfileRepository,
          idGenerator
        )
    },
    {
      provide: DeleteEmployerProfileCompensationCommandHandler,
      inject: [EMPLOYER_PORT_TOKENS.employerProfileRepository],
      useFactory: (
        employerProfileRepository: PrismaEmployerProfileRepository
      ) =>
        new DeleteEmployerProfileCompensationCommandHandler(
          employerProfileRepository
        )
    },
    {
      provide: GetEmployerProfileByIdentityIdQueryHandler,
      inject: [EMPLOYER_PORT_TOKENS.employerProfileRepository],
      useFactory: (
        employerProfileRepository: PrismaEmployerProfileRepository
      ) =>
        new GetEmployerProfileByIdentityIdQueryHandler(
          employerProfileRepository
        )
    },
    {
      provide: UpdateEmployerProfileCommandHandler,
      inject: [EMPLOYER_PORT_TOKENS.employerProfileRepository],
      useFactory: (
        employerProfileRepository: PrismaEmployerProfileRepository
      ) =>
        new UpdateEmployerProfileCommandHandler(employerProfileRepository)
    },
    {
      provide: EMPLOYER_PORT_TOKENS.departmentRepository,
      inject: [EMPLOYER_PRISMA_TOKENS.service],
      useFactory: (prismaService: EmployerPrismaService) =>
        new PrismaDepartmentRepository(prismaService)
    },
    {
      provide: CreateDepartmentCommandHandler,
      inject: [EMPLOYER_PORT_TOKENS.departmentRepository, EMPLOYER_PORT_TOKENS.idGenerator],
      useFactory: (
        departmentRepository: PrismaDepartmentRepository,
        idGenerator: UuidIdGenerator
      ) => new CreateDepartmentCommandHandler(departmentRepository, idGenerator)
    },
    {
      provide: UpdateDepartmentCommandHandler,
      inject: [EMPLOYER_PORT_TOKENS.departmentRepository],
      useFactory: (departmentRepository: PrismaDepartmentRepository) =>
        new UpdateDepartmentCommandHandler(departmentRepository)
    },
    {
      provide: DeleteDepartmentCommandHandler,
      inject: [EMPLOYER_PORT_TOKENS.departmentRepository],
      useFactory: (departmentRepository: PrismaDepartmentRepository) =>
        new DeleteDepartmentCommandHandler(departmentRepository)
    },
    {
      provide: ListDepartmentsByCompanyQueryHandler,
      inject: [EMPLOYER_PORT_TOKENS.departmentRepository],
      useFactory: (departmentRepository: PrismaDepartmentRepository) =>
        new ListDepartmentsByCompanyQueryHandler(departmentRepository)
    }
  ]
})
export class EmployerModule {}
