import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { VendorRepo } from "../repositories/vendorRepo";
import type { ListVendorsInput, ListVendorsOutput } from "../contracts/vendors";

const vendorRepo = new VendorRepo();

export const listVendors = onCall<
  ListVendorsInput,
  Promise<ListVendorsOutput>
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

  const items = await vendorRepo.list(workspaceId, limit);

  return { items };
});