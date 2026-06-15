"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UuidIdGenerator = void 0;
var node_crypto_1 = require("node:crypto");
var UuidIdGenerator = /** @class */ (function () {
    function UuidIdGenerator() {
    }
    UuidIdGenerator.prototype.generate = function () {
        return (0, node_crypto_1.randomUUID)();
    };
    return UuidIdGenerator;
}());
exports.UuidIdGenerator = UuidIdGenerator;
