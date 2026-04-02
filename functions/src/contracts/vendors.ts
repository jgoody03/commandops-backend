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