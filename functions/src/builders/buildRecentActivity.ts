import { Timestamp } from "firebase-admin/firestore";
import { RecentActivityDoc, RecentActivityType } from "../contracts/activity";

export function buildRecentActivity(params: {
  workspaceId: string;
  type: RecentActivityType;
  title: string;
  subtitle?: string | null;
  productId?: string | null;
  locationId?: string | null;
  actorUserId?: string | null;
  createdAt?: Timestamp;
}): RecentActivityDoc {
  return {
    workspaceId: params.workspaceId,
    type: params.type,
    title: params.title,
    subtitle: params.subtitle ?? null,
    productId: params.productId ?? null,
    locationId: params.locationId ?? null,
    actorUserId: params.actorUserId ?? null,
    createdAt: params.createdAt ?? Timestamp.now(),
  };
}