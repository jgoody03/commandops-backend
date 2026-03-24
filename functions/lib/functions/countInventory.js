"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countInventory = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const transactionPostingService_1 = require("../services/transactionPostingService");
const makeRequestId_1 = require("../utils/makeRequestId");
const service = new transactionPostingService_1.TransactionPostingService();
exports.countInventory = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const locationId = String(request.data.locationId || "").trim();
    const productId = String(request.data.productId || "").trim();
    const countedQuantity = Number(request.data.countedQuantity);
    const note = request.data.note ? String(request.data.note) : "";
    const barcode = request.data.barcode ? String(request.data.barcode) : "";
    if (!workspaceId || !locationId || !productId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId, locationId, and productId are required.");
    }
    if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
        throw new https_1.HttpsError("invalid-argument", "countedQuantity must be a valid number greater than or equal to 0.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    return service.postCount({
        workspaceId,
        locationId,
        productId,
        countedQuantity,
        note,
        barcode,
    }, request.auth.uid, (0, makeRequestId_1.makeRequestId)());
});
//# sourceMappingURL=countInventory.js.map