import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { locationInventorySummaryCol } from "../core/firestore";
import { LocationInventorySummaryDoc } from "../contracts/inventorySummaries";
import {
  GetLocationSummaryListResult,
  LocationSummaryListItem,
  SummaryListCursor,
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

function parseCursor(value: unknown): SummaryListCursor | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "object") {
    throw new HttpsError("invalid-argument", "cursor must be an object.");
  }

  const cursor = value as {
    updatedAtMs?: unknown;
    docId?: unknown;
  };

  const updatedAtMs = Number(cursor.updatedAtMs);
  const docId = String(cursor.docId ?? "").trim();

  if (!Number.isFinite(updatedAtMs) || !docId) {
    throw new HttpsError("invalid-argument", "cursor is invalid.");
  }

  return {
    updatedAtMs: Math.floor(updatedAtMs),
    docId,
  };
}

function normalizeQuery(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
}

function toResponseItem(
  id: string,
  doc: LocationInventorySummaryDoc
): LocationSummaryListItem {
  return {
    id,
    workspaceId: doc.workspaceId,
    locationId: doc.locationId,
    locationName: doc.locationName,
    locationCode: doc.locationCode ?? null,
    totalSkus: doc.totalSkus,
    totalUnits: doc.totalUnits,
    totalAvailableUnits: doc.totalAvailableUnits,
    lowStockSkuCount: doc.lowStockSkuCount,
    outOfStockSkuCount: doc.outOfStockSkuCount,
    inStockSkuCount: doc.inStockSkuCount,
    lastTransactionAtMs: doc.lastTransactionAt?.toMillis() ?? null,
    updatedAtMs: doc.updatedAt?.toMillis() ?? null,
  };
}

function matchesQuery(item: LocationSummaryListItem, q?: string): boolean {
  if (!q) return true;

  return (
    item.locationName.toLowerCase().includes(q) ||
    (item.locationCode ?? "").toLowerCase().includes(q)
  );
}

export const getLocationSummaryList = onCall(
  async (request): Promise<GetLocationSummaryListResult> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );
    const limit = parseLimit(request.data?.limit);
    const cursor = parseCursor(request.data?.cursor);
    const queryText = normalizeQuery(parseOptionalString(request.data?.query));

    await assertWorkspaceMembership(workspaceId, uid);

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      locationInventorySummaryCol(workspaceId)
        .orderBy("updatedAt", "desc")
        .orderBy(FieldPath.documentId(), "desc");

    if (cursor) {
      query = query.startAfter(
        Timestamp.fromMillis(cursor.updatedAtMs),
        cursor.docId
      );
    }

    const snapshot = await query.limit(limit + 10).get();

    const filteredDocs = snapshot.docs.filter((doc) => {
      const item = toResponseItem(
        doc.id,
        doc.data() as LocationInventorySummaryDoc
      );
      return matchesQuery(item, queryText);
    });

    const pageDocs = filteredDocs.slice(0, limit);
    const hasMore = filteredDocs.length > limit || snapshot.docs.length > limit;

    const items = pageDocs.map((doc) =>
      toResponseItem(doc.id, doc.data() as LocationInventorySummaryDoc)
    );

    const lastDoc = pageDocs[pageDocs.length - 1];
    const lastItem = lastDoc?.data() as LocationInventorySummaryDoc | undefined;

    return {
      items,
      nextCursor:
        hasMore && lastDoc && lastItem?.updatedAt
          ? {
              updatedAtMs: lastItem.updatedAt.toMillis(),
              docId: lastDoc.id,
            }
          : null,
    };
  }
);