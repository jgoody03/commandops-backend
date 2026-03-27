import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { LocationRepo } from "../repositories/locationRepo";

const locationRepo = new LocationRepo();

export const createLocation = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data?.workspaceId || "").trim();
  const name = String(request.data?.name || "").trim();
  const code = String(request.data?.code || "").trim();
  const type = String(request.data?.type || "").trim();

  if (!workspaceId || !name || !code || !type) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId, name, code, and type are required."
    );
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  const existing = await locationRepo.getByCode(workspaceId, code);
  if (existing) {
    throw new HttpsError(
      "already-exists",
      "A location with that code already exists."
    );
  }

  const location = await locationRepo.create(workspaceId, {
    name,
    code,
    type: type as any,
  });

  return {
    ok: true,
    location: {
      id: location.id,
      name: location.name,
      code: location.code,
      type: location.type,
      isActive: location.isActive,
    },
  };
});