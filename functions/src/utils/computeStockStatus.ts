import { StockStatus } from "../contracts/inventory";

export function computeStockStatus(
  onHand: number,
  lowStockThreshold?: number | null
): {
  isOutOfStock: boolean;
  isLowStock: boolean;
  stockStatus: StockStatus;
  hasStock: boolean;
} {
  const hasStock = onHand > 0;
  const isOutOfStock = onHand <= 0;
  const isLowStock =
    !isOutOfStock &&
    lowStockThreshold != null &&
    onHand <= lowStockThreshold;

  const stockStatus: StockStatus = isOutOfStock
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