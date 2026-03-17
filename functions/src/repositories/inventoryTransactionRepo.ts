import { Transaction } from "firebase-admin/firestore";
import { transactionsCol, Timestamp } from "../core/firestore";
import {
  InventoryTransactionDoc,
  InventoryTransactionLineDoc,
} from "../contracts/inventory";

export class InventoryTransactionRepo {
  newId(workspaceId: string) {
    return transactionsCol(workspaceId).doc().id;
  }

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

  createInTransaction(
    tx: Transaction,
    workspaceId: string,
    header: Omit<InventoryTransactionDoc, "createdAt">,
    lines: InventoryTransactionLineDoc[]
  ) {
    const ref = transactionsCol(workspaceId).doc();
    const now = Timestamp.now();

    tx.set(ref, {
      ...header,
      createdAt: now,
    });

    for (const line of lines) {
      const lineRef = ref.collection("lines").doc();
      tx.set(lineRef, line);
    }

    return ref.id;
  }
}