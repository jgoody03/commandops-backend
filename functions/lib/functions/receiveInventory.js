"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveInventory = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const transactionPostingService_1 = require("../services/transactionPostingService");
const makeRequestId_1 = require("../utils/makeRequestId");
const service = new transactionPostingService_1.TransactionPostingService();
exports.receiveInventory = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const locationId = String(request.data.locationId || "").trim();
    const vendorName = request.data.vendorName
        ? String(request.data.vendorName).trim()
        : "";
    const referenceNumber = request.data.referenceNumber
        ? String(request.data.referenceNumber).trim()
        : "";
    const lines = Array.isArray(request.data.lines) ? request.data.lines : [];
    const note = request.data.note ? String(request.data.note).trim() : "";
    if (!workspaceId || !locationId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId and locationId are required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    console.log("receiveInventory request", {
        workspaceId,
        locationId,
        vendorName,
        referenceNumber,
        lines,
        note,
    });
    try {
        return await service.postReceive({
            workspaceId,
            locationId,
            vendorName: vendorName || undefined,
            referenceNumber: referenceNumber || undefined,
            note: note || undefined,
            lines,
        }, request.auth.uid, (0, makeRequestId_1.makeRequestId)());
    }
    catch (error) {
        console.error("receiveInventory failed", error);
        throw new https_1.HttpsError("internal", error instanceof Error ? error.message : "Receive inventory failed.");
    }
});
//# sourceMappingURL=receiveInventory.js.map