import { onCall, HttpsError } from "firebase-functions/v2/https";
import { WorkspaceBootstrapService } from "../services/workspaceBootstrapService";

const service = new WorkspaceBootstrapService();

export const bootstrapWorkspace = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data.workspaceId || "").trim();
  const workspaceName = String(request.data.workspaceName || "").trim();

  if (!workspaceId || !workspaceName) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId and workspaceName are required."
    );
  }

  return service.bootstrap({
    workspaceId,
    workspaceName,
    ownerUid: request.auth.uid,
    ownerEmail: request.auth.token.email,
    ownerDisplayName: request.auth.token.name,
  });
});