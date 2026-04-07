"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestPosSale = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const transactionPostingService_1 = require("../services/transactionPostingService");
const makeRequestId_1 = require("../utils/makeRequestId");
const service = new transactionPostingService_1.TransactionPostingService();
exports.ingestPosSale = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const locationId = String(request.data.locationId || "").trim();
    const saleId = request.data.saleId ? String(request.data.saleId).trim() : "";
    const orderNumber = request.data.orderNumber
        ? String(request.data.orderNumber).trim()
        : "";
    const note = request.data.note ? String(request.data.note).trim() : "";
    const tenderTypeValue = request.data.tenderType
        ? String(request.data.tenderType).trim()
        : "";
    const tenderType = (["cash", "card", "other"].includes(tenderTypeValue)
        ? tenderTypeValue
        : undefined);
    const rawLines = Array.isArray(request.data.lines)
        ? request.data.lines
        : [];
    if (!workspaceId || !locationId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId and locationId are required.");
    }
    if (!rawLines.length) {
        throw new https_1.HttpsError("invalid-argument", "At least one sale line is required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const lines = rawLines.map((line) => ({
        productId: String(line.productId || "").trim(),
        quantity: Number(line.quantity || 0),
        barcode: line.barcode ? String(line.barcode).trim() : undefined,
        unitPrice: line.unitPrice === undefined ||
            line.unitPrice === null ||
            line.unitPrice === ""
            ? undefined
            : Number(line.unitPrice),
        note: line.note ? String(line.note).trim() : undefined,
    }));
    for (const line of lines) {
        if (!line.productId) {
            throw new https_1.HttpsError("invalid-argument", "Each sale line must include productId.");
        }
        if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
            throw new https_1.HttpsError("invalid-argument", "Each sale line must include a quantity greater than zero.");
        }
        if (line.unitPrice !== undefined &&
            (!Number.isFinite(line.unitPrice) || line.unitPrice < 0)) {
            throw new https_1.HttpsError("invalid-argument", "unitPrice must be a valid number greater than or equal to 0.");
        }
    }
    return service.postSale({
        workspaceId,
        locationId,
        saleId: saleId || undefined,
        orderNumber: orderNumber || undefined,
        tenderType,
        note: note || undefined,
        lines,
    }, request.auth.uid, (0, makeRequestId_1.makeRequestId)());
});
//# sourceMappingURL=ingestPosSale.js.map