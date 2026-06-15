"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationPrismaService = void 0;
exports.createCommunicationPrismaClient = createCommunicationPrismaClient;
var infrastructure_1 = require("@careerhub/infrastructure");
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var CommunicationPrismaService = /** @class */ (function (_super) {
    __extends(CommunicationPrismaService, _super);
    function CommunicationPrismaService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return CommunicationPrismaService;
}(infrastructure_1.PrismaLifecycleService));
exports.CommunicationPrismaService = CommunicationPrismaService;
function resolveGeneratedPrismaModulePath() {
    var distRelativePath = (0, node_path_1.join)(__dirname, '..', '..', '..', 'generated', 'prisma');
    if ((0, node_fs_1.existsSync)(distRelativePath)) {
        return distRelativePath;
    }
    return (0, node_path_1.join)(__dirname, '..', '..', '..', '..', '..', '..', '..', 'src', 'generated', 'prisma');
}
function createCommunicationPrismaClient(config) {
    try {
        var PrismaPg = require('@prisma/adapter-pg').PrismaPg;
        var PrismaClient = require(resolveGeneratedPrismaModulePath()).PrismaClient;
        var adapter = new PrismaPg({
            connectionString: config.databaseUrl
        });
        return new PrismaClient({
            adapter: adapter
        });
    }
    catch (error) {
        throw new infrastructure_1.InfrastructureError('Communication Prisma client is unavailable. Run prisma generate for communication-service.', {
            cause: error instanceof Error ? error : undefined,
            code: 'COMMUNICATION_PRISMA_CLIENT_UNAVAILABLE'
        });
    }
}
