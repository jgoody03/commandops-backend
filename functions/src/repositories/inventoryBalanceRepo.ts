import { Transaction } from "firebase-admin/firestore";
import { balancesCol, Timestamp } from "../core/firestore";
import { InventoryBalanceDoc } from "../contracts/inventory";
import { ProductDoc } from "../contracts/products";
import { makeBalanceKey } from "../utils/makeBalanceKey";
import { buildInventoryBalance } from "../builders/buildInventoryBalance";

type ProductWithId = ProductDoc & { id: string };

type LocationLike = {
  id: string;
  name: string;
  code?: string | null;
};

export class InventoryBalanceRepo {
  getRef(workspaceId: string, locationId: string, productId: string) {
    const key = makeBalanceKey(locationId, productId);
    return balancesCol(workspaceId).doc(key);
  }

  async get(workspaceId: string, locationId: string, productId: string) {
    const ref = this.getRef(workspaceId, locationId, productId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as InventoryBalanceDoc) };
  }

  async getInTransaction(
    tx: Transaction,
    workspaceId: string,
    locationId: string,
    productId: string
  ) {
    const ref = this.getRef(workspaceId, locationId, productId);
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    return { id: snap.id, ref, ...(snap.data() as InventoryBalanceDoc) };
  }

  async listByProduct(workspaceId: string, productId: string) {
    const snap = await balancesCol(workspaceId)
      .where("productId", "==", productId)
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as InventoryBalanceDoc),
    }));
  }

  async listByLocation(workspaceId: string, locationId: string) {
    const snap = await balancesCol(workspaceId)
      .where("locationId", "==", locationId)
      .orderBy("nameLower")
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as InventoryBalanceDoc),
    }));
  }

  setAbsoluteInTransaction(
    tx: Transaction,
    params: {
      workspaceId: string;
      location: LocationLike;
      product: ProductWithId;
      onHand: number;
      available: number;
      transactionAt: FirebaseFirestore.Timestamp;
    }
  ) {
    const ref = this.getRef(
      params.workspaceId,
      params.location.id,
      params.product.id
    );

    const payload = buildInventoryBalance({
      workspaceId: params.workspaceId,
      location: params.location,
      product: params.product,
      onHand: params.onHand,
      available: params.available,
      transactionAt: params.transactionAt,
    });

    tx.set(ref, payload, { merge: true });
  }

  async incrementOnHand(
    workspaceId: string,
    location: LocationLike,
    product: ProductWithId,
    delta: number,
    transactionAt = Timestamp.now()
  ) {
    const ref = this.getRef(workspaceId, location.id, product.id);

    await ref.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists
        ? (snap.data() as InventoryBalanceDoc)
        : null;

      const nextOnHand = (current?.onHand ?? 0) + delta;
      const nextAvailable = (current?.available ?? 0) + delta;

      if (nextOnHand < 0 || nextAvailable < 0) {
        throw new Error("Insufficient inventory balance.");
      }

      const payload = buildInventoryBalance({
        existing: current,
        workspaceId,
        location,
        product,
        onHand: nextOnHand,
        available: nextAvailable,
        transactionAt,
      });

      tx.set(ref, payload, { merge: true });
    });
  }
}