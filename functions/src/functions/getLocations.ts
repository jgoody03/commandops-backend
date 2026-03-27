import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { locationsCol } from "../core/firestore";
import { LocationDoc } from "../contracts/locations";

export const getLocations = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data?.workspaceId || "").trim();

  if (!workspaceId) {
    throw new HttpsError("invalid-argument", "workspaceId is required.");
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  const snap = await locationsCol(workspaceId)
    .orderBy("name", "asc")
    .get();

  return {
    items: snap.docs.map((doc) => {
      const data = doc.data() as LocationDoc;

      return {
        id: doc.id,
        name: data.name,
        code: data.code,
        type: data.type,
        isActive: data.isActive,
      };
    }),
  };
});