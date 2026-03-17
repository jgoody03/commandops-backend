"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProductInventorySummary = buildProductInventorySummary;
const firestore_1 = require("firebase-admin/firestore");
function buildProductInventorySummary(params) {
    var _a, _b, _c, _d, _e, _f;
    const { workspaceId, product, balances } = params;
    const totalOnHand = balances.reduce((sum, item) => sum + item.onHand, 0);
    const totalAvailable = balances.reduce((sum, item) => sum + item.available, 0);
    const totalLocations = balances.length;
    const locationsInStock = balances.filter((item) => item.onHand > 0).length;
    const locationsOutOfStock = balances.filter((item) => item.onHand <= 0).length;
    const locationsLowStock = balances.filter((item) => item.stockStatus === "low").length;
    const isOutOfStockEverywhere = totalLocations > 0 && locationsInStock === 0;
    const isLowStockAnywhere = locationsLowStock > 0;
    const stockStatus = isOutOfStockEverywhere
        ? "out"
        : isLowStockAnywhere
            ? "low"
            : "ok";
    const lastTransactionAt = (_a = balances
        .map((item) => { var _a; return (_a = item.lastTransactionAt) !== null && _a !== void 0 ? _a : null; })
        .filter((item) => item != null)
        .sort((a, b) => b.toMillis() - a.toMillis())[0]) !== null && _a !== void 0 ? _a : null;
    return {
        workspaceId,
        productId: product.id,
        sku: product.sku,
        skuLower: product.skuLower,
        name: product.name,
        nameLower: product.nameLower,
        primaryBarcode: (_b = product.primaryBarcode) !== null && _b !== void 0 ? _b : null,
        unit: (_c = product.unit) !== null && _c !== void 0 ? _c : null,
        lowStockThreshold: (_d = product.lowStockThreshold) !== null && _d !== void 0 ? _d : null,
        reorderPoint: (_e = product.reorderPoint) !== null && _e !== void 0 ? _e : null,
        reorderQuantity: (_f = product.reorderQuantity) !== null && _f !== void 0 ? _f : null,
        totalOnHand,
        totalAvailable,
        totalLocations,
        locationsInStock,
        locationsOutOfStock,
        locationsLowStock,
        isOutOfStockEverywhere,
        isLowStockAnywhere,
        stockStatus,
        lastTransactionAt,
        updatedAt: firestore_1.Timestamp.now(),
    };
}
//# sourceMappingURL=buildProductInventorySummary.js.map