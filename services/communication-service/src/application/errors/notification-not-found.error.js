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
exports.NotificationNotFoundError = void 0;
var infrastructure_1 = require("@careerhub/infrastructure");
var NotificationNotFoundError = /** @class */ (function (_super) {
    __extends(NotificationNotFoundError, _super);
    function NotificationNotFoundError(notificationId) {
        return _super.call(this, notificationId
            ? "Notification not found: ".concat(notificationId)
            : 'Notification not found.', {
            code: 'NOTIFICATION_NOT_FOUND'
        }) || this;
    }
    return NotificationNotFoundError;
}(infrastructure_1.ApplicationError));
exports.NotificationNotFoundError = NotificationNotFoundError;
