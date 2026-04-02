import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { transactionsCol } from "../core/firestore";
import type { InventoryTransactionDoc, InventoryTransactionLineDoc } from "../contracts/inventory";
import type {
  GetReceiveDetailInput,
  GetReceiveDetailOutput,
} from "../contracts/receives";

export const getReceiveDetail = onCall<
  GetReceiveDetailInput,
  Promise<GetReceiveDetailOutput>
>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const transactionId = String(request.data.transactionId || "").trim();

  if (!workspaceId || !transactionId) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId and transactionId are required."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  const ref = transactionsCol(workspaceId).doc(transactionId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Receive transaction not found.");
  }

  const data = snap.data() as InventoryTransactionDoc;

  if (data.type !== "receive") {
    throw new HttpsError("failed-precondition", "Transaction is not a receive.");
  }

  const lineSnap = await ref.collection("lines").get();

  const lines = lineSnap.docs.map((doc) => {
    const line = doc.data() as InventoryTransactionLineDoc;

    return {
      lineId: doc.id,
      productId: line.productId,
      sku: line.sku,
      quantity: line.quantity,
      unitCost: line.unitCost ?? null,
      barcode: line.barcode ?? null,
      note: line.note ?? null,
    };
  });

  return {
    transactionId: snap.id,
    vendorName: data.vendorName ?? null,
    locationId: data.targetLocationId ?? null,
    locationName: data.targetLocationName ?? null,
    referenceNumber: data.referenceNumber ?? null,
    note: data.note ?? null,
    lineCount: data.lineCount ?? lines.length,
    postedAtMs: data.postedAt.toMillis(),
    lines,
  };
});