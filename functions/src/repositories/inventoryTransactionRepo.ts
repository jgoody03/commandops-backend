import { transactionsCol, Timestamp } from "../core/firestore";
import {
  InventoryTransactionDoc,
  InventoryTransactionLineDoc,
} from "../contracts/inventory";

export class InventoryTransactionRepo {
  async create(
    workspaceId: string,
    header: Omit<InventoryTransactionDoc, "createdAt">,
    lines: InventoryTransactionLineDoc[]
  ) {
    const ref = transactionsCol(workspaceId).doc();
    const now = Timestamp.now();

    await ref.set({
      ...header,
      createdAt: now,
    });

    const batch = ref.firestore.batch();

    lines.forEach((line) => {
      const lineRef = ref.collection("lines").doc();
      batch.set(lineRef, line);
    });

    await batch.commit();

    return ref.id;
  }
}