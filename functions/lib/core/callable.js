"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCallable = makeCallable;
const https_1 = require("firebase-functions/v2/https");
const errors_1 = require("./errors");
const makeRequestId_1 = require("../utils/makeRequestId");
const request_1 = require("./request");
const logger_1 = require("./logger");
function makeCallable(handler) {
    return (0, https_1.onCall)(async (request) => {
        const requestId = (0, makeRequestId_1.makeRequestId)();
        const serverTime = (0, request_1.nowIso)();
        try {
            const data = request.data;
            const result = await handler({ request, data, requestId });
            return {
                ok: true,
                meta: {
                    requestId,
                    serverTime
                },
                data: result
            };
        }
        catch (error) {
            logger_1.logger.error("Callable failed", { requestId, error });
            if (error instanceof errors_1.CommandError) {
                return {
                    ok: false,
                    meta: {
                        requestId,
                        serverTime
                    },
                    error: {
                        code: error.code,
                        message: error.message,
                        fieldErrors: error.fieldErrors
                    }
                };
            }
            return {
                ok: false,
                meta: {
                    requestId,
                    serverTime
                },
                error: {
                    code: "internal",
                    message: "An unexpected error occurred."
                }
            };
        }
    });
}
//# sourceMappingURL=callable.js.map