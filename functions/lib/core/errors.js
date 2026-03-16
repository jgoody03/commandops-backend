"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandError = void 0;
exports.invalidArgument = invalidArgument;
exports.unauthenticated = unauthenticated;
exports.permissionDenied = permissionDenied;
exports.notFound = notFound;
exports.failedPrecondition = failedPrecondition;
exports.alreadyExists = alreadyExists;
const https_1 = require("firebase-functions/v2/https");
class CommandError extends Error {
    constructor(params) {
        super(params.message);
        this.code = params.code;
        this.httpCode = params.httpCode;
        this.fieldErrors = params.fieldErrors;
    }
    toHttpsError() {
        return new https_1.HttpsError(this.httpCode, this.message, {
            code: this.code,
            fieldErrors: this.fieldErrors
        });
    }
}
exports.CommandError = CommandError;
function invalidArgument(code, message, fieldErrors) {
    throw new CommandError({
        code,
        message,
        httpCode: "invalid-argument",
        fieldErrors
    });
}
function unauthenticated(code, message) {
    throw new CommandError({
        code,
        message,
        httpCode: "unauthenticated"
    });
}
function permissionDenied(code, message) {
    throw new CommandError({
        code,
        message,
        httpCode: "permission-denied"
    });
}
function notFound(code, message) {
    throw new CommandError({
        code,
        message,
        httpCode: "not-found"
    });
}
function failedPrecondition(code, message) {
    throw new CommandError({
        code,
        message,
        httpCode: "failed-precondition"
    });
}
function alreadyExists(code, message) {
    throw new CommandError({
        code,
        message,
        httpCode: "already-exists"
    });
}
//# sourceMappingURL=errors.js.map