import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { workspaceRef, Timestamp } from "../core/firestore";

export const completeOnboarding = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data?.workspaceId || "").trim();

  if (!workspaceId) {
    throw new HttpsError("invalid-argument", "workspaceId is required.");
  }

  await assertWorkspaceMembership(workspaceId, request.auth.uid);

  await workspaceRef(workspaceId).set(
    {
      onboarding: {
        completed: true,
        step: "complete",
        completedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  return { ok: true };
});