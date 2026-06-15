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
exports.NotificationOperationsService = void 0;
var shared_kernel_1 = require("@careerhub/shared-kernel");
var notification_not_found_error_1 = require("../errors/notification-not-found.error");
function normalizeRequired(value, message) {
    var normalized = value.trim();
    if (!normalized) {
        throw new shared_kernel_1.ValidationError(message);
    }
    return normalized;
}
function normalizeOptionalJson(value) {
    if (value === undefined) {
        return null;
    }
    var trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
var NotificationOperationsService = /** @class */ (function () {
    function NotificationOperationsService(notificationRepository, idGenerator) {
        this.notificationRepository = notificationRepository;
        this.idGenerator = idGenerator;
    }
    NotificationOperationsService.prototype.createNotification = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.notificationRepository.create({
                        id: this.idGenerator.generate(),
                        identityId: normalizeRequired(input.identityId, 'Notification identity id is required'),
                        message: normalizeRequired(input.message, 'Notification message is required'),
                        metadataJson: normalizeOptionalJson(input.metadataJson),
                        title: normalizeRequired(input.title, 'Notification title is required'),
                        type: normalizeRequired(input.type, 'Notification type is required')
                    })];
            });
        });
    };
    NotificationOperationsService.prototype.listNotifications = function (identityId) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedIdentityId, _a, notifications, unreadCount;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        normalizedIdentityId = normalizeRequired(identityId, 'Notification identity id is required');
                        return [4 /*yield*/, Promise.all([
                                this.notificationRepository.listByIdentityId(normalizedIdentityId),
                                this.notificationRepository.countUnreadByIdentityId(normalizedIdentityId)
                            ])];
                    case 1:
                        _a = _b.sent(), notifications = _a[0], unreadCount = _a[1];
                        return [2 /*return*/, {
                                notifications: notifications,
                                unreadCount: unreadCount
                            }];
                }
            });
        });
    };
    NotificationOperationsService.prototype.getNotification = function (identityId, notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            var notification;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.notificationRepository.findByIdAndIdentityId(normalizeRequired(notificationId, 'Notification id is required'), normalizeRequired(identityId, 'Notification identity id is required'))];
                    case 1:
                        notification = _a.sent();
                        if (!notification) {
                            throw new notification_not_found_error_1.NotificationNotFoundError(notificationId);
                        }
                        return [2 /*return*/, notification];
                }
            });
        });
    };
    NotificationOperationsService.prototype.markNotificationRead = function (identityId, notificationId) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedNotificationId, normalizedIdentityId, existing, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        normalizedNotificationId = normalizeRequired(notificationId, 'Notification id is required');
                        normalizedIdentityId = normalizeRequired(identityId, 'Notification identity id is required');
                        return [4 /*yield*/, this.notificationRepository.findByIdAndIdentityId(normalizedNotificationId, normalizedIdentityId)];
                    case 1:
                        existing = _a.sent();
                        if (!existing) {
                            throw new notification_not_found_error_1.NotificationNotFoundError(normalizedNotificationId);
                        }
                        if (existing.readAt) {
                            return [2 /*return*/, existing];
                        }
                        return [4 /*yield*/, this.notificationRepository.markRead(normalizedNotificationId, normalizedIdentityId, new Date())];
                    case 2:
                        updated = _a.sent();
                        if (!updated) {
                            throw new notification_not_found_error_1.NotificationNotFoundError(normalizedNotificationId);
                        }
                        return [2 /*return*/, updated];
                }
            });
        });
    };
    NotificationOperationsService.prototype.markAllNotificationsRead = function (identityId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.notificationRepository.markAllReadByIdentityId(normalizeRequired(identityId, 'Notification identity id is required'))];
            });
        });
    };
    return NotificationOperationsService;
}());
exports.NotificationOperationsService = NotificationOperationsService;
