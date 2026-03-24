import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { TransactionPostingService } from "../services/transactionPostingService";
import { makeRequestId } from "../utils/makeRequestId";

const service = new TransactionPostingService();

export const countInventory = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const locationId = String(request.data.locationId || "").trim();
  const productId = String(request.data.productId || "").trim();
  const countedQuantity = Number(request.data.countedQuantity);
  const note = request.data.note ? String(request.data.note) : "";
  const barcode = request.data.barcode ? String(request.data.barcode) : "";

  if (!workspaceId || !locationId || !productId) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId, locationId, and productId are required."
    );
  }

  if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
    throw new HttpsError(
      "invalid-argument",
      "countedQuantity must be a valid number greater than or equal to 0."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  return service.postCount(
    {
      workspaceId,
      locationId,
      productId,
      countedQuantity,
      note,
      barcode,
    },
    request.auth.uid,
    makeRequestId()
  );
});