"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVendorReceiveHistory = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
exports.getVendorReceiveHistory = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const vendorName = String(request.data.vendorName || "").trim();
    const limit = Number.isFinite(Number(request.data.limit)) && Number(request.data.limit) > 0
        ? Number(request.data.limit)
        : 20;
    if (!workspaceId || !vendorName) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId and vendorName are required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const snap = await (0, firestore_1.transactionsCol)(workspaceId)
        .where("type", "==", "receive")
        .where("vendorName", "==", vendorName)
        .orderBy("postedAt", "desc")
        .limit(limit)
        .get();
    const items = snap.docs.map((doc) => {
        var _a, _b, _c, _d, _e;
        const data = doc.data();
        return {
            transactionId: doc.id,
            locationId: (_a = data.targetLocationId) !== null && _a !== void 0 ? _a : null,
            locationName: (_b = data.targetLocationName) !== null && _b !== void 0 ? _b : null,
            referenceNumber: (_c = data.referenceNumber) !== null && _c !== void 0 ? _c : null,
            note: (_d = data.note) !== null && _d !== void 0 ? _d : null,
            lineCount: (_e = data.lineCount) !== null && _e !== void 0 ? _e : 0,
            postedAtMs: data.postedAt.toMillis(),
        };
    });
    return {
        vendorName,
        items,
    };
});
//# sourceMappingURL=getVendorReceiveHistory.js.map