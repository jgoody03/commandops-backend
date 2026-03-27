"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReplenishmentRecommendations = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../core/auth");
const firestore_1 = require("../core/firestore");
function requireAuth(uid) {
    if (!uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    return uid;
}
function parseRequiredString(v, f) {
    const s = String(v !== null && v !== void 0 ? v : "").trim();
    if (!s) {
        throw new https_1.HttpsError("invalid-argument", `${f} required`);
    }
    return s;
}
function parseLimit(v) {
    if (v == null)
        return 20;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
        throw new https_1.HttpsError("invalid-argument", "invalid limit");
    }
    return Math.min(Math.floor(n), 100);
}
function buildReasonCodes(doc) {
    const reasons = [];
    if (doc.isOutOfStockEverywhere || doc.totalAvailable <= 0) {
        reasons.push("OUT_OF_STOCK_EVERYWHERE");
    }
    else if (doc.locationsOutOfStock > 0) {
        reasons.push("OUT_OF_STOCK_SOME_LOCATIONS");
    }
    if (doc.locationsLowStock > 1) {
        reasons.push("LOW_STOCK_MULTIPLE_LOCATIONS");
    }
    else if (doc.locationsLowStock > 0 || doc.isLowStockAnywhere) {
        reasons.push("LOW_STOCK_SOME_LOCATIONS");
    }
    if (doc.totalAvailable > 0 && doc.totalAvailable <= Math.max(1, doc.totalLocations)) {
        reasons.push("NETWORK_STOCK_LOW");
    }
    return reasons;
}
function buildUrgencyScore(doc) {
    let score = 0;
    if (doc.stockStatus === "out") {
        score += 100;
    }
    else if (doc.stockStatus === "low") {
        score += 60;
    }
    score += doc.locationsOutOfStock * 20;
    score += doc.locationsLowStock * 10;
    if (doc.totalAvailable <= 0) {
        score += 40;
    }
    else if (doc.totalAvailable <= Math.max(1, doc.totalLocations)) {
        score += 20;
    }
    if (doc.isOutOfStockEverywhere) {
        score += 25;
    }
    return score;
}
function buildUrgencyLabel(score) {
    if (score >= 120)
        return "critical";
    if (score >= 80)
        return "high";
    return "medium";
}
function buildRecommendedAction(doc) {
    if (doc.totalAvailable <= 0 || doc.isOutOfStockEverywhere) {
        return "receive";
    }
    if (doc.locationsOutOfStock > 0 && doc.locationsInStock > 0) {
        return "move";
    }
    if (doc.stockStatus === "low") {
        return "receive";
    }
    return "review";
}
function buildSuggestedQuantity(doc) {
    if (doc.totalAvailable <= 0 || doc.isOutOfStockEverywhere) {
        return Math.max(1, doc.locationsOutOfStock * 2, doc.locationsLowStock);
    }
    if (doc.stockStatus === "low") {
        return Math.max(1, doc.locationsLowStock);
    }
    if (doc.locationsOutOfStock > 0 && doc.locationsInStock > 0) {
        return 1;
    }
    return null;
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
        const urgencyScore = buildUrgencyScore(doc);
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
            urgencyScore,
            urgencyLabel: buildUrgencyLabel(urgencyScore),
            recommendedAction: buildRecommendedAction(doc),
            suggestedQuantity: buildSuggestedQuantity(doc),
            reasonCodes: buildReasonCodes(doc),
        };
    })
        .filter((item) => item.urgencyScore > 0)
        .sort((a, b) => {
        if (b.urgencyScore !== a.urgencyScore) {
            return b.urgencyScore - a.urgencyScore;
        }
        if (a.recommendedAction !== b.recommendedAction) {
            const rank = { receive: 0, move: 1, review: 2 };
            return rank[a.recommendedAction] - rank[b.recommendedAction];
        }
        return a.totalOnHand - b.totalOnHand;
    })
        .slice(0, limit);
    return {
        items,
        generatedAtMs: Date.now(),
    };
});
//# sourceMappingURL=getReplenishmentRecommendations.js.map