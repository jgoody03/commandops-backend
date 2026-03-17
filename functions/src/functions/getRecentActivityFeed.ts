import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { recentActivityCol } from "../core/firestore";
import { RecentActivityDoc } from "../contracts/activity";
import {
  ActivityFeedCursor,
  GetRecentActivityFeedResult,
  RecentActivityFeedItem,
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

function parseOptionalString(value: unknown): string | undefined {
  const parsed = String(value ?? "").trim();
  return parsed || undefined;
}

function parseLimit(value: unknown): number {
  if (value == null) {
    return 20;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new HttpsError("invalid-argument", "limit must be a valid number.");
  }

  const normalized = Math.floor(parsed);

  if (normalized <= 0) {
    throw new HttpsError("invalid-argument", "limit must be greater than 0.");
  }

  return Math.min(normalized, 100);
}

function parseCursor(value: unknown): ActivityFeedCursor | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "object") {
    throw new HttpsError("invalid-argument", "cursor must be an object.");
  }

  const cursor = value as {
    createdAtMs?: unknown;
    docId?: unknown;
  };

  const createdAtMs = Number(cursor.createdAtMs);
  const docId = String(cursor.docId ?? "").trim();

  if (!Number.isFinite(createdAtMs) || !docId) {
    throw new HttpsError("invalid-argument", "cursor is invalid.");
  }

  return {
    createdAtMs: Math.floor(createdAtMs),
    docId,
  };
}

function toResponseItem(
  id: string,
  doc: RecentActivityDoc
): RecentActivityFeedItem {
  return {
    id,
    workspaceId: doc.workspaceId,
    type: doc.type,
    productId: doc.productId ?? null,
    locationId: doc.locationId ?? null,
    title: doc.title,
    subtitle: doc.subtitle ?? null,
    actorUserId: doc.actorUserId ?? null,
    createdAtMs: doc.createdAt?.toMillis() ?? null,
  };
}

export const getRecentActivityFeed = onCall(
  async (request): Promise<GetRecentActivityFeedResult> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );
    const limit = parseLimit(request.data?.limit);
    const cursor = parseCursor(request.data?.cursor);
    const type = parseOptionalString(request.data?.type);
    const locationId = parseOptionalString(request.data?.locationId);
    const productId = parseOptionalString(request.data?.productId);

    await assertWorkspaceMembership(workspaceId, uid);

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      recentActivityCol(workspaceId)
        .orderBy("createdAt", "desc")
        .orderBy(FieldPath.documentId(), "desc");

    if (type) {
      query = query.where("type", "==", type);
    }

    if (locationId) {
      query = query.where("locationId", "==", locationId);
    }

    if (productId) {
      query = query.where("productId", "==", productId);
    }

    if (cursor) {
      query = query.startAfter(
        Timestamp.fromMillis(cursor.createdAtMs),
        cursor.docId
      );
    }

    const snapshot = await query.limit(limit + 1).get();

    const pageDocs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    const items = pageDocs.map((doc) =>
      toResponseItem(doc.id, doc.data() as RecentActivityDoc)
    );

    const lastDoc = pageDocs[pageDocs.length - 1];
    const lastItem = lastDoc?.data() as RecentActivityDoc | undefined;

    return {
      items,
      nextCursor:
        hasMore && lastDoc && lastItem?.createdAt
          ? {
              createdAtMs: lastItem.createdAt.toMillis(),
              docId: lastDoc.id,
            }
          : null,
    };
  }
);