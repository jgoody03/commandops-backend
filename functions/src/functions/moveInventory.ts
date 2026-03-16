import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { TransactionPostingService } from "../services/transactionPostingService";
import { makeRequestId } from "../utils/makeRequestId";

const service = new TransactionPostingService();

export const moveInventory = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const sourceLocationId = String(request.data.sourceLocationId || "").trim();
  const targetLocationId = String(request.data.targetLocationId || "").trim();
  const lines = Array.isArray(request.data.lines) ? request.data.lines : [];
  const note = request.data.note ? String(request.data.note) : "";

  if (!workspaceId || !sourceLocationId || !targetLocationId) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId, sourceLocationId, and targetLocationId are required."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  return service.postMove(
    {
      workspaceId,
      sourceLocationId,
      targetLocationId,
      note,
      lines,
    },
    request.auth.uid,
    makeRequestId()
  );
});