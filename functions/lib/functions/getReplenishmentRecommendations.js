"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReplenishmentRecommendations = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
function requireAuth(uid) {
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    return uid;
}
function parseRequiredString(v, f) {
    const s = String(v !== null && v !== void 0 ? v : "").trim();
    if (!s)
        throw new https_1.HttpsError("invalid-argument", `${f} required`);
    return s;
}
function parseLimit(v) {
    if (v == null)
        return 20;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0)
        throw new https_1.HttpsError("invalid-argument", "invalid limit");
    return Math.min(Math.floor(n), 100);
}
function urgency(doc) {
    if (doc.stockStatus === "out")
        return 1000;
    if (doc.stockStatus === "low")
        return 500;
    return 0;
}
exports.getReplenishmentRecommendations = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    const limit = parseLimit((_c = request.data) === null || _c === void 0 ? void 0 : _c.limit);
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    const snap = await (0, firestore_1.productInventorySummaryCol)(workspaceId).get();
    const items = snap.docs
        .map((d) => {
        var _a, _b, _c, _d, _e, _f;
        const doc = d.data();
        return {
            id: d.id,
            workspaceId: doc.workspaceId,
            productId: doc.productId,
            sku: doc.sku,
            name: doc.name,
            primaryBarcode: (_a = doc.primaryBarcode) !== null && _a !== void 0 ? _a : null,
            unit: (_b = doc.unit) !== null && _b !== void 0 ? _b : null,
            totalOnHand: doc.totalOnHand,
            totalAvailable: doc.totalAvailable,
            totalLocations: doc.totalLocations,
            locationsInStock: doc.locationsInStock,
            locationsOutOfStock: doc.locationsOutOfStock,
            locationsLowStock: doc.locationsLowStock,
            isOutOfStockEverywhere: doc.isOutOfStockEverywhere,
            isLowStockAnywhere: doc.isLowStockAnywhere,
            stockStatus: doc.stockStatus,
            lastTransactionAtMs: (_d = (_c = doc.lastTransactionAt) === null || _c === void 0 ? void 0 : _c.toMillis()) !== null && _d !== void 0 ? _d : null,
            updatedAtMs: (_f = (_e = doc.updatedAt) === null || _e === void 0 ? void 0 : _e.toMillis()) !== null && _f !== void 0 ? _f : null,
            urgencyScore: urgency(doc),
        };
    })
        .filter((item) => item.urgencyScore > 0)
        .sort((a, b) => {
        if (b.urgencyScore !== a.urgencyScore)
            return b.urgencyScore - a.urgencyScore;
        return a.totalOnHand - b.totalOnHand;
    })
        .slice(0, limit);
    return {
        items,
        generatedAtMs: Date.now(),
    };
});
//# sourceMappingURL=getReplenishmentRecommendations.js.map