import { Timestamp } from "firebase-admin/firestore";
import { InventoryTransactionType, ReferenceType } from "./enums";
import { AdjustmentReasonCode } from "./enums";


export type StockStatus = "ok" | "low" | "out";

export interface InventoryBalanceDoc {
  workspaceId: string;
  locationId: string;
  productId: string;

  onHand: number;
  available: number;

  hasStock: boolean;

  sku: string;
  skuLower: string;
  name: string;
  nameLower: string;
  primaryBarcode?: string | null;
  unit?: string | null;

  locationName: string;
  locationCode?: string | null;

  lowStockThreshold?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;

  isOutOfStock: boolean;
  isLowStock: boolean;
  stockStatus: StockStatus;

  lastTransactionAt?: Timestamp | null;
  updatedAt: Timestamp;
}

export interface InventoryTransactionDoc {
  type: InventoryTransactionType;
  referenceType: ReferenceType;
  sourceLocationId?: string | null;
  targetLocationId?: string | null;
  note?: string;
  postedBy: string;
  postedAt: Timestamp;
  requestId: string;
  createdAt: Timestamp;
  relatedTransactionGroupId?: string | null;
}

export interface InventoryTransactionLineDoc {
  productId: string;
  sku: string;
  quantity: number;
  unitCost?: number | null;
  barcode?: string | null;
  note?: string;
}

export interface PostReceiveInventoryInput {
  workspaceId: string;
  locationId: string;
  note?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    unitCost?: number;
    barcode?: string;
    note?: string;
  }>;
}

export interface PostMoveInventoryInput {
  workspaceId: string;
  sourceLocationId: string;
  targetLocationId: string;
  note?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    barcode?: string;
    note?: string;
  }>;
}

export interface PostAdjustInventoryInput {
  workspaceId: string;
  locationId: string;
  note?: string;
  lines: Array<{
    productId: string;
    quantityDelta: number;
    barcode?: string;
    note?: string;
  }>;
}

export interface PostSaleInventoryInput {
  workspaceId: string;
  locationId: string;
  saleId?: string;
  orderNumber?: string;
  note?: string;
  lines: Array<{
    productId: string;
    quantity: number;
    barcode?: string;
    note?: string;
  }>;
}

export type AdjustInventoryLineInput = {
  productId: string;
  quantityDelta: number;
  barcode?: string;
  reasonCode?: AdjustmentReasonCode;
  note?: string;
};

export type AdjustInventoryInput = {
  workspaceId: string;
  locationId: string;
  lines: AdjustInventoryLineInput[];
};