import { HttpsError } from "firebase-functions/v2/https";
import { locationsCol, Timestamp } from "../core/firestore";
import { CreateLocationInput, LocationDoc } from "../contracts/locations";

export class LocationRepo {
  async create(workspaceId: string, input: CreateLocationInput) {
    const now = Timestamp.now();
    const ref = locationsCol(workspaceId).doc();

    const doc: LocationDoc = {
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      type: input.type,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(doc);
    return { id: ref.id, ...doc };
  }

  async getById(workspaceId: string, locationId: string) {
    const snap = await locationsCol(workspaceId).doc(locationId).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Location not found.");
    }
    return { id: snap.id, ...(snap.data() as LocationDoc) };
  }

  async getByCode(workspaceId: string, code: string) {
    const normalized = code.trim().toUpperCase();
    const q = await locationsCol(workspaceId)
      .where("code", "==", normalized)
      .limit(1)
      .get();

    if (q.empty) return null;
    const doc = q.docs[0];
    return { id: doc.id, ...(doc.data() as LocationDoc) };
  }

  async assertActive(workspaceId: string, locationId: string) {
    const location = await this.getById(workspaceId, locationId);
    if (!location.isActive) {
      throw new HttpsError("failed-precondition", "Location is inactive.");
    }
    return location;
  }
}