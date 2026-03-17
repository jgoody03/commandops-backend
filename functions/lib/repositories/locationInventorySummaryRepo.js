"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationInventorySummaryRepo = void 0;
const firestore_1 = require("../core/firestore");
class LocationInventorySummaryRepo {
    getRef(workspaceId, locationId) {
        return (0, firestore_1.locationInventorySummaryCol)(workspaceId).doc(locationId);
    }
    async get(workspaceId, locationId) {
        const ref = this.getRef(workspaceId, locationId);
        const snap = await ref.get();
        if (!snap.exists)
            return null;
        return Object.assign({ id: snap.id }, snap.data());
    }
    async set(workspaceId, locationId, doc) {
        await this.getRef(workspaceId, locationId).set(doc, { merge: true });
    }
}
exports.LocationInventorySummaryRepo = LocationInventorySummaryRepo;
//# sourceMappingURL=locationInventorySummaryRepo.js.map