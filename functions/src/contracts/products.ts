import { Timestamp } from "firebase-admin/firestore";
import { ProductUnit } from "./enums";

export interface ProductDoc {
  workspaceId: string;
  name: string;
  nameLower: string;
  sku: string;
  skuLower: string;
  description: string;
  primaryBarcode?: string | null;
  barcodeAliases: string[];
  unit?: string | null;
  price?: number | null;
  lowStockThreshold?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  primaryBarcode?: string | null;
  barcodeAliases?: string[];
  unit?: ProductUnit;
  price?: number | null;

  lowStockThreshold?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
}