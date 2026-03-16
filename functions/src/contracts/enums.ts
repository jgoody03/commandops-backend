export type WorkspaceRole = "owner" | "admin" | "member";

export type LocationType =
  | "stockroom"
  | "truck"
  | "van"
  | "retail"
  | "warehouse"
  | "other";

export type ProductUnit = "each" | "box" | "case" | "pack" | "roll" | "set";

export type InventoryTransactionType =
  | "receive"
  | "adjust"
  | "move"
  | "sale"
  | "audit";

export type ReferenceType = "scan" | "manual" | "import" | "api";

export type ScanResolutionStatus = "resolved" | "unresolved";