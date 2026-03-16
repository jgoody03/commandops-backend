import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { productsCol } from "../core/firestore";

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

interface SearchProductsResponseItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  primaryBarcode?: string | null;
  barcodeAliases: string[];
  unit?: string;
  isActive?: boolean;
}

interface SearchProductsResponse {
  items: SearchProductsResponseItem[];
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

  return Math.min(normalized, 50);
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function prefixUpperBound(value: string): string {
  return `${value}\uf8ff`;
}

function toResponseItem(
  id: string,
  product: ProductDoc
): SearchProductsResponseItem {
  return {
    id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    primaryBarcode: product.primaryBarcode ?? null,
    barcodeAliases: Array.isArray(product.barcodeAliases)
      ? product.barcodeAliases
      : [],
    unit: product.unit,
    isActive: product.isActive,
  };
}

function scoreProduct(product: SearchProductsResponseItem, q: string): number {
  const sku = product.sku.toLowerCase();
  const name = product.name.toLowerCase();
  const barcode = (product.primaryBarcode ?? "").toLowerCase();

  if (sku === q) return 100;
  if (barcode === q) return 95;
  if (sku.startsWith(q)) return 90;
  if (name.startsWith(q)) return 80;
  if (sku.includes(q)) return 70;
  if (name.includes(q)) return 60;
  return 0;
}

export const searchProducts = onCall(
  async (request): Promise<SearchProductsResponse> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );
    const rawQuery = parseRequiredString(request.data?.query, "query");
    const limit = parseLimit(request.data?.limit);
    const q = normalizeSearch(rawQuery);

    await assertWorkspaceMembership(workspaceId, uid);

    const productsRef = productsCol(workspaceId);

    const [skuSnap, nameSnap] = await Promise.all([
      productsRef
        .where("skuLower", ">=", q)
        .where("skuLower", "<=", prefixUpperBound(q))
        .limit(limit)
        .get(),
      productsRef
        .where("nameLower", ">=", q)
        .where("nameLower", "<=", prefixUpperBound(q))
        .limit(limit)
        .get(),
    ]);

    const merged = new Map<string, SearchProductsResponseItem>();

    for (const doc of [...skuSnap.docs, ...nameSnap.docs]) {
      const item = toResponseItem(doc.id, doc.data() as ProductDoc);
      merged.set(doc.id, item);
    }

    const items = Array.from(merged.values())
      .sort((a, b) => {
        const scoreDiff = scoreProduct(b, q) - scoreProduct(a, q);
        if (scoreDiff !== 0) return scoreDiff;

        const skuCompare = a.sku.localeCompare(b.sku);
        if (skuCompare !== 0) return skuCompare;

        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    return { items };
  }
);