import { FieldPath } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import {
  balancesCol,
  locationInventorySummaryCol,
  recentActivityCol,
} from "../core/firestore";
import { InventoryBalanceDoc } from "../contracts/inventory";
import { LocationInventorySummaryDoc } from "../contracts/inventorySummaries";
import { RecentActivityDoc } from "../contracts/activity";
import {
  GetLocationDetailSnapshotResult,
  LocationDetailInventoryItem,
  LocationSummaryListItem,
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

function parseLimit(value: unknown, fallback: number, max: number): number {
  if (value == null) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpsError("invalid-argument", "limit must be a valid number.");
  }

  const normalized = Math.floor(parsed);
  if (normalized <= 0) {
    throw new HttpsError("invalid-argument", "limit must be greater than 0.");
  }

  return Math.min(normalized, max);
}

function toLocationSummaryItem(
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

function toInventoryItem(
  id: string,
  doc: InventoryBalanceDoc
): LocationDetailInventoryItem {
  return {
    id,
    workspaceId: doc.workspaceId,
    locationId: doc.locationId,
    productId: doc.productId,
    sku: doc.sku,
    name: doc.name,
    primaryBarcode: doc.primaryBarcode ?? null,
    unit: doc.unit ?? null,
    onHand: doc.onHand,
    available: doc.available,
    isOutOfStock: doc.isOutOfStock,
    isLowStock: doc.isLowStock,
    stockStatus: doc.stockStatus,
    lastTransactionAtMs: doc.lastTransactionAt?.toMillis() ?? null,
    updatedAtMs: doc.updatedAt?.toMillis() ?? null,
  };
}

function toActivityItem(
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

export const getLocationDetailSnapshot = onCall(
  async (request): Promise<GetLocationDetailSnapshotResult> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );
    const locationId = parseRequiredString(request.data?.locationId, "locationId");
    const inventoryLimit = parseLimit(request.data?.inventoryLimit, 10, 50);
    const activityLimit = parseLimit(request.data?.activityLimit, 10, 50);

    await assertWorkspaceMembership(workspaceId, uid);

    const [summarySnap, balancesSnap, activitySnap] = await Promise.all([
      locationInventorySummaryCol(workspaceId).doc(locationId).get(),
      balancesCol(workspaceId)
        .where("locationId", "==", locationId)
        .orderBy("updatedAt", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(100)
        .get(),
      recentActivityCol(workspaceId)
        .where("locationId", "==", locationId)
        .orderBy("createdAt", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(activityLimit)
        .get(),
    ]);

    const summary = summarySnap.exists
      ? toLocationSummaryItem(
          summarySnap.id,
          summarySnap.data() as LocationInventorySummaryDoc
        )
      : null;

    const inventoryItems = balancesSnap.docs.map((doc) =>
      toInventoryItem(doc.id, doc.data() as InventoryBalanceDoc)
    );

    const lowStockItems = inventoryItems
      .filter((item) => item.stockStatus === "low")
      .sort((a, b) => a.onHand - b.onHand)
      .slice(0, inventoryLimit);

    const outOfStockItems = inventoryItems
      .filter((item) => item.stockStatus === "out")
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, inventoryLimit);

    const topItems = [...inventoryItems]
      .sort((a, b) => {
        if (b.onHand !== a.onHand) return b.onHand - a.onHand;
        return a.name.localeCompare(b.name);
      })
      .slice(0, inventoryLimit);

    const recentActivity = activitySnap.docs.map((doc) =>
      toActivityItem(doc.id, doc.data() as RecentActivityDoc)
    );

    return {
      summary,
      lowStockItems,
      outOfStockItems,
      topItems,
      recentActivity,
      generatedAtMs: Date.now(),
    };
  }
);