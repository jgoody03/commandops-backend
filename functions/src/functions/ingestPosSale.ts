import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { TransactionPostingService } from "../services/transactionPostingService";
import { makeRequestId } from "../utils/makeRequestId";

const service = new TransactionPostingService();

export const ingestPosSale = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const locationId = String(request.data.locationId || "").trim();
  const saleId = request.data.saleId ? String(request.data.saleId).trim() : "";
  const orderNumber = request.data.orderNumber
    ? String(request.data.orderNumber).trim()
    : "";
  const lines = Array.isArray(request.data.lines) ? request.data.lines : [];
  const note = request.data.note ? String(request.data.note) : "";

  if (!workspaceId || !locationId) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId and locationId are required."
    );
  }

  if (!lines.length) {
    throw new HttpsError(
      "invalid-argument",
      "At least one sale line is required."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  return service.postSale(
    {
      workspaceId,
      locationId,
      saleId: saleId || undefined,
      orderNumber: orderNumber || undefined,
      note,
      lines,
    },
    request.auth.uid,
    makeRequestId()
  );
});