import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import { DomainError, ValidationError } from '@careerhub/shared-kernel';
import { ApplicationError } from '../errors/application-error';
import { InfrastructureError } from '../errors/infrastructure-error';

type HttpExceptionCtor = new (objectOrError?: string | object, descriptionOrOptions?: string | object) => HttpException;

const HTTP_EXCEPTION_BY_CODE: Record<string, HttpExceptionCtor> = {
    CONFLICT: ConflictException,
    FORBIDDEN: ForbiddenException,
    NOT_FOUND: NotFoundException,
    UNAUTHORIZED: UnauthorizedException,
    VALIDATION_ERROR: BadRequestException
};

type ErrorBody = {
    code: string;
    message: string;
    details?: unknown;
};

function createBody(code: string, message: string, details?: unknown): ErrorBody {
    return {
        code,
        message,
        details
    };
}

export function mapErrorToHttpException(error: unknown): HttpException {
    if (error instanceof HttpException) {
        return error;
    }

    if (error instanceof ValidationError) {
        return new BadRequestException(createBody(error.code, error.message, error.details));
    }

    if (error instanceof DomainError) {
        return new ConflictException(createBody(error.code, error.message, error.details));
    }

    if (error instanceof ApplicationError) {
        const ExceptionCtor = HTTP_EXCEPTION_BY_CODE[error.code] ?? BadRequestException;
        return new ExceptionCtor(createBody(error.code, error.message, error.details));
    }

    if (error instanceof InfrastructureError) {
        return new InternalServerErrorException(
            createBody(error.code, error.message, error.details)
        );
    }

    if (error instanceof Error) {
        return new InternalServerErrorException(
            createBody('INTERNAL_SERVER_ERROR', error.message)
        );
    }

    return new HttpException(
        createBody('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'),
        HttpStatus.INTERNAL_SERVER_ERROR
    );
}
