import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../core/firestore";

export const getMyWorkspaceContext = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;

  const workspacesSnap = await db.collection("workspaces").get();

  for (const workspaceDoc of workspacesSnap.docs) {
    const memberSnap = await workspaceDoc.ref
      .collection("members")
      .doc(uid)
      .get();

    if (memberSnap.exists) {
      const membership = memberSnap.data() || {};
      const workspace = workspaceDoc.data() || {};

      const role =
        membership.role ||
        membership.type ||
        membership.accessLevel ||
        "admin";

      const defaultLocationId =
        membership.defaultLocationId ||
        workspace.defaultLocationId ||
        null;

      return {
        workspaceId: workspaceDoc.id,
        memberId: uid,
        role,
        defaultLocationId,
      };
    }
  }

  return {
    workspaceId: null,
    memberId: null,
    role: null,
    defaultLocationId: null,
  };
});