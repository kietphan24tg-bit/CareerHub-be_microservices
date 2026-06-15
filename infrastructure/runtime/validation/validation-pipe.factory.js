"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidationPipe = createValidationPipe;
const common_1 = require("@nestjs/common");
function formatValidationErrors(errors) {
    return errors.flatMap((error) => {
        const ownMessages = error.constraints ? Object.values(error.constraints) : [];
        const childMessages = error.children ? formatValidationErrors(error.children) : [];
        return [...ownMessages, ...childMessages];
    });
}
function createValidationPipe(options) {
    return new common_1.ValidationPipe({
        forbidNonWhitelisted: true,
        stopAtFirstError: false,
        transform: true,
        whitelist: true,
        exceptionFactory: (errors) => new common_1.BadRequestException({
            code: 'VALIDATION_ERROR',
            details: formatValidationErrors(errors),
            message: 'Request validation failed'
        }),
        ...options
    });
}
