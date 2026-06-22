import { ApplicationError } from '@careerhub/infrastructure';

type ErrorLike = {
  code?: unknown;
  cause?: unknown;
  message?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getErrorCode(error: unknown): string {
  if (isRecord(error)) {
    const directCode = error.code;
    if (typeof directCode === 'string' && directCode.trim().length > 0) {
      return directCode.trim();
    }

    const cause = error.cause;
    if (cause && cause !== error) {
      return getErrorCode(cause);
    }
  }

  return 'INTERNAL_SERVER_ERROR';
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

export function createConflictForExistingSaga(input: {
  requestId: string;
  sagaId: string;
  status: string;
}): ApplicationError {
  const message =
    input.status === 'COMPLETED'
      ? `Registration request ${input.requestId} already completed`
      : `Registration request ${input.requestId} already exists with status ${input.status}`;

  return new ApplicationError(message, {
    code: 'CONFLICT',
    details: {
      requestId: input.requestId,
      sagaId: input.sagaId,
      status: input.status
    }
  });
}
