import { Timestamp } from "firebase-admin/firestore";
import { InventoryTransactionType, ReferenceType } from "./enums";

export interface InventoryBalanceDoc {
  workspaceId: string;
  locationId: string;
  productId: string;
  onHand: number;
  available: number;
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