import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { BarcodeResolutionService } from "../services/barcodeResolutionService";

const service = new BarcodeResolutionService();

export const resolveScanCode = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const code = String(request.data.code || "").trim();

  if (!workspaceId || !code) {
    throw new HttpsError("invalid-argument", "workspaceId and code are required.");
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  return service.resolve({
    workspaceId,
    code,
    uid: request.auth.uid,
    deviceId: request.data.deviceId ? String(request.data.deviceId) : undefined,
    symbology: request.data.symbology ? String(request.data.symbology) : undefined,
  });
});