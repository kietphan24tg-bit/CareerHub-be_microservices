"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommunicationRuntimeConfig = getCommunicationRuntimeConfig;
function getCommunicationRuntimeConfig(configService) {
    return {
        grpcCommunicationUrl: configService.getOrThrow('GRPC_COMMUNICATION_URL')
    };
}
