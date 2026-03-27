import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertWorkspaceMembership } from "../core/auth";
import { balancesCol } from "../core/firestore";

export const getMoveSuggestions = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const workspaceId = String(request.data?.workspaceId || "").trim();
  const productId = String(request.data?.productId || "").trim();

  if (!workspaceId || !productId) {
    throw new HttpsError(
      "invalid-argument",
      "workspaceId and productId are required."
    );
  }

  await assertWorkspaceMembership(workspaceId, uid);

  const balancesSnap = await balancesCol(workspaceId)
    .where("productId", "==", productId)
    .get();

  if (balancesSnap.empty) {
    return {
      sourceLocationId: null,
      targetLocationId: null,
      reason: "No inventory data available.",
    };
  }

const balances = balancesSnap.docs.map((d) => d.data());

// Source = highest available
const sourceCandidates = balances
  .filter((b) => (b.available ?? 0) > 0)
  .sort((a, b) => (b.available ?? 0) - (a.available ?? 0));

// Target = lowest available
const targetCandidates = [...balances].sort(
  (a, b) => (a.available ?? 0) - (b.available ?? 0)
);

// Pick source
const source = sourceCandidates[0] ?? null;

// Pick target (must be different from source)
let finalTarget = null;

if (source) {
  finalTarget =
    targetCandidates.find(
      (b) => b.locationId !== source.locationId
    ) ?? null;
} else {
  finalTarget = targetCandidates[0] ?? null;
}

return {
  sourceLocationId: source?.locationId ?? null,
  targetLocationId: finalTarget?.locationId ?? null,
  reason:
    source && finalTarget
      ? "Suggested based on highest stock → lowest stock."
      : "No strong move suggestion available.",
};
});