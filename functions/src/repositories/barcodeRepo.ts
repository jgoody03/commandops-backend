import { barcodeIndexCol, Timestamp } from "../core/firestore";
import { normalizeBarcode } from "../utils/normalizeBarcode";

export interface BarcodeIndexDoc {
  barcode: string;
  normalizedBarcode: string;
  productId: string;
  sku: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export class BarcodeRepo {
  async upsert(
    workspaceId: string,
    barcode: string,
    productId: string,
    sku: string
  ): Promise<void> {
    const normalized = normalizeBarcode(barcode);
    const now = Timestamp.now();

    await barcodeIndexCol(workspaceId).doc(normalized).set(
      {
        barcode,
        normalizedBarcode: normalized,
        productId,
        sku,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  }

  async resolve(
    workspaceId: string,
    barcode: string
  ): Promise<(BarcodeIndexDoc & { id: string }) | null> {
    const normalized = normalizeBarcode(barcode);
    const snap = await barcodeIndexCol(workspaceId).doc(normalized).get();

    if (!snap.exists) {
      return null;
    }

    return {
      id: snap.id,
      ...(snap.data() as BarcodeIndexDoc),
    };
  }
}