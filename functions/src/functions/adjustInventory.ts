import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { TransactionPostingService } from "../services/transactionPostingService";
import { makeRequestId } from "../utils/makeRequestId";
import type { AdjustmentReasonCode } from "../contracts/enums";

const service = new TransactionPostingService();

function normalizeReasonCode(value: unknown): AdjustmentReasonCode | undefined {
  const reason = String(value || "").trim() as AdjustmentReasonCode | "";
  return reason || undefined;
}

export const adjustInventory = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const locationId = String(request.data.locationId || "").trim();
const rawLines: Record<string, unknown>[] = Array.isArray(request.data.lines)
  ? (request.data.lines as Record<string, unknown>[])
  : [];
  
  if (!workspaceId || !locationId) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId and locationId are required."
    );
  }

  if (!rawLines.length) {
    throw new HttpsError(
      "invalid-argument",
      "At least one adjustment line is required."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  const lines = rawLines.map((line) => ({
    productId: String(line.productId || "").trim(),
    quantityDelta: Number(line.quantityDelta || 0),
    barcode: line.barcode ? String(line.barcode).trim() : undefined,
    reasonCode: normalizeReasonCode(line.reasonCode),
    note: line.note ? String(line.note).trim() : undefined,
  }));

  for (const line of lines) {
    if (!line.productId) {
      throw new HttpsError("invalid-argument", "Each line must include productId.");
    }

    if (!Number.isFinite(line.quantityDelta) || line.quantityDelta === 0) {
      throw new HttpsError(
        "invalid-argument",
        "Each line must include a non-zero quantityDelta."
      );
    }
  }

  return service.postAdjust(
    {
      workspaceId,
      locationId,
      lines,
    },
    request.auth.uid,
    makeRequestId()
  );
});