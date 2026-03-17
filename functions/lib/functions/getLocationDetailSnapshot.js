"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocationDetailSnapshot = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_2 = require("../core/firestore");
function requireAuth(uid) {
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    return uid;
}
function parseRequiredString(value, fieldName) {
    const parsed = String(value !== null && value !== void 0 ? value : "").trim();
    if (!parsed) {
        throw new https_1.HttpsError("invalid-argument", `${fieldName} is required.`);
    }
    return parsed;
}
function parseLimit(value, fallback, max) {
    if (value == null)
        return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new https_1.HttpsError("invalid-argument", "limit must be a valid number.");
    }
    const normalized = Math.floor(parsed);
    if (normalized <= 0) {
        throw new https_1.HttpsError("invalid-argument", "limit must be greater than 0.");
    }
    return Math.min(normalized, max);
}
function toLocationSummaryItem(id, doc) {
    var _a, _b, _c, _d, _e;
    return {
        id,
        workspaceId: doc.workspaceId,
        locationId: doc.locationId,
        locationName: doc.locationName,
        locationCode: (_a = doc.locationCode) !== null && _a !== void 0 ? _a : null,
        totalSkus: doc.totalSkus,
        totalUnits: doc.totalUnits,
        totalAvailableUnits: doc.totalAvailableUnits,
        lowStockSkuCount: doc.lowStockSkuCount,
        outOfStockSkuCount: doc.outOfStockSkuCount,
        inStockSkuCount: doc.inStockSkuCount,
        lastTransactionAtMs: (_c = (_b = doc.lastTransactionAt) === null || _b === void 0 ? void 0 : _b.toMillis()) !== null && _c !== void 0 ? _c : null,
        updatedAtMs: (_e = (_d = doc.updatedAt) === null || _d === void 0 ? void 0 : _d.toMillis()) !== null && _e !== void 0 ? _e : null,
    };
}
function toInventoryItem(id, doc) {
    var _a, _b, _c, _d, _e, _f;
    return {
        id,
        workspaceId: doc.workspaceId,
        locationId: doc.locationId,
        productId: doc.productId,
        sku: doc.sku,
        name: doc.name,
        primaryBarcode: (_a = doc.primaryBarcode) !== null && _a !== void 0 ? _a : null,
        unit: (_b = doc.unit) !== null && _b !== void 0 ? _b : null,
        onHand: doc.onHand,
        available: doc.available,
        isOutOfStock: doc.isOutOfStock,
        isLowStock: doc.isLowStock,
        stockStatus: doc.stockStatus,
        lastTransactionAtMs: (_d = (_c = doc.lastTransactionAt) === null || _c === void 0 ? void 0 : _c.toMillis()) !== null && _d !== void 0 ? _d : null,
        updatedAtMs: (_f = (_e = doc.updatedAt) === null || _e === void 0 ? void 0 : _e.toMillis()) !== null && _f !== void 0 ? _f : null,
    };
}
function toActivityItem(id, doc) {
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
exports.getLocationDetailSnapshot = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c, _d, _e;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    const locationId = parseRequiredString((_c = request.data) === null || _c === void 0 ? void 0 : _c.locationId, "locationId");
    const inventoryLimit = parseLimit((_d = request.data) === null || _d === void 0 ? void 0 : _d.inventoryLimit, 10, 50);
    const activityLimit = parseLimit((_e = request.data) === null || _e === void 0 ? void 0 : _e.activityLimit, 10, 50);
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    const [summarySnap, balancesSnap, activitySnap] = await Promise.all([
        (0, firestore_2.locationInventorySummaryCol)(workspaceId).doc(locationId).get(),
        (0, firestore_2.balancesCol)(workspaceId)
            .where("locationId", "==", locationId)
            .orderBy("updatedAt", "desc")
            .orderBy(firestore_1.FieldPath.documentId(), "desc")
            .limit(100)
            .get(),
        (0, firestore_2.recentActivityCol)(workspaceId)
            .where("locationId", "==", locationId)
            .orderBy("createdAt", "desc")
            .orderBy(firestore_1.FieldPath.documentId(), "desc")
            .limit(activityLimit)
            .get(),
    ]);
    const summary = summarySnap.exists
        ? toLocationSummaryItem(summarySnap.id, summarySnap.data())
        : null;
    const inventoryItems = balancesSnap.docs.map((doc) => toInventoryItem(doc.id, doc.data()));
    const lowStockItems = inventoryItems
        .filter((item) => item.stockStatus === "low")
        .sort((a, b) => a.onHand - b.onHand)
        .slice(0, inventoryLimit);
    const outOfStockItems = inventoryItems
        .filter((item) => item.stockStatus === "out")
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, inventoryLimit);
    const topItems = [...inventoryItems]
        .sort((a, b) => {
        if (b.onHand !== a.onHand)
            return b.onHand - a.onHand;
        return a.name.localeCompare(b.name);
    })
        .slice(0, inventoryLimit);
    const recentActivity = activitySnap.docs.map((doc) => toActivityItem(doc.id, doc.data()));
    return {
        summary,
        lowStockItems,
        outOfStockItems,
        topItems,
        recentActivity,
        generatedAtMs: Date.now(),
    };
});
//# sourceMappingURL=getLocationDetailSnapshot.js.map