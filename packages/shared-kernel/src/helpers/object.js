"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertPropsToObject = convertPropsToObject;
function isPlainObject(value) {
    return typeof value === 'object' && value !== null;
}
function convertPropsToObject(value) {
    if (Array.isArray(value)) {
        return value.map((item) => convertPropsToObject(item));
    }
    if (isPlainObject(value)) {
        const obj = value;
        if (typeof obj.toObject === 'function') {
            return obj.toObject();
        }
        const result = Object.entries(obj).reduce((acc, [key, nestedValue]) => {
            acc[key] = convertPropsToObject(nestedValue);
            return acc;
        }, {});
        return result;
    }
    return value;
}
