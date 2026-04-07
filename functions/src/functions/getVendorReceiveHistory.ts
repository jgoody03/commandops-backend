import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { transactionsCol } from "../core/firestore";
import type { InventoryTransactionDoc } from "../contracts/inventory";
import type {
  GetVendorReceiveHistoryInput,
  GetVendorReceiveHistoryOutput,
} from "../contracts/vendors";

export const getVendorReceiveHistory = onCall<
  GetVendorReceiveHistoryInput,
  Promise<GetVendorReceiveHistoryOutput>
>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const vendorName = String(request.data.vendorName || "").trim();
  const limit =
    Number.isFinite(Number(request.data.limit)) && Number(request.data.limit) > 0
      ? Number(request.data.limit)
      : 20;

  if (!workspaceId || !vendorName) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId and vendorName are required."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  const snap = await transactionsCol(workspaceId)
    .where("type", "==", "receive")
    .where("vendorName", "==", vendorName)
    .orderBy("postedAt", "desc")
    .limit(limit)
    .get();

  const items = snap.docs.map((doc) => {
    const data = doc.data() as InventoryTransactionDoc;

    return {
      transactionId: doc.id,
      locationId: data.targetLocationId ?? null,
      locationName: data.targetLocationName ?? null,
      referenceNumber: data.referenceNumber ?? null,
      note: data.note ?? null,
      lineCount: data.lineCount ?? 0,
      postedAtMs: data.postedAt.toMillis(),
    };
  });

  return {
    vendorName,
    items,
  };
});