"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceiveDetail = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
exports.getReceiveDetail = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const transactionId = String(request.data.transactionId || "").trim();
    if (!workspaceId || !transactionId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId and transactionId are required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const ref = (0, firestore_1.transactionsCol)(workspaceId).doc(transactionId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "Receive transaction not found.");
    }
    const data = snap.data();
    if (data.type !== "receive") {
        throw new https_1.HttpsError("failed-precondition", "Transaction is not a receive.");
    }
    const lineSnap = await ref.collection("lines").get();
    const lines = lineSnap.docs.map((doc) => {
        var _a, _b, _c;
        const line = doc.data();
        return {
            lineId: doc.id,
            productId: line.productId,
            sku: line.sku,
            quantity: line.quantity,
            unitCost: (_a = line.unitCost) !== null && _a !== void 0 ? _a : null,
            barcode: (_b = line.barcode) !== null && _b !== void 0 ? _b : null,
            note: (_c = line.note) !== null && _c !== void 0 ? _c : null,
        };
    });
    return {
        transactionId: snap.id,
        vendorName: (_b = data.vendorName) !== null && _b !== void 0 ? _b : null,
        locationId: (_c = data.targetLocationId) !== null && _c !== void 0 ? _c : null,
        locationName: (_d = data.targetLocationName) !== null && _d !== void 0 ? _d : null,
        referenceNumber: (_e = data.referenceNumber) !== null && _e !== void 0 ? _e : null,
        note: (_f = data.note) !== null && _f !== void 0 ? _f : null,
        lineCount: (_g = data.lineCount) !== null && _g !== void 0 ? _g : lines.length,
        postedAtMs: data.postedAt.toMillis(),
        lines,
    };
});
//# sourceMappingURL=getReceiveDetail.js.map