"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodaySnapshot = void 0;
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
function startOfTodayUtc() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    return firestore_1.Timestamp.fromDate(start);
}
function toRecentActivityItem(id, doc) {
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
exports.getTodaySnapshot = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    const uid = requireAuth((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    const workspaceId = parseRequiredString((_b = request.data) === null || _b === void 0 ? void 0 : _b.workspaceId, "workspaceId");
    await (0, auth_1.assertWorkspaceMembership)(workspaceId, uid);
    const todayStart = startOfTodayUtc();
    const [productSummarySnap, locationSummarySnap, todayActivitySnap, recentSnap] = await Promise.all([
        (0, firestore_2.productInventorySummaryCol)(workspaceId).get(),
        (0, firestore_2.locationInventorySummaryCol)(workspaceId).get(),
        (0, firestore_2.recentActivityCol)(workspaceId)
            .where("createdAt", ">=", todayStart)
            .get(),
        (0, firestore_2.recentActivityCol)(workspaceId)
            .orderBy("createdAt", "desc")
            .limit(10)
            .get(),
    ]);
    let totalUnits = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    for (const doc of productSummarySnap.docs) {
        const item = doc.data();
        totalUnits += (_c = item.totalOnHand) !== null && _c !== void 0 ? _c : 0;
        if (item.stockStatus === "low")
            lowStockProducts += 1;
        if (item.stockStatus === "out")
            outOfStockProducts += 1;
    }
    let receiveCount = 0;
    let moveCount = 0;
    let adjustCount = 0;
    let scanCount = 0;
    let quickCreateCount = 0;
    let saleCount = 0;
    for (const doc of todayActivitySnap.docs) {
        const item = doc.data();
        switch (item.type) {
            case "receive":
                receiveCount += 1;
                break;
            case "move":
                moveCount += 1;
                break;
            case "adjust":
                adjustCount += 1;
                break;
            case "scan":
                scanCount += 1;
                break;
            case "quick_create":
                quickCreateCount += 1;
                break;
            case "sale":
                saleCount += 1;
                break;
        }
    }
    const recentActivity = recentSnap.docs.map((doc) => toRecentActivityItem(doc.id, doc.data()));
    return {
        totals: {
            totalProducts: productSummarySnap.size,
            totalLocations: locationSummarySnap.size,
            totalUnits,
            lowStockProducts,
            outOfStockProducts,
        },
        activity: {
            receiveCount,
            moveCount,
            adjustCount,
            scanCount,
            quickCreateCount,
            saleCount,
            totalCount: todayActivitySnap.size,
        },
        recentActivity,
        generatedAtMs: Date.now(),
    };
});
//# sourceMappingURL=getTodaySnapshot.js.map