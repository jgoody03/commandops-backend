import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../core/firestore";

export const getMyWorkspaceContext = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;

  const workspacesSnap = await db.collection("workspaces").get();

  for (const workspaceDoc of workspacesSnap.docs) {
    const memberSnap = await workspaceDoc.ref.collection("members").doc(uid).get();
    if (memberSnap.exists) {
      return {
        workspaceId: workspaceDoc.id,
        workspace: workspaceDoc.data(),
        membership: memberSnap.data(),
      };
    }
  }

  return {
    workspaceId: null,
    workspace: null,
    membership: null,
  };
});