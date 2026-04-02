import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { transactionsCol } from "../core/firestore";
import type { InventoryTransactionDoc } from "../contracts/inventory";
import type {
  GetReceiveHistoryInput,
  GetReceiveHistoryOutput,
} from "../contracts/receives";

export const getReceiveHistory = onCall<
  GetReceiveHistoryInput,
  Promise<GetReceiveHistoryOutput>
>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const limit =
    Number.isFinite(Number(request.data.limit)) && Number(request.data.limit) > 0
      ? Number(request.data.limit)
      : 20;

  if (!workspaceId) {
    throw new HttpsError("invalid-argument", "workspaceId is required.");
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  const snap = await transactionsCol(workspaceId)
    .where("type", "==", "receive")
    .orderBy("postedAt", "desc")
    .limit(limit)
    .get();

  const items = snap.docs.map((doc) => {
    const data = doc.data() as InventoryTransactionDoc;

    return {
      transactionId: doc.id,
      vendorName: data.vendorName ?? null,
      locationId: data.targetLocationId ?? null,
      locationName: data.targetLocationName ?? null,
      referenceNumber: data.referenceNumber ?? null,
      note: data.note ?? null,
      lineCount: data.lineCount ?? 0,
      postedAtMs: data.postedAt.toMillis(),
    };
  });

  return { items };
});