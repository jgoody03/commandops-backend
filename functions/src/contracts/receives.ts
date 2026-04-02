export interface GetReceiveHistoryInput {
  workspaceId: string;
  limit?: number;
}

export interface ReceiveHistoryItem {
  transactionId: string;
  vendorName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  lineCount?: number;
  postedAtMs: number;
}

export interface GetReceiveHistoryOutput {
  items: ReceiveHistoryItem[];
}
export interface GetReceiveDetailInput {
  workspaceId: string;
  transactionId: string;
}

export interface ReceiveDetailLineItem {
  lineId: string;
  productId: string;
  sku: string;
  quantity: number;
  unitCost?: number | null;
  barcode?: string | null;
  note?: string | null;
}

export interface GetReceiveDetailOutput {
  transactionId: string;
  vendorName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  lineCount?: number;
  postedAtMs: number;
  lines: ReceiveDetailLineItem[];
}