import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { TransactionPostingService } from "../services/transactionPostingService";
import { makeRequestId } from "../utils/makeRequestId";

const service = new TransactionPostingService();

export const receiveInventory = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const locationId = String(request.data.locationId || "").trim();
  const vendorName = request.data.vendorName
    ? String(request.data.vendorName).trim()
    : "";
  const referenceNumber = request.data.referenceNumber
    ? String(request.data.referenceNumber).trim()
    : "";
  const lines = Array.isArray(request.data.lines) ? request.data.lines : [];
  const note = request.data.note ? String(request.data.note).trim() : "";

  if (!workspaceId || !locationId) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId and locationId are required."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  console.log("receiveInventory request", {
    workspaceId,
    locationId,
    vendorName,
    referenceNumber,
    lines,
    note,
  });

  try {
    return await service.postReceive(
      {
        workspaceId,
        locationId,
        vendorName: vendorName || undefined,
        referenceNumber: referenceNumber || undefined,
        note: note || undefined,
        lines,
      },
      request.auth.uid,
      makeRequestId()
    );
  } catch (error) {
    console.error("receiveInventory failed", error);

    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Receive inventory failed."
    );
  }
});