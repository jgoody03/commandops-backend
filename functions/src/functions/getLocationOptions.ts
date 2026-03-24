import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { locationsCol } from "../core/firestore";
import {
  GetLocationOptionsResult,
  LocationOptionItem,
} from "../contracts/dashboard";

function requireAuth(uid?: string): string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  return uid;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  const parsed = String(value ?? "").trim();

  if (!parsed) {
    throw new HttpsError("invalid-argument", `${fieldName} is required.`);
  }

  return parsed;
}

function toResponseItem(
  id: string,
  doc: FirebaseFirestore.DocumentData
): LocationOptionItem {
  return {
    locationId: doc.locationId ?? id,
    locationName: doc.name ?? doc.locationName ?? "Unnamed Location",
    locationCode: doc.code ?? doc.locationCode ?? null,
    isDefault: Boolean(doc.isDefault),
  };
}

export const getLocationOptions = onCall(
  async (request): Promise<GetLocationOptionsResult> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );

    await assertWorkspaceMembership(workspaceId, uid);

    const snapshot = await locationsCol(workspaceId).get();

    const items = snapshot.docs
      .map((doc) => toResponseItem(doc.id, doc.data()))
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }

        return a.locationName.localeCompare(b.locationName);
      });

    return {
      items,
    };
  }
);