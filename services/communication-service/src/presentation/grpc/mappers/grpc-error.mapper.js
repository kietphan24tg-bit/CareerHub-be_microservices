"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapErrorToCommunicationGrpcException = mapErrorToCommunicationGrpcException;
var infrastructure_1 = require("@careerhub/infrastructure");
function mapErrorToCommunicationGrpcException(error) {
    return (0, infrastructure_1.mapErrorToRpcException)(error);
}
