import { HttpsError } from "firebase-functions/v2/https";
import { membersCol } from "./firestore";

export async function assertWorkspaceMembership(
  workspaceId: string,
  uid: string
): Promise<void> {
  const snap = await membersCol(workspaceId).doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError(
      "permission-denied",
      "User is not a member of this workspace."
    );
  }
}