import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { productInventorySummaryCol } from "../core/firestore";
import { ProductInventorySummaryDoc } from "../contracts/inventorySummaries";
import {
  GetReplenishmentRecommendationsResult,
  ReplenishmentItem,
  ReplenishmentAction,
  ReplenishmentReasonCode,
  ReplenishmentUrgencyLabel,
} from "../contracts/dashboard";

function requireAuth(uid?: string): string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  return uid;
}

function parseRequiredString(v: unknown, f: string): string {
  const s = String(v ?? "").trim();
  if (!s) {
    throw new HttpsError("invalid-argument", `${f} required`);
  }
  return s;
}

function parseLimit(v: unknown): number {
  if (v == null) return 20;

  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpsError("invalid-argument", "invalid limit");
  }

  return Math.min(Math.floor(n), 100);
}

function buildReasonCodes(
  doc: ProductInventorySummaryDoc
): ReplenishmentReasonCode[] {
  const reasons: ReplenishmentReasonCode[] = [];

  if (doc.isOutOfStockEverywhere || doc.totalAvailable <= 0) {
    reasons.push("OUT_OF_STOCK_EVERYWHERE");
  } else if (doc.locationsOutOfStock > 0) {
    reasons.push("OUT_OF_STOCK_SOME_LOCATIONS");
  }

  if (doc.locationsLowStock > 1) {
    reasons.push("LOW_STOCK_MULTIPLE_LOCATIONS");
  } else if (doc.locationsLowStock > 0 || doc.isLowStockAnywhere) {
    reasons.push("LOW_STOCK_SOME_LOCATIONS");
  }

  if (doc.totalAvailable > 0 && doc.totalAvailable <= Math.max(1, doc.totalLocations)) {
    reasons.push("NETWORK_STOCK_LOW");
  }

  return reasons;
}

function buildUrgencyScore(doc: ProductInventorySummaryDoc): number {
  let score = 0;

  if (doc.stockStatus === "out") {
    score += 100;
  } else if (doc.stockStatus === "low") {
    score += 60;
  }

  score += doc.locationsOutOfStock * 20;
  score += doc.locationsLowStock * 10;

  if (doc.totalAvailable <= 0) {
    score += 40;
  } else if (doc.totalAvailable <= Math.max(1, doc.totalLocations)) {
    score += 20;
  }

  if (doc.isOutOfStockEverywhere) {
    score += 25;
  }

  return score;
}

function buildUrgencyLabel(score: number): ReplenishmentUrgencyLabel {
  if (score >= 120) return "critical";
  if (score >= 80) return "high";
  return "medium";
}

function buildRecommendedAction(
  doc: ProductInventorySummaryDoc
): ReplenishmentAction {
  if (doc.totalAvailable <= 0 || doc.isOutOfStockEverywhere) {
    return "receive";
  }

  if (doc.locationsOutOfStock > 0 && doc.locationsInStock > 0) {
    return "move";
  }

  if (doc.stockStatus === "low") {
    return "receive";
  }

  return "review";
}

function buildSuggestedQuantity(doc: ProductInventorySummaryDoc): number | null {
  if (doc.totalAvailable <= 0 || doc.isOutOfStockEverywhere) {
    return Math.max(1, doc.locationsOutOfStock * 2, doc.locationsLowStock);
  }

  if (doc.stockStatus === "low") {
    return Math.max(1, doc.locationsLowStock);
  }

  if (doc.locationsOutOfStock > 0 && doc.locationsInStock > 0) {
    return 1;
  }

  return null;
}

export const getReplenishmentRecommendations = onCall(
  async (request): Promise<GetReplenishmentRecommendationsResult> => {
    const uid = requireAuth(request.auth?.uid);

    const workspaceId = parseRequiredString(
      request.data?.workspaceId,
      "workspaceId"
    );
    const limit = parseLimit(request.data?.limit);

    await assertWorkspaceMembership(workspaceId, uid);

    const snap = await productInventorySummaryCol(workspaceId).get();

    const items: ReplenishmentItem[] = snap.docs
      .map((d) => {
        const doc = d.data() as ProductInventorySummaryDoc;
        const urgencyScore = buildUrgencyScore(doc);

        return {
          id: d.id,
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
          urgencyScore,
          urgencyLabel: buildUrgencyLabel(urgencyScore),
          recommendedAction: buildRecommendedAction(doc),
          suggestedQuantity: buildSuggestedQuantity(doc),
          reasonCodes: buildReasonCodes(doc),
        };
      })
      .filter((item) => item.urgencyScore > 0)
      .sort((a, b) => {
        if (b.urgencyScore !== a.urgencyScore) {
          return b.urgencyScore - a.urgencyScore;
        }

        if (a.recommendedAction !== b.recommendedAction) {
          const rank = { receive: 0, move: 1, review: 2 };
          return rank[a.recommendedAction] - rank[b.recommendedAction];
        }

        return a.totalOnHand - b.totalOnHand;
      })
      .slice(0, limit);

    return {
      items,
      generatedAtMs: Date.now(),
    };
  }
);