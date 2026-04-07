import { Timestamp } from "firebase-admin/firestore";

export interface VendorDoc {
  workspaceId: string;
  name: string;
  nameLower: string;
  lastReceivedAt?: Timestamp | null;
  receiveCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ListVendorsInput {
  workspaceId: string;
  limit?: number;
}

export interface VendorListItem {
  vendorId: string;
  name: string;
  lastReceivedAtMs?: number | null;
  receiveCount?: number;
}

export interface ListVendorsOutput {
  items: VendorListItem[];
}

export interface GetVendorReceiveHistoryInput {
  workspaceId: string;
  vendorName: string;
  limit?: number;
}

export interface VendorReceiveHistoryItem {
  transactionId: string;
  locationId?: string | null;
  locationName?: string | null;
  referenceNumber?: string | null;
  note?: string | null;
  lineCount?: number;
  postedAtMs: number;
}

export interface GetVendorReceiveHistoryOutput {
  vendorName: string;
  items: VendorReceiveHistoryItem[];
}