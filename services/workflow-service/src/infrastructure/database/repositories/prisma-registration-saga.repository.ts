import {
  ApplicationError,
  InfrastructureError
} from '@careerhub/infrastructure';
import type {
  CreateRegistrationSagaInput,
  RegistrationSagaProfilePayload,
  RegistrationSagaRecord,
  RegistrationSagaRepository,
  RegistrationSagaStatus,
  RegistrationSagaStepRecord,
  UpdateRegistrationSagaPatch,
  UpdateRegistrationSagaStepPatch
} from '../../../application';
import { RegistrationRequestConflictError } from '../../../application';
import type {
  RegistrationSagaPersistenceRecordWithSteps,
  RegistrationSagaStepUpdateInput
} from '../prisma/workflow-prisma.types';
import { WorkflowPrismaService } from '../prisma/workflow-prisma.service';

function parseResultSnapshot(
  value: string | null
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseProfilePayload(
  value: string | null
): RegistrationSagaProfilePayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'kind' in parsed &&
      'payload' in parsed
    ) {
      return parsed as RegistrationSagaProfilePayload;
    }

    return null;
  } catch {
    return null;
  }
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

export class PrismaRegistrationSagaRepository
  implements RegistrationSagaRepository
{
  constructor(private readonly prismaService: WorkflowPrismaService) {}

  async findAndClaimRecoverableBatch(input: {
    limit: number;
    staleBefore: Date;
  }): Promise<RegistrationSagaRecord[]> {
    const candidates = await this.prismaService.prisma.registrationSaga.findMany({
      include: {
        steps: true
      },
      orderBy: {
        updatedAt: 'asc'
      },
      take: input.limit,
      where: {
        status: {
          in: [
            'FAILED',
            'IN_PROGRESS',
            'RECOVERING',
            'COMPENSATING',
            'COMPENSATION_FAILED'
          ]
        },
        updatedAt: {
          lte: input.staleBefore
        }
      }
    });

    const claimed: RegistrationSagaRecord[] = [];

    for (const candidate of candidates) {
      const nextStatus: RegistrationSagaStatus =
        candidate.status === 'COMPENSATING' ||
        candidate.status === 'COMPENSATION_FAILED'
          ? 'COMPENSATING'
          : 'RECOVERING';
      const claimResult =
        await this.prismaService.prisma.registrationSaga.updateMany({
          data: {
            status: nextStatus
          },
          where: {
            id: candidate.id,
            status: candidate.status,
            updatedAt: candidate.updatedAt
          }
        });

      if (claimResult.count === 1) {
        claimed.push({
          ...this.mapSagaRecord(candidate),
          status: nextStatus
        });
      }
    }

    return claimed;
  }

  async createSaga(
    input: CreateRegistrationSagaInput
  ): Promise<RegistrationSagaRecord> {
    const now = new Date();

    try {
      await this.prismaService.prisma.$transaction(async (tx) => {
        await tx.registrationSaga.create({
          data: {
            email: input.email,
            flow: input.flow,
            id: input.id,
            profilePayloadJson: JSON.stringify(input.profilePayload),
            requestId: input.requestId ?? null,
            role: input.role,
            status: 'PENDING'
          }
        });

        await tx.registrationSagaStep.createMany({
          data: input.steps.map((step) => ({
            id: step.id,
            sagaId: input.id,
            status: 'PENDING',
            stepName: step.stepName
          }))
        });
      });
    } catch (error) {
      if (input.requestId && isPrismaUniqueConstraintError(error)) {
        const existingSaga = await this.findByRequestId(input.requestId);

        if (existingSaga) {
          throw new RegistrationRequestConflictError(
            input.requestId,
            existingSaga.status,
            existingSaga.id
          );
        }
      }

      throw new InfrastructureError('Failed to create registration saga', {
        cause: error instanceof Error ? error : undefined,
        code: 'REGISTRATION_SAGA_CREATE_FAILED'
      });
    }

    return {
      compensatedAt: null,
      completedAt: null,
      createdAt: now,
      email: input.email,
      failureCode: null,
      failureMessage: null,
      flow: input.flow,
      id: input.id,
      identityId: null,
      lastStep: null,
      profileId: null,
      profilePayload: input.profilePayload,
      requestId: input.requestId ?? null,
      role: input.role,
      status: 'PENDING',
      steps: input.steps.map((step) => ({
        attempts: 0,
        compensatedAt: null,
        compensationStatus: 'NOT_REQUIRED',
        completedAt: null,
        createdAt: now,
        id: step.id,
        lastError: null,
        resultSnapshot: null,
        sagaId: input.id,
        startedAt: null,
        status: 'PENDING',
        stepName: step.stepName,
        updatedAt: now
      })),
      updatedAt: now
    };
  }

  async findByRequestId(requestId: string): Promise<RegistrationSagaRecord | null> {
    const record = await this.prismaService.prisma.registrationSaga.findUnique({
      include: {
        steps: true
      },
      where: {
        requestId
      }
    });

    return record ? this.mapSagaRecord(record) : null;
  }

  async updateSaga(
    sagaId: string,
    patch: UpdateRegistrationSagaPatch
  ): Promise<void> {
    await this.prismaService.prisma.registrationSaga.update({
      data: patch,
      where: {
        id: sagaId
      }
    });
  }

  async updateStep(
    sagaId: string,
    stepName: RegistrationSagaStepRecord['stepName'],
    patch: UpdateRegistrationSagaStepPatch
  ): Promise<void> {
    const updateData: RegistrationSagaStepUpdateInput = {};

    if (patch.attemptsIncrement !== undefined) {
      updateData.attempts = {
        increment: patch.attemptsIncrement
      };
    }

    if (patch.compensatedAt !== undefined) {
      updateData.compensatedAt = patch.compensatedAt;
    }

    if (patch.compensationStatus !== undefined) {
      updateData.compensationStatus = patch.compensationStatus;
    }

    if (patch.completedAt !== undefined) {
      updateData.completedAt = patch.completedAt;
    }

    if (patch.lastError !== undefined) {
      updateData.lastError = patch.lastError;
    }

    if (patch.resultSnapshot !== undefined) {
      updateData.resultSnapshotJson =
        patch.resultSnapshot === null
          ? null
          : JSON.stringify(patch.resultSnapshot);
    }

    if (patch.startedAt !== undefined) {
      updateData.startedAt = patch.startedAt;
    }

    if (patch.status !== undefined) {
      updateData.status = patch.status;
    }

    const result = await this.prismaService.prisma.registrationSagaStep.updateMany({
      data: updateData,
      where: {
        sagaId,
        stepName
      }
    });

    if (result.count === 0) {
      throw new ApplicationError(
        `Registration saga step ${stepName} was not found for saga ${sagaId}`,
        {
          code: 'NOT_FOUND',
          details: {
            sagaId,
            stepName
          }
        }
      );
    }
  }

  private mapSagaRecord(
    record: RegistrationSagaPersistenceRecordWithSteps
  ): RegistrationSagaRecord {
    return {
      compensatedAt: record.compensatedAt,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
      email: record.email,
      failureCode: record.failureCode,
      failureMessage: record.failureMessage,
      flow: record.flow,
      id: record.id,
      identityId: record.identityId,
      lastStep: record.lastStep,
      profileId: record.profileId,
      profilePayload: parseProfilePayload(record.profilePayloadJson),
      requestId: record.requestId,
      role: record.role,
      status: record.status,
      steps: record.steps.map((step) => ({
        attempts: step.attempts,
        compensatedAt: step.compensatedAt,
        compensationStatus: step.compensationStatus,
        completedAt: step.completedAt,
        createdAt: step.createdAt,
        id: step.id,
        lastError: step.lastError,
        resultSnapshot: parseResultSnapshot(step.resultSnapshotJson),
        sagaId: step.sagaId,
        startedAt: step.startedAt,
        status: step.status,
        stepName: step.stepName,
        updatedAt: step.updatedAt
      })),
      updatedAt: record.updatedAt
    };
  }
}
