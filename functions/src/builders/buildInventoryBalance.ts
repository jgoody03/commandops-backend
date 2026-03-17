import { Timestamp } from "firebase-admin/firestore";
import { InventoryBalanceDoc } from "../contracts/inventory";
import { ProductDoc } from "../contracts/products";
import { computeStockStatus } from "../utils/computeStockStatus";

type LocationLike = {
  id: string;
  name: string;
  code?: string | null;
};

type ExistingBalanceLike = Partial<InventoryBalanceDoc> | null | undefined;

export function buildInventoryBalance(params: {
  existing?: ExistingBalanceLike;
  workspaceId: string;
  location: LocationLike;
  product: ProductDoc & { id: string };
  onHand: number;
  available: number;
  transactionAt?: Timestamp | null;
}): InventoryBalanceDoc {
  const {
    existing,
    workspaceId,
    location,
    product,
    onHand,
    available,
    transactionAt,
  } = params;

  const lowStockThreshold = product.lowStockThreshold ?? null;
  const reorderPoint = product.reorderPoint ?? null;
  const reorderQuantity = product.reorderQuantity ?? null;

  const { hasStock, isOutOfStock, isLowStock, stockStatus } =
    computeStockStatus(onHand, lowStockThreshold);

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
    primaryBarcode: product.primaryBarcode ?? null,
    unit: product.unit ?? null,

    locationName: location.name,
    locationCode: location.code ?? null,

    lowStockThreshold,
    reorderPoint,
    reorderQuantity,

    isOutOfStock,
    isLowStock,
    stockStatus,

    lastTransactionAt: transactionAt ?? existing?.lastTransactionAt ?? null,
    updatedAt: Timestamp.now(),
  };
}