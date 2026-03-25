import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import {
  balancesCol,
  productInventorySummaryCol,
  recentActivityCol,
} from "../core/firestore";
import { InventoryBalanceDoc } from "../contracts/inventory";
import { ProductInventorySummaryDoc } from "../contracts/inventorySummaries";
import { RecentActivityDoc } from "../contracts/activity";
import {
  GetProductDetailSnapshotResult,
  ProductLocationInventoryItem,
  ProductSummaryListItem,
  RecentActivityFeedItem,
} from "../contracts/dashboard";

function requireAuth(uid?: string): string {
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return uid;
}

function parseRequiredString(value: unknown, field: string): string {
  const v = String(value ?? "").trim();
  if (!v) throw new HttpsError("invalid-argument", `${field} is required.`);
  return v;
}

function parseLimit(value: unknown, fallback: number, max: number): number {
  if (value == null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0)
    throw new HttpsError("invalid-argument", "invalid limit");
  return Math.min(Math.floor(n), max);
}

function toSummary(
  id: string,
  doc: ProductInventorySummaryDoc
): ProductSummaryListItem {
  return {
    id,
    workspaceId: doc.workspaceId,
    productId: doc.productId,
    sku: doc.sku,
    name: doc.name,
    primaryBarcode: doc.primaryBarcode ?? null,
    unit: doc.unit ?? null,
    totalOnHand: doc.totalOnHand,
    totalAvailable: doc.totalAvailable,
    totalLocations: doc.totalLocations,
    locationsInStock: doc.locationsInStock,
    locationsOutOfStock: doc.locationsOutOfStock,
    locationsLowStock: doc.locationsLowStock,
    isOutOfStockEverywhere: doc.isOutOfStockEverywhere,
    isLowStockAnywhere: doc.isLowStockAnywhere,
    stockStatus: doc.stockStatus,
    lastTransactionAtMs: doc.lastTransactionAt?.toMillis() ?? null,
    updatedAtMs: doc.updatedAt?.toMillis() ?? null,
  };
}

function toLocationItem(
  doc: InventoryBalanceDoc
): ProductLocationInventoryItem {
  return {
    locationId: doc.locationId,
    locationName: doc.locationName,
    locationCode: doc.locationCode ?? null,
    onHand: doc.onHand,
    available: doc.available,
    stockStatus: doc.stockStatus,
    lastTransactionAtMs: doc.lastTransactionAt?.toMillis() ?? null,
  };
}

function toActivity(
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

export const getProductDetailSnapshot = onCall(
  async (request): Promise<GetProductDetailSnapshotResult> => {
    try {
      const uid = requireAuth(request.auth?.uid);

      const workspaceId = parseRequiredString(
        request.data?.workspaceId,
        "workspaceId"
      );
      const productId = parseRequiredString(
        request.data?.productId,
        "productId"
      );
      const activityLimit = parseLimit(request.data?.activityLimit, 10, 50);

      await assertWorkspaceMembership(workspaceId, uid);

      const [summarySnap, balancesSnap, activitySnap] = await Promise.all([
        productInventorySummaryCol(workspaceId).doc(productId).get(),
        balancesCol(workspaceId)
          .where("productId", "==", productId)
          .get(),
        recentActivityCol(workspaceId)
          .where("productId", "==", productId)
          .orderBy("createdAt", "desc")
          .limit(activityLimit)
          .get(),
      ]);

      const summary = summarySnap.exists
        ? toSummary(
            summarySnap.id,
            summarySnap.data() as ProductInventorySummaryDoc
          )
        : null;

      const locations = balancesSnap.docs
        .map((d) => toLocationItem(d.data() as InventoryBalanceDoc))
        .sort((a, b) => b.onHand - a.onHand);

      const recentActivity = activitySnap.docs.map((d) =>
        toActivity(d.id, d.data() as RecentActivityDoc)
      );

      return {
        summary,
        locations,
        recentActivity,
        generatedAtMs: Date.now(),
      };
    } catch (error) {
      console.error("getProductDetailSnapshot failed", error);

      throw new HttpsError(
        "internal",
        error instanceof Error
          ? error.message
          : "getProductDetailSnapshot failed."
      );
    }
  }
);