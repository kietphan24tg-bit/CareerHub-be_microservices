"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapErrorToHttpException = mapErrorToHttpException;
const common_1 = require("@nestjs/common");
const shared_kernel_1 = require("@careerhub/shared-kernel");
const application_error_1 = require("../../errors/application-error");
const infrastructure_error_1 = require("../../errors/infrastructure-error");
const HTTP_EXCEPTION_BY_CODE = {
    CONFLICT: common_1.ConflictException,
    FORBIDDEN: common_1.ForbiddenException,
    NOT_FOUND: common_1.NotFoundException,
    UNAUTHORIZED: common_1.UnauthorizedException,
    VALIDATION_ERROR: common_1.BadRequestException
};
function createBody(code, message, details) {
    return {
        code,
        message,
        details
    };
}
function mapErrorToHttpException(error) {
    if (error instanceof common_1.HttpException) {
        return error;
    }
    if (error instanceof shared_kernel_1.ValidationError) {
        return new common_1.BadRequestException(createBody(error.code, error.message, error.details));
    }
    if (error instanceof shared_kernel_1.DomainError) {
        return new common_1.ConflictException(createBody(error.code, error.message, error.details));
    }
    if (error instanceof application_error_1.ApplicationError) {
        const ExceptionCtor = HTTP_EXCEPTION_BY_CODE[error.code] ?? common_1.BadRequestException;
        return new ExceptionCtor(createBody(error.code, error.message, error.details));
    }
    if (error instanceof infrastructure_error_1.InfrastructureError) {
        return new common_1.InternalServerErrorException(createBody(error.code, error.message, error.details));
    }
    if (error instanceof Error) {
        return new common_1.InternalServerErrorException(createBody('INTERNAL_SERVER_ERROR', error.message));
    }
    return new common_1.HttpException(createBody('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'), common_1.HttpStatus.INTERNAL_SERVER_ERROR);
}
