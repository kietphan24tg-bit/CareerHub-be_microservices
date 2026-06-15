"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrpcLoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const grpc_request_context_1 = require("../../../transport/grpc/grpc-request-context");
const runtime_logger_1 = require("../../logging/runtime-logger");
let GrpcLoggingInterceptor = class GrpcLoggingInterceptor {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    intercept(context, next) {
        if (context.getType() !== 'rpc') {
            return next.handle();
        }
        const startedAt = Date.now();
        const metadata = (0, grpc_request_context_1.getGrpcMetadataFromExecutionContext)(context);
        const requestPayload = context.switchToRpc().getData();
        const requestId = (0, grpc_request_context_1.getRequestIdFromGrpcMetadata)(metadata) ??
            (0, grpc_request_context_1.getRequestIdFromGrpcPayload)(requestPayload);
        const pattern = (0, grpc_request_context_1.getGrpcPatternFromExecutionContext)(context);
        const baseLogContext = {
            context: 'GrpcLoggingInterceptor',
            pattern,
            requestId
        };
        this.logger.logRpcRequestStart(baseLogContext);
        return next.handle().pipe((0, rxjs_1.tap)(() => {
            this.logger.logRpcRequestComplete({
                ...baseLogContext,
                latencyMs: Date.now() - startedAt
            });
        }), (0, rxjs_1.catchError)((error) => {
            this.logger.logRpcRequestError({
                ...baseLogContext,
                error,
                latencyMs: Date.now() - startedAt
            });
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
};
exports.GrpcLoggingInterceptor = GrpcLoggingInterceptor;
exports.GrpcLoggingInterceptor = GrpcLoggingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [runtime_logger_1.RuntimeLogger])
], GrpcLoggingInterceptor);
