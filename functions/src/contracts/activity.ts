import { Timestamp } from "firebase-admin/firestore";

export type RecentActivityType =
  | "receive"
  | "move"
  | "adjust"
  | "scan"
  | "quick_create"
  | "sale";

export interface RecentActivityDoc {
  workspaceId: string;
  type: RecentActivityType;

  productId?: string | null;
  locationId?: string | null;

  title: string;
  subtitle?: string | null;

  actorUserId?: string | null;
  createdAt: Timestamp;
}