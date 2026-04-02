"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceiveHistory = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
exports.getReceiveHistory = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const workspaceId = String(request.data.workspaceId || "").trim();
    const limit = Number.isFinite(Number(request.data.limit)) && Number(request.data.limit) > 0
        ? Number(request.data.limit)
        : 20;
    if (!workspaceId) {
        throw new https_1.HttpsError("invalid-argument", "workspaceId is required.");
    }
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, request.auth.uid);
    const snap = await (0, firestore_1.transactionsCol)(workspaceId)
        .where("type", "==", "receive")
        .orderBy("postedAt", "desc")
        .limit(limit)
        .get();
    const items = snap.docs.map((doc) => {
        var _a, _b, _c, _d, _e, _f;
        const data = doc.data();
        return {
            transactionId: doc.id,
            vendorName: (_a = data.vendorName) !== null && _a !== void 0 ? _a : null,
            locationId: (_b = data.targetLocationId) !== null && _b !== void 0 ? _b : null,
            locationName: (_c = data.targetLocationName) !== null && _c !== void 0 ? _c : null,
            referenceNumber: (_d = data.referenceNumber) !== null && _d !== void 0 ? _d : null,
            note: (_e = data.note) !== null && _e !== void 0 ? _e : null,
            lineCount: (_f = data.lineCount) !== null && _f !== void 0 ? _f : 0,
            postedAtMs: data.postedAt.toMillis(),
        };
    });
    return { items };
});
//# sourceMappingURL=getReceiveHistory.js.map