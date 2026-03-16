import { Transaction } from "firebase-admin/firestore";
import { balancesCol, Timestamp } from "../core/firestore";
import { makeBalanceKey } from "../utils/makeBalanceKey";
import { InventoryBalanceDoc } from "../contracts/inventory";

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

  setAbsoluteInTransaction(
    tx: Transaction,
    params: {
      workspaceId: string;
      locationId: string;
      productId: string;
      onHand: number;
      available: number;
      transactionAt: FirebaseFirestore.Timestamp;
    }
  ) {
    const ref = this.getRef(
      params.workspaceId,
      params.locationId,
      params.productId
    );

    const payload: InventoryBalanceDoc = {
      workspaceId: params.workspaceId,
      locationId: params.locationId,
      productId: params.productId,
      onHand: params.onHand,
      hasStock: params.onHand > 0,
      available: params.available,
      lastTransactionAt: params.transactionAt,
      updatedAt: Timestamp.now(),
    };

    tx.set(ref, payload, { merge: true });
  }

  async incrementOnHand(
    workspaceId: string,
    locationId: string,
    productId: string,
    delta: number,
    transactionAt = Timestamp.now()
  ) {
    const ref = this.getRef(workspaceId, locationId, productId);

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

      const payload: InventoryBalanceDoc = {
        workspaceId,
        locationId,
        productId,
        hasStock: nextOnHand > 0,
        onHand: nextOnHand,
        available: nextAvailable,
        lastTransactionAt: transactionAt,
        updatedAt: Timestamp.now(),
      };

      tx.set(ref, payload, { merge: true });
    });
  }
}