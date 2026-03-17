import {
  productInventorySummaryCol,
} from "../core/firestore";
import { ProductInventorySummaryDoc } from "../contracts/inventorySummaries";

export class ProductInventorySummaryRepo {
  getRef(workspaceId: string, productId: string) {
    return productInventorySummaryCol(workspaceId).doc(productId);
  }

  async get(workspaceId: string, productId: string) {
    const ref = this.getRef(workspaceId, productId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as ProductInventorySummaryDoc) };
  }

  async set(
    workspaceId: string,
    productId: string,
    doc: ProductInventorySummaryDoc
  ) {
    await this.getRef(workspaceId, productId).set(doc, { merge: true });
  }
}