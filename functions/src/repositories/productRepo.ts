import { HttpsError } from "firebase-functions/v2/https";
import { productsCol, Timestamp } from "../core/firestore";
import { CreateProductInput, ProductDoc } from "../contracts/products";

export class ProductRepo {
  async create(workspaceId: string, input: CreateProductInput) {
    const now = Timestamp.now();
    const ref = productsCol(workspaceId).doc();

    const sku = input.sku.trim().toUpperCase();
    const name = input.name.trim();

    const existing = await productsCol(workspaceId)
      .where("sku", "==", sku)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new HttpsError("already-exists", "SKU already exists.");
    }

const doc: ProductDoc = {
  workspaceId,
  sku,
  skuLower: sku.toLowerCase(),
  name,
  nameLower: name.toLowerCase(),
  description: input.description?.trim() || "",
  primaryBarcode: input.primaryBarcode ?? null,
  barcodeAliases: input.barcodeAliases ?? [],
  unit: input.unit ?? "each",
  price: input.price ?? null,
  isActive: true,
  lowStockThreshold: input.lowStockThreshold ?? null,
  reorderPoint: input.reorderPoint ?? null,
  reorderQuantity: input.reorderQuantity ?? null,
  createdAt: now,
  updatedAt: now,
};

    await ref.set(doc);
    return { id: ref.id, ...doc };
  }

  async getById(workspaceId: string, productId: string) {
    const snap = await productsCol(workspaceId).doc(productId).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Product not found.");
    }

    return { id: snap.id, ...(snap.data() as ProductDoc) };
  }

  async getBySku(workspaceId: string, sku: string) {
    const normalized = sku.trim().toUpperCase();

    const q = await productsCol(workspaceId)
      .where("sku", "==", normalized)
      .limit(1)
      .get();

    if (q.empty) return null;

    const doc = q.docs[0];
    return { id: doc.id, ...(doc.data() as ProductDoc) };
  }
}