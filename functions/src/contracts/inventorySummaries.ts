import { Timestamp } from "firebase-admin/firestore";
import { StockStatus } from "./inventory";

export interface ProductInventorySummaryDoc {
  workspaceId: string;
  productId: string;

  sku: string;
  skuLower: string;
  name: string;
  nameLower: string;
  primaryBarcode?: string | null;
  unit?: string | null;

  lowStockThreshold?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;

  totalOnHand: number;
  totalAvailable: number;

  totalLocations: number;
  locationsInStock: number;
  locationsOutOfStock: number;
  locationsLowStock: number;

  isOutOfStockEverywhere: boolean;
  isLowStockAnywhere: boolean;
  stockStatus: StockStatus;

  lastTransactionAt?: Timestamp | null;
  updatedAt: Timestamp;
}

export interface LocationInventorySummaryDoc {
  workspaceId: string;
  locationId: string;

  locationName: string;
  locationCode?: string | null;

  totalSkus: number;
  totalUnits: number;
  totalAvailableUnits: number;

  lowStockSkuCount: number;
  outOfStockSkuCount: number;
  inStockSkuCount: number;

  lastTransactionAt?: Timestamp | null;
  updatedAt: Timestamp;
}