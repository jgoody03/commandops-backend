import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { productInventorySummaryCol } from "../core/firestore";
import { ProductInventorySummaryDoc } from "../contracts/inventorySummaries";
import {
  GetReplenishmentRecommendationsResult,
    ReplenishmentItem,
    } from "../contracts/dashboard";

    function requireAuth(uid?: string): string {
      if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
        return uid;
        }

        function parseRequiredString(v: unknown, f: string): string {
          const s = String(v ?? "").trim();
            if (!s) throw new HttpsError("invalid-argument", `${f} required`);
              return s;
              }

              function parseLimit(v: unknown): number {
                if (v == null) return 20;
                  const n = Number(v);
                    if (!Number.isFinite(n) || n <= 0)
                        throw new HttpsError("invalid-argument", "invalid limit");
                          return Math.min(Math.floor(n), 100);
                          }

                          function urgency(doc: ProductInventorySummaryDoc): number {
                            if (doc.stockStatus === "out") return 1000;
                              if (doc.stockStatus === "low") return 500;
                                return 0;
                                }

                                export const getReplenishmentRecommendations = onCall(
                                  async (request): Promise<GetReplenishmentRecommendationsResult> => {
                                      const uid = requireAuth(request.auth?.uid);

                                          const workspaceId = parseRequiredString(request.data?.workspaceId, "workspaceId");
                                              const limit = parseLimit(request.data?.limit);

                                                  await assertWorkspaceMembership(workspaceId, uid);

                                                      const snap = await productInventorySummaryCol(workspaceId).get();

                                                          const items: ReplenishmentItem[] = snap.docs
                                                                .map((d) => {
                                                                        const doc = d.data() as ProductInventorySummaryDoc;

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
                                                                                                                                                                                                                                                                              urgencyScore: urgency(doc),
                                                                                                                                                                                                                                                                                      };
                                                                                                                                                                                                                                                                                            })
                                                                                                                                                                                                                                                                                                  .filter((item) => item.urgencyScore > 0)
                                                                                                                                                                                                                                                                                                        .sort((a, b) => {
                                                                                                                                                                                                                                                                                                                if (b.urgencyScore !== a.urgencyScore)
                                                                                                                                                                                                                                                                                                                          return b.urgencyScore - a.urgencyScore;
                                                                                                                                                                                                                                                                                                                                  return a.totalOnHand - b.totalOnHand;
                                                                                                                                                                                                                                                                                                                                        })
                                                                                                                                                                                                                                                                                                                                              .slice(0, limit);

                                                                                                                                                                                                                                                                                                                                                  return {
                                                                                                                                                                                                                                                                                                                                                        items,
                                                                                                                                                                                                                                                                                                                                                              generatedAtMs: Date.now(),
                                                                                                                                                                                                                                                                                                                                                                  };
                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                    );