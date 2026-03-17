"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocationInventorySummary = buildLocationInventorySummary;
const firestore_1 = require("firebase-admin/firestore");
function buildLocationInventorySummary(params) {
    var _a, _b;
    const { workspaceId, location, balances } = params;
    const totalSkus = balances.length;
    const totalUnits = balances.reduce((sum, item) => sum + item.onHand, 0);
    const totalAvailableUnits = balances.reduce((sum, item) => sum + item.available, 0);
    const lowStockSkuCount = balances.filter((item) => item.stockStatus === "low").length;
    const outOfStockSkuCount = balances.filter((item) => item.stockStatus === "out").length;
    const inStockSkuCount = balances.filter((item) => item.onHand > 0).length;
    const lastTransactionAt = (_a = balances
        .map((item) => { var _a; return (_a = item.lastTransactionAt) !== null && _a !== void 0 ? _a : null; })
        .filter((item) => item != null)
        .sort((a, b) => b.toMillis() - a.toMillis())[0]) !== null && _a !== void 0 ? _a : null;
    return {
        workspaceId,
        locationId: location.id,
        locationName: location.name,
        locationCode: (_b = location.code) !== null && _b !== void 0 ? _b : null,
        totalSkus,
        totalUnits,
        totalAvailableUnits,
        lowStockSkuCount,
        outOfStockSkuCount,
        inStockSkuCount,
        lastTransactionAt,
        updatedAt: firestore_1.Timestamp.now(),
    };
}
//# sourceMappingURL=buildLocationInventorySummary.js.map