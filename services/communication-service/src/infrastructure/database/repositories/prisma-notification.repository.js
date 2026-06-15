"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaNotificationRepository = void 0;
var PrismaNotificationRepository = /** @class */ (function () {
    function PrismaNotificationRepository(prismaService) {
        this.prismaService = prismaService;
    }
    PrismaNotificationRepository.prototype.mapRecord = function (record) {
        return {
            createdAt: record.createdAt,
            id: record.id,
            identityId: record.identityId,
            message: record.message,
            metadataJson: record.metadataJson,
            readAt: record.readAt,
            title: record.title,
            type: record.type
        };
    };
    PrismaNotificationRepository.prototype.countUnreadByIdentityId = function (identityId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.prismaService.prisma.notification.count({
                        where: {
                            identityId: identityId,
                            readAt: null
                        }
                    })];
            });
        });
    };
    PrismaNotificationRepository.prototype.create = function (notification) {
        return __awaiter(this, void 0, void 0, function () {
            var created;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.prismaService.prisma.notification.create({
                            data: notification
                        })];
                    case 1:
                        created = _a.sent();
                        return [2 /*return*/, this.mapRecord(created)];
                }
            });
        });
    };
    PrismaNotificationRepository.prototype.findByIdAndIdentityId = function (notificationId, identityId) {
        return __awaiter(this, void 0, void 0, function () {
            var record;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.prismaService.prisma.notification.findFirst({
                            where: {
                                id: notificationId,
                                identityId: identityId
                            }
                        })];
                    case 1:
                        record = _a.sent();
                        return [2 /*return*/, record ? this.mapRecord(record) : null];
                }
            });
        });
    };
    PrismaNotificationRepository.prototype.listByIdentityId = function (identityId) {
        return __awaiter(this, void 0, void 0, function () {
            var records;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.prismaService.prisma.notification.findMany({
                            orderBy: {
                                createdAt: 'desc'
                            },
                            where: {
                                identityId: identityId
                            }
                        })];
                    case 1:
                        records = _a.sent();
                        return [2 /*return*/, records.map(function (record) { return _this.mapRecord(record); })];
                }
            });
        });
    };
    PrismaNotificationRepository.prototype.markAllReadByIdentityId = function (identityId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.prismaService.prisma.notification.updateMany({
                            data: {
                                readAt: new Date()
                            },
                            where: {
                                identityId: identityId,
                                readAt: null
                            }
                        })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.count];
                }
            });
        });
    };
    PrismaNotificationRepository.prototype.markRead = function (notificationId, identityId, readAt) {
        return __awaiter(this, void 0, void 0, function () {
            var updated, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.prismaService.prisma.notification.update({
                                data: {
                                    readAt: readAt
                                },
                                where: {
                                    id: notificationId,
                                    identityId: identityId
                                }
                            })];
                    case 1:
                        updated = _b.sent();
                        return [2 /*return*/, this.mapRecord(updated)];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return PrismaNotificationRepository;
}());
exports.PrismaNotificationRepository = PrismaNotificationRepository;
