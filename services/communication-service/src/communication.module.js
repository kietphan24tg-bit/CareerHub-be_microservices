"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationModule = void 0;
var infrastructure_1 = require("@careerhub/infrastructure");
var common_1 = require("@nestjs/common");
var application_1 = require("./application");
var config_1 = require("./config");
var infrastructure_2 = require("./infrastructure");
var uuid_id_generator_1 = require("./infrastructure/id/uuid-id-generator");
var presentation_1 = require("./presentation");
var CommunicationModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            controllers: [presentation_1.CommunicationGrpcController],
            imports: [
                (0, infrastructure_1.createRuntimeConfigModule)({
                    validate: config_1.validateCommunicationEnvironment
                }),
                (0, infrastructure_1.createPrismaModule)({
                    clientToken: infrastructure_2.COMMUNICATION_PRISMA_TOKENS.client,
                    createClient: infrastructure_2.createCommunicationPrismaClient,
                    createService: function (client) { return new infrastructure_2.CommunicationPrismaService(client); },
                    readinessCheckName: 'communication-prisma',
                    readinessCheckToken: infrastructure_2.COMMUNICATION_PRISMA_TOKENS.readinessCheck,
                    serviceToken: infrastructure_2.COMMUNICATION_PRISMA_TOKENS.service
                })
            ],
            providers: [
                {
                    provide: application_1.COMMUNICATION_PORT_TOKENS.notificationRepository,
                    inject: [infrastructure_2.COMMUNICATION_PRISMA_TOKENS.service],
                    useFactory: function (prismaService) {
                        return new infrastructure_2.PrismaNotificationRepository(prismaService);
                    }
                },
                {
                    provide: application_1.COMMUNICATION_PORT_TOKENS.idGenerator,
                    useClass: uuid_id_generator_1.UuidIdGenerator
                },
                {
                    provide: application_1.NotificationOperationsService,
                    inject: [
                        application_1.COMMUNICATION_PORT_TOKENS.notificationRepository,
                        application_1.COMMUNICATION_PORT_TOKENS.idGenerator
                    ],
                    useFactory: function (notificationRepository, idGenerator) {
                        return new application_1.NotificationOperationsService(notificationRepository, idGenerator);
                    }
                }
            ]
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var CommunicationModule = _classThis = /** @class */ (function () {
        function CommunicationModule_1() {
        }
        return CommunicationModule_1;
    }());
    __setFunctionName(_classThis, "CommunicationModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        CommunicationModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return CommunicationModule = _classThis;
}();
exports.CommunicationModule = CommunicationModule;
