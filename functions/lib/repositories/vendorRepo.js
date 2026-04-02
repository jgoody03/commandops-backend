"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorRepo = void 0;
const firestore_1 = require("../core/firestore");
function normalizeVendorName(name) {
    return name.trim().toLowerCase();
}
class VendorRepo {
    async getByName(workspaceId, name) {
        const nameLower = normalizeVendorName(name);
        if (!nameLower)
            return null;
        const snap = await (0, firestore_1.vendorsCol)(workspaceId)
            .where("nameLower", "==", nameLower)
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        const doc = snap.docs[0];
        return Object.assign({ id: doc.id }, doc.data());
    }
    async upsertFromReceive(workspaceId, name, receivedAt) {
        var _a;
        const trimmedName = name.trim();
        const nameLower = normalizeVendorName(trimmedName);
        if (!trimmedName)
            return null;
        const existing = await this.getByName(workspaceId, trimmedName);
        const now = firestore_1.Timestamp.now();
        if (existing) {
            const ref = (0, firestore_1.vendorsCol)(workspaceId).doc(existing.id);
            await ref.set({
                name: trimmedName,
                nameLower,
                lastReceivedAt: receivedAt,
                receiveCount: ((_a = existing.receiveCount) !== null && _a !== void 0 ? _a : 0) + 1,
                updatedAt: now,
            }, { merge: true });
            return existing.id;
        }
        const ref = (0, firestore_1.vendorsCol)(workspaceId).doc();
        await ref.set({
            workspaceId,
            name: trimmedName,
            nameLower,
            lastReceivedAt: receivedAt,
            receiveCount: 1,
            createdAt: now,
            updatedAt: now,
        });
        return ref.id;
    }
    async list(workspaceId, limitCount = 20) {
        const snap = await (0, firestore_1.vendorsCol)(workspaceId)
            .orderBy("lastReceivedAt", "desc")
            .limit(limitCount)
            .get();
        return snap.docs.map((doc) => {
            var _a;
            const data = doc.data();
            return {
                vendorId: doc.id,
                name: data.name,
                lastReceivedAtMs: data.lastReceivedAt
                    ? data.lastReceivedAt.toMillis()
                    : null,
                receiveCount: (_a = data.receiveCount) !== null && _a !== void 0 ? _a : 0,
            };
        });
    }
}
exports.VendorRepo = VendorRepo;
//# sourceMappingURL=vendorRepo.js.map