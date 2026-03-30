import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../core/firestore";

export const getMyWorkspaceContext = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;

  const userSnap = await db.collection("users").doc(uid).get();

  if (!userSnap.exists) {
    return {
      workspaceId: null,
      memberId: null,
      role: null,
      defaultLocationId: null,
      onboarding: {
        completed: false,
        step: "welcome",
      },
    };
  }

  const user = userSnap.data() || {};
  const workspaceId = String(user.activeWorkspaceId || "").trim();

  if (!workspaceId) {
    return {
      workspaceId: null,
      memberId: null,
      role: null,
      defaultLocationId: null,
      onboarding: {
        completed: false,
        step: "welcome",
      },
    };
  }

  const [workspaceSnap, memberSnap] = await Promise.all([
    db.collection("workspaces").doc(workspaceId).get(),
    db.collection("workspaces").doc(workspaceId).collection("members").doc(uid).get(),
  ]);

  if (!workspaceSnap.exists || !memberSnap.exists) {
    return {
      workspaceId: null,
      memberId: null,
      role: null,
      defaultLocationId: null,
      onboarding: {
        completed: false,
        step: "welcome",
      },
    };
  }

  const workspace = workspaceSnap.data() || {};
  const membership = memberSnap.data() || {};
  const onboarding = workspace.onboarding || {};

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
    workspaceId,
    memberId: uid,
    role,
    defaultLocationId,
    onboarding: {
      completed: Boolean(onboarding.completed),
      step: onboarding.step || "welcome",
    },
  };
});