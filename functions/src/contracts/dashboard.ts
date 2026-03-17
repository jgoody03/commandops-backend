export type DashboardStockStatus = "ok" | "low" | "out";

export type SummaryListCursor = {
  updatedAtMs: number;
  docId: string;
};

export type ActivityFeedCursor = {
  createdAtMs: number;
  docId: string;
};

export type GetProductSummaryListPayload = {
  workspaceId: string;
  limit?: number;
  cursor?: SummaryListCursor | null;
  query?: string;
  stockStatus?: DashboardStockStatus;
};

export type ProductSummaryListItem = {
  id: string;
  workspaceId: string;
  productId: string;
  sku: string;
  name: string;
  primaryBarcode?: string | null;
  unit?: string | null;
  totalOnHand: number;
  totalAvailable: number;
  totalLocations: number;
  locationsInStock: number;
  locationsOutOfStock: number;
  locationsLowStock: number;
  isOutOfStockEverywhere: boolean;
  isLowStockAnywhere: boolean;
  stockStatus: DashboardStockStatus;
  lastTransactionAtMs: number | null;
  updatedAtMs: number | null;
};

export type GetProductSummaryListResult = {
  items: ProductSummaryListItem[];
  nextCursor: SummaryListCursor | null;
};

export type GetLocationSummaryListPayload = {
  workspaceId: string;
  limit?: number;
  cursor?: SummaryListCursor | null;
  query?: string;
};

export type LocationSummaryListItem = {
  id: string;
  workspaceId: string;
  locationId: string;
  locationName: string;
  locationCode?: string | null;
  totalSkus: number;
  totalUnits: number;
  totalAvailableUnits: number;
  lowStockSkuCount: number;
  outOfStockSkuCount: number;
  inStockSkuCount: number;
  lastTransactionAtMs: number | null;
  updatedAtMs: number | null;
};

export type GetLocationSummaryListResult = {
  items: LocationSummaryListItem[];
  nextCursor: SummaryListCursor | null;
};

export type ActivityFeedType =
  | "receive"
  | "move"
  | "adjust"
  | "scan"
  | "quick_create"
  | "sale";

export type GetRecentActivityFeedPayload = {
  workspaceId: string;
  limit?: number;
  cursor?: ActivityFeedCursor | null;
  type?: ActivityFeedType;
  locationId?: string;
  productId?: string;
};

export type RecentActivityFeedItem = {
  id: string;
  workspaceId: string;
  type: ActivityFeedType;
  productId?: string | null;
  locationId?: string | null;
  title: string;
  subtitle?: string | null;
  actorUserId?: string | null;
  createdAtMs: number | null;
};

export type GetRecentActivityFeedResult = {
  items: RecentActivityFeedItem[];
  nextCursor: ActivityFeedCursor | null;
};

export type GetTodaySnapshotPayload = {
  workspaceId: string;
};

export type GetTodaySnapshotResult = {
  totals: {
    totalProducts: number;
    totalLocations: number;
    totalUnits: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  activity: {
    receiveCount: number;
    moveCount: number;
    adjustCount: number;
    scanCount: number;
    quickCreateCount: number;
    saleCount: number;
    totalCount: number;
  };
  recentActivity: RecentActivityFeedItem[];
  generatedAtMs: number;
};