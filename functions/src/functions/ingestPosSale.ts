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
  const note = request.data.note ? String(request.data.note).trim() : "";

  const tenderTypeValue = request.data.tenderType
    ? String(request.data.tenderType).trim()
    : "";

  const tenderType = (
    ["cash", "card", "other"].includes(tenderTypeValue)
      ? tenderTypeValue
      : undefined
  ) as "cash" | "card" | "other" | undefined;

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
      "At least one sale line is required."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  const lines = rawLines.map((line) => ({
    productId: String(line.productId || "").trim(),
    quantity: Number(line.quantity || 0),
    barcode: line.barcode ? String(line.barcode).trim() : undefined,
    unitPrice:
      line.unitPrice === undefined ||
      line.unitPrice === null ||
      line.unitPrice === ""
        ? undefined
        : Number(line.unitPrice),
    note: line.note ? String(line.note).trim() : undefined,
  }));

  for (const line of lines) {
    if (!line.productId) {
      throw new HttpsError(
        "invalid-argument",
        "Each sale line must include productId."
      );
    }

    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new HttpsError(
        "invalid-argument",
        "Each sale line must include a quantity greater than zero."
      );
    }

    if (
      line.unitPrice !== undefined &&
      (!Number.isFinite(line.unitPrice) || line.unitPrice < 0)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "unitPrice must be a valid number greater than or equal to 0."
      );
    }
  }

  return service.postSale(
    {
      workspaceId,
      locationId,
      saleId: saleId || undefined,
      orderNumber: orderNumber || undefined,
      tenderType,
      note: note || undefined,
      lines,
    },
    request.auth.uid,
    makeRequestId()
  );
});