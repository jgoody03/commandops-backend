import {
  locationInventorySummaryCol,
} from "../core/firestore";
import { LocationInventorySummaryDoc } from "../contracts/inventorySummaries";

export class LocationInventorySummaryRepo {
  getRef(workspaceId: string, locationId: string) {
    return locationInventorySummaryCol(workspaceId).doc(locationId);
  }

  async get(workspaceId: string, locationId: string) {
    const ref = this.getRef(workspaceId, locationId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as LocationInventorySummaryDoc) };
  }

  async set(
    workspaceId: string,
    locationId: string,
    doc: LocationInventorySummaryDoc
  ) {
    await this.getRef(workspaceId, locationId).set(doc, { merge: true });
  }
}