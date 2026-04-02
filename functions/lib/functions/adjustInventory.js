"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustInventory = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const transactionPostingService_1 = require("../services/transactionPostingService");
const makeRequestId_1 = require("../utils/makeRequestId");
const service = new transactionPostingService_1.TransactionPostingService();
function normalizeReasonCode(value) {
    const reason = String(value || "").trim();
    return reason || undefined;
}
exports.adjustInventory = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const locationId = String(request.data.locationId || "").trim();
    const rawLines = Array.isArray(request.data.lines)
        ? request.data.lines
        : [];
    if (!workspaceId || !locationId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId and locationId are required.");
    }
    if (!rawLines.length) {
        throw new https_1.HttpsError("invalid-argument", "At least one adjustment line is required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const lines = rawLines.map((line) => ({
        productId: String(line.productId || "").trim(),
        quantityDelta: Number(line.quantityDelta || 0),
        barcode: line.barcode ? String(line.barcode).trim() : undefined,
        reasonCode: normalizeReasonCode(line.reasonCode),
        note: line.note ? String(line.note).trim() : undefined,
    }));
    for (const line of lines) {
        if (!line.productId) {
            throw new https_1.HttpsError("invalid-argument", "Each line must include productId.");
        }
        if (!Number.isFinite(line.quantityDelta) || line.quantityDelta === 0) {
            throw new https_1.HttpsError("invalid-argument", "Each line must include a non-zero quantityDelta.");
        }
    }
    return service.postAdjust({
        workspaceId,
        locationId,
        lines,
    }, request.auth.uid, (0, makeRequestId_1.makeRequestId)());
});
//# sourceMappingURL=adjustInventory.js.map