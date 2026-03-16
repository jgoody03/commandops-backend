import { Timestamp } from "firebase-admin/firestore";
import { ProductUnit } from "./enums";

export interface ProductDoc {
  sku: string;
  name: string;
  description?: string;
  primaryBarcode?: string | null;
  barcodeAliases?: string[];
  unit: ProductUnit;
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
}