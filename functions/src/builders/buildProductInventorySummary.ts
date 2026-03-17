import { Timestamp } from "firebase-admin/firestore";
import { ProductInventorySummaryDoc } from "../contracts/inventorySummaries";
import { InventoryBalanceDoc, StockStatus } from "../contracts/inventory";
import { ProductDoc } from "../contracts/products";

type ProductWithId = ProductDoc & { id: string };

export function buildProductInventorySummary(params: {
  workspaceId: string;
  product: ProductWithId;
  balances: InventoryBalanceDoc[];
}): ProductInventorySummaryDoc {
  const { workspaceId, product, balances } = params;

  const totalOnHand = balances.reduce((sum, item) => sum + item.onHand, 0);
  const totalAvailable = balances.reduce((sum, item) => sum + item.available, 0);

  const totalLocations = balances.length;
  const locationsInStock = balances.filter((item) => item.onHand > 0).length;
  const locationsOutOfStock = balances.filter((item) => item.onHand <= 0).length;
  const locationsLowStock = balances.filter((item) => item.stockStatus === "low").length;

  const isOutOfStockEverywhere = totalLocations > 0 && locationsInStock === 0;
  const isLowStockAnywhere = locationsLowStock > 0;

  const stockStatus: StockStatus =
    isOutOfStockEverywhere
      ? "out"
      : isLowStockAnywhere
      ? "low"
      : "ok";

  const lastTransactionAt = balances
    .map((item) => item.lastTransactionAt ?? null)
    .filter((item): item is Timestamp => item != null)
    .sort((a, b) => b.toMillis() - a.toMillis())[0] ?? null;

  return {
    workspaceId,
    productId: product.id,

    sku: product.sku,
    skuLower: product.skuLower,
    name: product.name,
    nameLower: product.nameLower,
    primaryBarcode: product.primaryBarcode ?? null,
    unit: product.unit ?? null,

    lowStockThreshold: product.lowStockThreshold ?? null,
    reorderPoint: product.reorderPoint ?? null,
    reorderQuantity: product.reorderQuantity ?? null,

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
    updatedAt: Timestamp.now(),
  };
}