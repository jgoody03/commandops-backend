import { Timestamp } from "firebase-admin/firestore";
import { ProductUnit } from "./enums";

export interface ProductDoc {
  sku: string;
  skuLower: string;
  name: string;
  nameLower: string;
  description?: string;
  primaryBarcode?: string | null;
  barcodeAliases?: string[];
  unit: ProductUnit;
  isActive: boolean;

  lowStockThreshold?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;

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

  lowStockThreshold?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
}