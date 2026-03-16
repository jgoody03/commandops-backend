"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moveInventory = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const transactionPostingService_1 = require("../services/transactionPostingService");
const makeRequestId_1 = require("../utils/makeRequestId");
const service = new transactionPostingService_1.TransactionPostingService();
exports.moveInventory = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const sourceLocationId = String(request.data.sourceLocationId || "").trim();
    const targetLocationId = String(request.data.targetLocationId || "").trim();
    const lines = Array.isArray(request.data.lines) ? request.data.lines : [];
    const note = request.data.note ? String(request.data.note) : "";
    if (!workspaceId || !sourceLocationId || !targetLocationId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId, sourceLocationId, and targetLocationId are required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    return service.postMove({
        workspaceId,
        sourceLocationId,
        targetLocationId,
        note,
        lines,
    }, request.auth.uid, (0, makeRequestId_1.makeRequestId)());
});
//# sourceMappingURL=moveInventory.js.map