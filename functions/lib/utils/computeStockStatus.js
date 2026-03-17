"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeStockStatus = computeStockStatus;
function computeStockStatus(onHand, lowStockThreshold) {
    const hasStock = onHand > 0;
    const isOutOfStock = onHand <= 0;
    const isLowStock = !isOutOfStock &&
        lowStockThreshold != null &&
        onHand <= lowStockThreshold;
    const stockStatus = isOutOfStock
        ? "out"
        : isLowStock
            ? "low"
            : "ok";
    return {
        hasStock,
        isOutOfStock,
        isLowStock,
        stockStatus,
    };
}
//# sourceMappingURL=computeStockStatus.js.map