"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductDetailSnapshot = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
function requireAuth(uid) {
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    return uid;
}
function parseRequiredString(value, field) {
    const v = String(value !== null && value !== void 0 ? value : "").trim();
    if (!v)
        throw new https_1.HttpsError("invalid-argument", `${field} is required.`);
    return v;
}
function parseLimit(value, fallback, max) {
    if (value == null)
        return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0)
        throw new https_1.HttpsError("invalid-argument", "invalid limit");
    return Math.min(Math.floor(n), max);
}
function toSummary(id, doc) {
    var _a, _b, _c, _d, _e, _f;
    return {
        id,
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
    };
}
function toLocationItem(doc) {
    var _a, _b, _c;
    return {
        locationId: doc.locationId,
        locationName: doc.locationName,
        locationCode: (_a = doc.locationCode) !== null && _a !== void 0 ? _a : null,
        onHand: doc.onHand,
        available: doc.available,
        stockStatus: doc.stockStatus,
        lastTransactionAtMs: (_c = (_b = doc.lastTransactionAt) === null || _b === void 0 ? void 0 : _b.toMillis()) !== null && _c !== void 0 ? _c : null,
    };
}
function toActivity(id, doc) {
    var _a, _b, _c, _d, _e, _f;
    return {
        id,
        workspaceId: doc.workspaceId,
        type: doc.type,
        productId: (_a = doc.productId) !== null && _a !== void 0 ? _a : null,
        locationId: (_b = doc.locationId) !== null && _b !== void 0 ? _b : null,
        title: doc.title,
        subtitle: (_c = doc.subtitle) !== null && _c !== void 0 ? _c : null,
        actorUserId: (_d = doc.actorUserId) !== null && _d !== void 0 ? _d : null,
        createdAtMs: (_f = (_e = doc.createdAt) === null || _e === void 0 ? void 0 : _e.toMillis()) !== null && _f !== void 0 ? _f : null,
    };
}
exports.getProductDetailSnapshot = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    const productId = parseRequiredString((_c = request.data) === null || _c === void 0 ? void 0 : _c.productId, "productId");
    const activityLimit = parseLimit((_d = request.data) === null || _d === void 0 ? void 0 : _d.activityLimit, 10, 50);
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    const [summarySnap, balancesSnap, activitySnap] = await Promise.all([
        (0, firestore_1.productInventorySummaryCol)(workspaceId).doc(productId).get(),
        (0, firestore_1.balancesCol)(workspaceId)
            .where("productId", "==", productId)
            .get(),
        (0, firestore_1.recentActivityCol)(workspaceId)
            .where("productId", "==", productId)
            .orderBy("createdAt", "desc")
            .limit(activityLimit)
            .get(),
    ]);
    const summary = summarySnap.exists
        ? toSummary(summarySnap.id, summarySnap.data())
        : null;
    const locations = balancesSnap.docs
        .map((d) => toLocationItem(d.data()))
        .sort((a, b) => b.onHand - a.onHand);
    const recentActivity = activitySnap.docs.map((d) => toActivity(d.id, d.data()));
    return {
        summary,
        locations,
        recentActivity,
        generatedAtMs: Date.now(),
    };
});
//# sourceMappingURL=getProductDetailSnapshot.js.map