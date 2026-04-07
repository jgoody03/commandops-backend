import { Timestamp } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import {
  locationInventorySummaryCol,
  productInventorySummaryCol,
  recentActivityCol,
  transactionsCol,
} from "../core/firestore";
import { ProductInventorySummaryDoc } from "../contracts/inventorySummaries";
import { RecentActivityDoc } from "../contracts/activity";
import {
  GetTodaySnapshotResult,
  RecentActivityFeedItem,
} from "../contracts/dashboard";
import { InventoryTransactionLineDoc } from "../contracts/inventory";

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

function startOfTodayUtc(): Timestamp {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  return Timestamp.fromDate(start);
}

function startOfTomorrowUtc(): Timestamp {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  return Timestamp.fromDate(start);
}

function toRecentActivityItem(
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

export const getTodaySnapshot = onCall(
  async (request): Promise<GetTodaySnapshotResult> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );

    await assertWorkspaceMembership(workspaceId, uid);

    const todayStart = startOfTodayUtc();
    const tomorrowStart = startOfTomorrowUtc();

    const [
      productSummarySnap,
      locationSummarySnap,
      todayActivitySnap,
      recentSnap,
      todaySalesSnap,
    ] = await Promise.all([
      productInventorySummaryCol(workspaceId).get(),
      locationInventorySummaryCol(workspaceId).get(),
      recentActivityCol(workspaceId)
        .where("createdAt", ">=", todayStart)
        .get(),
      recentActivityCol(workspaceId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get(),
      transactionsCol(workspaceId)
        .where("type", "==", "sale")
        .where("postedAt", ">=", todayStart)
        .where("postedAt", "<", tomorrowStart)
        .get(),
    ]);

    let totalUnits = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;

    for (const doc of productSummarySnap.docs) {
      const item = doc.data() as ProductInventorySummaryDoc;
      totalUnits += item.totalOnHand ?? 0;
      if (item.stockStatus === "low") lowStockProducts += 1;
      if (item.stockStatus === "out") outOfStockProducts += 1;
    }

    let receiveCount = 0;
    let moveCount = 0;
    let adjustCount = 0;
    let scanCount = 0;
    let quickCreateCount = 0;
    let saleCount = 0;

    for (const doc of todayActivitySnap.docs) {
      const item = doc.data() as RecentActivityDoc;

      switch (item.type) {
        case "receive":
          receiveCount += 1;
          break;
        case "move":
          moveCount += 1;
          break;
        case "adjust":
          adjustCount += 1;
          break;
        case "scan":
          scanCount += 1;
          break;
        case "quick_create":
          quickCreateCount += 1;
          break;
        case "sale":
          saleCount += 1;
          break;
      }
    }

    let salesTodayCount = todaySalesSnap.size;
    let unitsSoldToday = 0;
    let salesTodayRevenue = 0;

    for (const saleDoc of todaySalesSnap.docs) {
      const linesSnap = await saleDoc.ref.collection("lines").get();

      for (const lineDoc of linesSnap.docs) {
        const line = lineDoc.data() as InventoryTransactionLineDoc;
        const quantity = Number(line.quantity ?? 0);
        const unitPrice = Number(line.unitPrice ?? 0);

        unitsSoldToday += quantity;
        salesTodayRevenue += quantity * unitPrice;
      }
    }

    const recentActivity: RecentActivityFeedItem[] = recentSnap.docs.map((doc) =>
      toRecentActivityItem(doc.id, doc.data() as RecentActivityDoc)
    );

    return {
      totals: {
        totalProducts: productSummarySnap.size,
        totalLocations: locationSummarySnap.size,
        totalUnits,
        lowStockProducts,
        outOfStockProducts,
      },
      activity: {
        receiveCount,
        moveCount,
        adjustCount,
        scanCount,
        quickCreateCount,
        saleCount,
        totalCount: todayActivitySnap.size,
      },
      sales: {
        salesTodayCount,
        unitsSoldToday,
        salesTodayRevenue,
      },
      recentActivity,
      generatedAtMs: Date.now(),
    };
  }
);