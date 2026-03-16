import { Timestamp } from "firebase-admin/firestore";
import { InventoryTransactionType, ReferenceType } from "./enums";

export interface InventoryBalanceDoc {
  workspaceId: string;
  locationId: string;
  productId: string;
  onHand: number;
  available: number;
  hasStock: boolean;
  lastTransactionAt?: Timestamp;
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