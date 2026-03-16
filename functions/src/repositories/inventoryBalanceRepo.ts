import { balancesCol, db, Timestamp } from "../core/firestore";
import { makeBalanceKey } from "../utils/makeBalanceKey";
import { InventoryBalanceDoc } from "../contracts/inventory";

export class InventoryBalanceRepo {
  async get(workspaceId: string, locationId: string, productId: string) {
    const key = makeBalanceKey(locationId, productId);
    const snap = await balancesCol(workspaceId).doc(key).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as InventoryBalanceDoc) };
  }

  async incrementOnHand(
    workspaceId: string,
    locationId: string,
    productId: string,
    delta: number,
    transactionAt = Timestamp.now()
  ) {
    const key = makeBalanceKey(locationId, productId);
    const ref = balancesCol(workspaceId).doc(key);

    await db.runTransaction(async (tx) => {
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
        onHand: nextOnHand,
        available: nextAvailable,
        lastTransactionAt: transactionAt,
        updatedAt: Timestamp.now(),
      };

      tx.set(ref, payload, { merge: true });
    });
  }
}