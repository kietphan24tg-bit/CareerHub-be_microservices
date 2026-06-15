"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var strict_1 = require("node:assert/strict");
var node_test_1 = require("node:test");
var shared_kernel_1 = require("@careerhub/shared-kernel");
var notification_not_found_error_1 = require("../errors/notification-not-found.error");
var notification_operations_service_1 = require("./notification-operations.service");
function makeNotification(overrides) {
    if (overrides === void 0) { overrides = {}; }
    return __assign({ createdAt: new Date('2026-06-12T00:00:00.000Z'), id: 'notification-1', identityId: 'identity-1', message: 'A candidate applied to your job posting.', metadataJson: '{"applicationId":"application-1"}', readAt: null, title: 'New application received', type: 'application_received' }, overrides);
}
function createRepository(seed) {
    if (seed === void 0) { seed = [makeNotification()]; }
    var records = __spreadArray([], seed, true);
    return {
        countUnreadByIdentityId: function (identityId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, records.filter(function (record) { return record.identityId === identityId && record.readAt === null; }).length];
                });
            });
        },
        create: function (notification) {
            return __awaiter(this, void 0, void 0, function () {
                var created;
                return __generator(this, function (_a) {
                    created = makeNotification({
                        createdAt: new Date('2026-06-12T01:00:00.000Z'),
                        id: notification.id,
                        identityId: notification.identityId,
                        message: notification.message,
                        metadataJson: notification.metadataJson,
                        readAt: null,
                        title: notification.title,
                        type: notification.type
                    });
                    records.push(created);
                    return [2 /*return*/, created];
                });
            });
        },
        findByIdAndIdentityId: function (notificationId, identityId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    return [2 /*return*/, ((_a = records.find(function (record) { return record.id === notificationId && record.identityId === identityId; })) !== null && _a !== void 0 ? _a : null)];
                });
            });
        },
        listByIdentityId: function (identityId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, records.filter(function (record) { return record.identityId === identityId; })];
                });
            });
        },
        markAllReadByIdentityId: function (identityId) {
            return __awaiter(this, void 0, void 0, function () {
                var updatedCount, _i, records_1, record;
                return __generator(this, function (_a) {
                    updatedCount = 0;
                    for (_i = 0, records_1 = records; _i < records_1.length; _i++) {
                        record = records_1[_i];
                        if (record.identityId === identityId && record.readAt === null) {
                            record.readAt = new Date('2026-06-12T02:00:00.000Z');
                            updatedCount += 1;
                        }
                    }
                    return [2 /*return*/, updatedCount];
                });
            });
        },
        markRead: function (notificationId, identityId, readAt) {
            return __awaiter(this, void 0, void 0, function () {
                var record;
                return __generator(this, function (_a) {
                    record = records.find(function (item) { return item.id === notificationId && item.identityId === identityId; });
                    if (!record) {
                        return [2 /*return*/, null];
                    }
                    record.readAt = readAt;
                    return [2 /*return*/, record];
                });
            });
        }
    };
}
function createService(seed) {
    return new notification_operations_service_1.NotificationOperationsService(createRepository(seed), {
        generate: function () {
            return 'notification-created';
        }
    });
}
(0, node_test_1.default)('listNotifications returns notifications and unreadCount', function () { return __awaiter(void 0, void 0, void 0, function () {
    var service, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                service = createService([
                    makeNotification(),
                    makeNotification({
                        id: 'notification-2',
                        readAt: new Date('2026-06-12T01:00:00.000Z')
                    })
                ]);
                return [4 /*yield*/, service.listNotifications('identity-1')];
            case 1:
                result = _a.sent();
                strict_1.default.equal(result.notifications.length, 2);
                strict_1.default.equal(result.unreadCount, 1);
                return [2 /*return*/];
        }
    });
}); });
(0, node_test_1.default)('getNotification enforces ownership by identity id', function () { return __awaiter(void 0, void 0, void 0, function () {
    var service, notification;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                service = createService();
                return [4 /*yield*/, service.getNotification('identity-1', 'notification-1')];
            case 1:
                notification = _a.sent();
                strict_1.default.equal(notification.id, 'notification-1');
                return [4 /*yield*/, strict_1.default.rejects(function () { return service.getNotification('identity-2', 'notification-1'); }, notification_not_found_error_1.NotificationNotFoundError)];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, node_test_1.default)('markNotificationRead marks unread notification and is idempotent when already read', function () { return __awaiter(void 0, void 0, void 0, function () {
    var service, marked, markedAgain;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                service = createService();
                return [4 /*yield*/, service.markNotificationRead('identity-1', 'notification-1')];
            case 1:
                marked = _a.sent();
                strict_1.default.ok(marked.readAt);
                return [4 /*yield*/, service.markNotificationRead('identity-1', 'notification-1')];
            case 2:
                markedAgain = _a.sent();
                strict_1.default.equal(markedAgain.id, 'notification-1');
                return [2 /*return*/];
        }
    });
}); });
(0, node_test_1.default)('markAllNotificationsRead returns updated count', function () { return __awaiter(void 0, void 0, void 0, function () {
    var service, updatedCount;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                service = createService([
                    makeNotification(),
                    makeNotification({ id: 'notification-2' })
                ]);
                return [4 /*yield*/, service.markAllNotificationsRead('identity-1')];
            case 1:
                updatedCount = _a.sent();
                strict_1.default.equal(updatedCount, 2);
                return [2 /*return*/];
        }
    });
}); });
(0, node_test_1.default)('createNotification validates required fields', function () { return __awaiter(void 0, void 0, void 0, function () {
    var service, created;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                service = createService([]);
                return [4 /*yield*/, strict_1.default.rejects(function () {
                        return service.createNotification({
                            identityId: ' ',
                            message: 'Message',
                            title: 'Title',
                            type: 'application_received'
                        });
                    }, shared_kernel_1.ValidationError)];
            case 1:
                _a.sent();
                return [4 /*yield*/, service.createNotification({
                        identityId: 'identity-1',
                        message: 'Message body',
                        metadataJson: '{"applicationId":"application-1"}',
                        title: 'Title',
                        type: 'application_received'
                    })];
            case 2:
                created = _a.sent();
                strict_1.default.equal(created.id, 'notification-created');
                strict_1.default.equal(created.identityId, 'identity-1');
                return [2 /*return*/];
        }
    });
}); });
