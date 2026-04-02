import { vendorsCol, Timestamp } from "../core/firestore";
import type { VendorDoc } from "../contracts/vendors";

function normalizeVendorName(name: string) {
  return name.trim().toLowerCase();
}

export class VendorRepo {
  async getByName(workspaceId: string, name: string) {
    const nameLower = normalizeVendorName(name);
    if (!nameLower) return null;

    const snap = await vendorsCol(workspaceId)
      .where("nameLower", "==", nameLower)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    return {
      id: doc.id,
      ...(doc.data() as VendorDoc),
    };
  }

  async upsertFromReceive(
    workspaceId: string,
    name: string,
    receivedAt: FirebaseFirestore.Timestamp
  ) {
    const trimmedName = name.trim();
    const nameLower = normalizeVendorName(trimmedName);

    if (!trimmedName) return null;

    const existing = await this.getByName(workspaceId, trimmedName);
    const now = Timestamp.now();

    if (existing) {
      const ref = vendorsCol(workspaceId).doc(existing.id);

      await ref.set(
        {
          name: trimmedName,
          nameLower,
          lastReceivedAt: receivedAt,
          receiveCount: (existing.receiveCount ?? 0) + 1,
          updatedAt: now,
        },
        { merge: true }
      );

      return existing.id;
    }

    const ref = vendorsCol(workspaceId).doc();

    await ref.set({
      workspaceId,
      name: trimmedName,
      nameLower,
      lastReceivedAt: receivedAt,
      receiveCount: 1,
      createdAt: now,
      updatedAt: now,
    } satisfies VendorDoc);

    return ref.id;
  }

  async list(workspaceId: string, limitCount = 20) {
    const snap = await vendorsCol(workspaceId)
      .orderBy("lastReceivedAt", "desc")
      .limit(limitCount)
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data() as VendorDoc;

      return {
        vendorId: doc.id,
        name: data.name,
        lastReceivedAtMs: data.lastReceivedAt
          ? data.lastReceivedAt.toMillis()
          : null,
        receiveCount: data.receiveCount ?? 0,
      };
    });
  }
}