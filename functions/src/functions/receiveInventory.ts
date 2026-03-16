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
  const lines = Array.isArray(request.data.lines) ? request.data.lines : [];
  const note = request.data.note ? String(request.data.note) : "";

  if (!workspaceId || !locationId) {
    throw new HttpsError("invalid-argument", "workspaceId and locationId are required.");
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  return service.postReceive(
    {
      workspaceId,
      locationId,
      note,
      lines,
    },
    request.auth.uid,
    makeRequestId()
  );
});