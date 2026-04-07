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

export type GetLowStockProductsPayload = {
  workspaceId: string;
  limit?: number;
  cursor?: SummaryListCursor | null;
  query?: string;
  outOnly?: boolean;
};

export type GetLowStockProductsResult = {
  items: ProductSummaryListItem[];
  nextCursor: SummaryListCursor | null;
};

export type LocationDetailInventoryItem = {
  id: string;
  workspaceId: string;
  locationId: string;
  productId: string;
  sku: string;
  name: string;
  primaryBarcode?: string | null;
  unit?: string | null;
  onHand: number;
  available: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  stockStatus: "ok" | "low" | "out";
  lastTransactionAtMs: number | null;
  updatedAtMs: number | null;
};

export type GetLocationDetailSnapshotPayload = {
  workspaceId: string;
  locationId: string;
  inventoryLimit?: number;
  activityLimit?: number;
};

export type GetLocationDetailSnapshotResult = {
  summary: LocationSummaryListItem | null;
  lowStockItems: LocationDetailInventoryItem[];
  outOfStockItems: LocationDetailInventoryItem[];
  topItems: LocationDetailInventoryItem[];
  recentActivity: RecentActivityFeedItem[];
  generatedAtMs: number;
};

export type IngestPosSaleLine = {
  productId: string;
  quantity: number;
  barcode?: string;
  note?: string;
};

export type IngestPosSalePayload = {
  workspaceId: string;
  locationId: string;
  saleId?: string;
  orderNumber?: string;
  note?: string;
  lines: IngestPosSaleLine[];
};

export type IngestPosSaleResult = {
  ok: boolean;
  transactionId: string;
  postedAt: string;
  lineCount: number;
  locationId: string;
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
  sales: {
    salesTodayCount: number;
    unitsSoldToday: number;
    salesTodayRevenue: number;
  };
  recentActivity: RecentActivityFeedItem[];
  generatedAtMs: number;
};

export type ProductLocationInventoryItem = {
  locationId: string;
  locationName: string;
  locationCode?: string | null;
  onHand: number;
  available: number;
  stockStatus: "ok" | "low" | "out";
  lastTransactionAtMs: number | null;
};

export type GetProductDetailSnapshotPayload = {
  workspaceId: string;
  productId: string;
  activityLimit?: number;
};

export type GetProductDetailSnapshotResult = {
  summary: ProductSummaryListItem | null;
  locations: ProductLocationInventoryItem[];
  recentActivity: RecentActivityFeedItem[];
  generatedAtMs: number;
};


export type GetReplenishmentRecommendationsPayload = {
  workspaceId: string;
  limit?: number;
};

export type GetReplenishmentRecommendationsResult = {
  items: ReplenishmentItem[];
  generatedAtMs: number;
};

export type LocationOptionItem = {
  locationId: string;
  locationName: string;
  locationCode: string | null;
  isDefault: boolean;
};

export type GetLocationOptionsResult = {
  items: LocationOptionItem[];
};

export type ReplenishmentReasonCode =
  | "OUT_OF_STOCK_EVERYWHERE"
  | "LOW_STOCK_MULTIPLE_LOCATIONS"
  | "OUT_OF_STOCK_SOME_LOCATIONS"
  | "LOW_STOCK_SOME_LOCATIONS"
  | "NETWORK_STOCK_LOW";

export type ReplenishmentAction = "receive" | "move" | "review";

export type ReplenishmentUrgencyLabel = "critical" | "high" | "medium";

export type ReplenishmentItem = {
  id: string;
  workspaceId: string;
  productId: string;
  sku: string;
  name: string;
  primaryBarcode: string | null;
  unit: string | null;
  totalOnHand: number;
  totalAvailable: number;
  totalLocations: number;
  locationsInStock: number;
  locationsOutOfStock: number;
  locationsLowStock: number;
  isOutOfStockEverywhere: boolean;
  isLowStockAnywhere: boolean;
  stockStatus: "ok" | "low" | "out";
  lastTransactionAtMs: number | null;
  updatedAtMs: number | null;
  urgencyScore: number;
  urgencyLabel: ReplenishmentUrgencyLabel;
  recommendedAction: ReplenishmentAction;
  suggestedQuantity: number | null;
  reasonCodes: ReplenishmentReasonCode[];
};