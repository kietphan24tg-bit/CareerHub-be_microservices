import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

type ValidationPipeOptions = ConstructorParameters<typeof ValidationPipe>[0];

function formatValidationErrors(errors: ValidationError[]): string[] {
    return errors.flatMap((error) => {
        const ownMessages = error.constraints ? Object.values(error.constraints) : [];
        const childMessages = error.children ? formatValidationErrors(error.children) : [];
        return [...ownMessages, ...childMessages];
    });
}

export function createValidationPipe(options?: ValidationPipeOptions): ValidationPipe {
    return new ValidationPipe({
        forbidNonWhitelisted: true,
        stopAtFirstError: false,
        transform: true,
        whitelist: true,
        exceptionFactory: (errors: ValidationError[]) =>
            new BadRequestException({
                code: 'VALIDATION_ERROR',
                details: formatValidationErrors(errors),
                message: 'Request validation failed'
            }),
        ...options
    });
}
