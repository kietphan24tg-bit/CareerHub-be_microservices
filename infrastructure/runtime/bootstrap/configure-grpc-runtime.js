"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureGrpcRuntime = configureGrpcRuntime;
const grpc_logging_interceptor_1 = require("../../observability/interceptors/grpc/grpc-logging.interceptor");
const grpc_metrics_interceptor_1 = require("../../observability/interceptors/grpc/grpc-metrics.interceptor");
const grpc_tracing_interceptor_1 = require("../../observability/interceptors/grpc/grpc-tracing.interceptor");
function configureGrpcRuntime(target, foundation) {
    target.useGlobalInterceptors(new grpc_tracing_interceptor_1.GrpcTracingInterceptor(), new grpc_logging_interceptor_1.GrpcLoggingInterceptor(foundation.logger), new grpc_metrics_interceptor_1.GrpcMetricsInterceptor(foundation.metricsRegistry));
}
