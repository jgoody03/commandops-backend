import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { balancesCol, productsCol } from "../core/firestore";
import { InventoryBalanceDoc } from "../contracts/inventory";

interface ProductDoc {
  sku: string;
  skuLower?: string;
  name: string;
  nameLower?: string;
  description?: string;
  primaryBarcode?: string | null;
  barcodeAliases?: string[];
  unit?: string;
  isActive?: boolean;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

interface GetLocationInventoryCursor {
  updatedAtMs: number;
  docId: string;
}

interface GetLocationInventoryResponseItem {
  id: string;
  workspaceId: string;
  locationId: string;
  productId: string;
  onHand: number;
  available: number;
  lastTransactionAtMs: number | null;
  updatedAtMs: number | null;
  product: {
    id: string;
    sku: string;
    name: string;
    description?: string;
    primaryBarcode?: string | null;
    barcodeAliases: string[];
    unit?: string;
    isActive?: boolean;
  } | null;
}

interface GetLocationInventoryResponse {
  items: GetLocationInventoryResponseItem[];
  nextCursor: GetLocationInventoryCursor | null;
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

function parseCursor(value: unknown): GetLocationInventoryCursor | null {
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

async function loadProductsById(
  workspaceId: string,
  productIds: string[]
): Promise<Map<string, ProductDoc>> {
  const uniqueIds = Array.from(new Set(productIds)).filter(Boolean);
  const results = new Map<string, ProductDoc>();

  if (!uniqueIds.length) {
    return results;
  }

  for (let i = 0; i < uniqueIds.length; i += 10) {
    const chunk = uniqueIds.slice(i, i + 10);

    const snap = await productsCol(workspaceId)
      .where(FieldPath.documentId(), "in", chunk)
      .get();

    for (const doc of snap.docs) {
      results.set(doc.id, doc.data() as ProductDoc);
    }
  }

  return results;
}

export const getLocationInventory = onCall(
  async (request): Promise<GetLocationInventoryResponse> => {
    try {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );
    const locationId = parseRequiredString(request.data?.locationId, "locationId");
    const limit = parseLimit(request.data?.limit);
    const cursor = parseCursor(request.data?.cursor);

    await assertWorkspaceMembership(workspaceId, uid);

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      balancesCol(workspaceId)
        .where("locationId", "==", locationId)
        .orderBy("updatedAt", "desc")
        .orderBy(FieldPath.documentId(), "desc");

    if (cursor) {
      query = query.startAfter(
        Timestamp.fromMillis(cursor.updatedAtMs),
        cursor.docId
      );
    }

    const snapshot = await query.limit(limit + 1).get();

    const pageDocs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    const balances = pageDocs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as InventoryBalanceDoc),
    }));

    const productMap = await loadProductsById(
      workspaceId,
      balances.map((balance) => balance.productId)
    );

    const items: GetLocationInventoryResponseItem[] = balances.map((balance) => {
      const product = productMap.get(balance.productId);

      return {
        id: balance.id,
        workspaceId: balance.workspaceId,
        locationId: balance.locationId,
        productId: balance.productId,
        onHand: balance.onHand,
        available: balance.available,
        lastTransactionAtMs: balance.lastTransactionAt?.toMillis() ?? null,
        updatedAtMs: balance.updatedAt?.toMillis() ?? null,
        product: product
          ? {
              id: balance.productId,
              sku: product.sku,
              name: product.name,
              description: product.description,
              primaryBarcode: product.primaryBarcode ?? null,
              barcodeAliases: Array.isArray(product.barcodeAliases)
                ? product.barcodeAliases
                : [],
              unit: product.unit,
              isActive: product.isActive,
            }
          : null,
      };
    });

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
          } catch (error) {
      console.error("someCallable failed", error);

      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "someCallable failed."
      );
    }
  }
);