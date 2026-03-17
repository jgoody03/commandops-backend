import { Timestamp } from "firebase-admin/firestore";
import { LocationInventorySummaryDoc } from "../contracts/inventorySummaries";
import { InventoryBalanceDoc } from "../contracts/inventory";

type LocationLike = {
  id: string;
  name: string;
  code?: string | null;
};

export function buildLocationInventorySummary(params: {
  workspaceId: string;
  location: LocationLike;
  balances: InventoryBalanceDoc[];
}): LocationInventorySummaryDoc {
  const { workspaceId, location, balances } = params;

  const totalSkus = balances.length;
  const totalUnits = balances.reduce((sum, item) => sum + item.onHand, 0);
  const totalAvailableUnits = balances.reduce(
    (sum, item) => sum + item.available,
    0
  );

  const lowStockSkuCount = balances.filter(
    (item) => item.stockStatus === "low"
  ).length;

  const outOfStockSkuCount = balances.filter(
    (item) => item.stockStatus === "out"
  ).length;

  const inStockSkuCount = balances.filter((item) => item.onHand > 0).length;

  const lastTransactionAt = balances
    .map((item) => item.lastTransactionAt ?? null)
    .filter((item): item is Timestamp => item != null)
    .sort((a, b) => b.toMillis() - a.toMillis())[0] ?? null;

  return {
    workspaceId,
    locationId: location.id,
    locationName: location.name,
    locationCode: location.code ?? null,

    totalSkus,
    totalUnits,
    totalAvailableUnits,

    lowStockSkuCount,
    outOfStockSkuCount,
    inStockSkuCount,

    lastTransactionAt,
    updatedAt: Timestamp.now(),
  };
}