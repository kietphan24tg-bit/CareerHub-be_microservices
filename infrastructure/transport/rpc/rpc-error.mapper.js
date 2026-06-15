"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapErrorToRpcException = mapErrorToRpcException;
const microservices_1 = require("@nestjs/microservices");
const shared_kernel_1 = require("@careerhub/shared-kernel");
const application_error_1 = require("../../errors/application-error");
const infrastructure_error_1 = require("../../errors/infrastructure-error");
function createPayload(code, message, details) {
    return {
        code,
        details,
        message
    };
}
function mapErrorToRpcException(error) {
    if (error instanceof shared_kernel_1.ValidationError) {
        return new microservices_1.RpcException(createPayload(error.code, error.message, error.details));
    }
    if (error instanceof shared_kernel_1.DomainError) {
        return new microservices_1.RpcException(createPayload(error.code, error.message, error.details));
    }
    if (error instanceof application_error_1.ApplicationError) {
        return new microservices_1.RpcException(createPayload(error.code, error.message, error.details));
    }
    if (error instanceof infrastructure_error_1.InfrastructureError) {
        return new microservices_1.RpcException(createPayload(error.code, error.message, error.details));
    }
    if (error instanceof Error) {
        return new microservices_1.RpcException(createPayload('INTERNAL_SERVER_ERROR', error.message));
    }
    return new microservices_1.RpcException(createPayload('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'));
}
