"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildInventoryBalance = buildInventoryBalance;
const firestore_1 = require("firebase-admin/firestore");
const computeStockStatus_1 = require("../utils/computeStockStatus");
function buildInventoryBalance(params) {
    var _a, _b, _c, _d, _e, _f, _g;
    const { existing, workspaceId, location, product, onHand, available, transactionAt, } = params;
    const lowStockThreshold = (_a = product.lowStockThreshold) !== null && _a !== void 0 ? _a : null;
    const reorderPoint = (_b = product.reorderPoint) !== null && _b !== void 0 ? _b : null;
    const reorderQuantity = (_c = product.reorderQuantity) !== null && _c !== void 0 ? _c : null;
    const { hasStock, isOutOfStock, isLowStock, stockStatus } = (0, computeStockStatus_1.computeStockStatus)(onHand, lowStockThreshold);
    return {
        workspaceId,
        locationId: location.id,
        productId: product.id,
        onHand,
        available,
        hasStock,
        sku: product.sku,
        skuLower: product.skuLower,
        name: product.name,
        nameLower: product.nameLower,
        primaryBarcode: (_d = product.primaryBarcode) !== null && _d !== void 0 ? _d : null,
        unit: (_e = product.unit) !== null && _e !== void 0 ? _e : null,
        locationName: location.name,
        locationCode: (_f = location.code) !== null && _f !== void 0 ? _f : null,
        lowStockThreshold,
        reorderPoint,
        reorderQuantity,
        isOutOfStock,
        isLowStock,
        stockStatus,
        lastTransactionAt: (_g = transactionAt !== null && transactionAt !== void 0 ? transactionAt : existing === null || existing === void 0 ? void 0 : existing.lastTransactionAt) !== null && _g !== void 0 ? _g : null,
        updatedAt: firestore_1.Timestamp.now(),
    };
}
//# sourceMappingURL=buildInventoryBalance.js.map