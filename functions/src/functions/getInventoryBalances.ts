import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { balancesCol } from "../core/firestore";
import { InventoryBalanceDoc } from "../contracts/inventory";

interface GetInventoryBalancesCursor {
  updatedAtMs: number;
  docId: string;
}

interface GetInventoryBalancesResponseItem {
  id: string;
  workspaceId: string;
  locationId: string;
  productId: string;
  onHand: number;
  available: number;
  lastTransactionAtMs: number | null;
  updatedAtMs: number | null;
}

interface GetInventoryBalancesResponse {
  items: GetInventoryBalancesResponseItem[];
  nextCursor: GetInventoryBalancesCursor | null;
}

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
    return 50;
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

function parseCursor(value: unknown): GetInventoryBalancesCursor | null {
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

function toResponseItem(
  id: string,
  balance: InventoryBalanceDoc
): GetInventoryBalancesResponseItem {
  return {
    id,
    workspaceId: balance.workspaceId,
    locationId: balance.locationId,
    productId: balance.productId,
    onHand: balance.onHand,
    available: balance.available,
    lastTransactionAtMs: balance.lastTransactionAt?.toMillis() ?? null,
    updatedAtMs: balance.updatedAt?.toMillis() ?? null,
  };
}

export const getInventoryBalances = onCall(
  async (request): Promise<GetInventoryBalancesResponse> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );
    const locationId = parseOptionalString(request.data?.locationId);
    const productId = parseOptionalString(request.data?.productId);
    const limit = parseLimit(request.data?.limit);
    const cursor = parseCursor(request.data?.cursor);

    await assertWorkspaceMembership(workspaceId, uid);

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      balancesCol(workspaceId)
        .orderBy("updatedAt", "desc")
        .orderBy(FieldPath.documentId(), "desc");

    if (locationId) {
      query = query.where("locationId", "==", locationId);
    }

    if (productId) {
      query = query.where("productId", "==", productId);
    }

    if (cursor) {
      query = query.startAfter(
        Timestamp.fromMillis(cursor.updatedAtMs),
        cursor.docId
      );
    }

    const snapshot = await query.limit(limit + 1).get();

    const pageDocs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    const items = pageDocs.map((doc) =>
      toResponseItem(doc.id, doc.data() as InventoryBalanceDoc)
    );

    const lastDoc = pageDocs[pageDocs.length - 1];
    const lastBalance = lastDoc?.data() as InventoryBalanceDoc | undefined;

    return {
      items,
      nextCursor:
        hasMore && lastDoc && lastBalance?.updatedAt
          ? {
              updatedAtMs: lastBalance.updatedAt.toMillis(),
              docId: lastDoc.id,
            }
          : null,
    };
  }
);